#!/usr/bin/env python3
"""Safely update image tags in a Kustomization file.

This script intentionally edits only existing entries in the top-level ``images``
list. It preserves the rest of the file, writes atomically, and validates the
rendered overlay before leaving the change on disk.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import AbstractSet, Callable, List, Optional, Sequence, Tuple


OCI_TAG_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$")
IMAGES_HEADER_RE = re.compile(r"^images:[ \t]*(?:#.*)?(?:\r?\n)?$")
TOP_LEVEL_KEY_RE = re.compile(r"^[A-Za-z0-9_.-]+:[ \t]*(?:.*)?(?:\r?\n)?$")
IMAGE_NAME_RE = re.compile(
    r"^(?P<indent> *)-[ \t]+name:[ \t]*(?P<value>.*?)(?:\r?\n)?$"
)
NEW_TAG_RE = re.compile(
    r"^(?P<indent> +)newTag:[ \t]*(?P<value>.*?)(?:\r?\n)?$"
)
LIST_ITEM_RE = re.compile(r"^(?P<indent> *)-[ \t]+")


class UpdateError(RuntimeError):
    """Raised when an image update cannot be performed safely."""


@dataclass(frozen=True)
class ImageEntry:
    name: str
    item_line: int
    item_indent: str
    new_tag_line: int
    new_tag_indent: str
    current_tag: str


Validator = Callable[[Path], None]


def _decode_yaml_scalar(raw_value: str, context: str) -> str:
    """Decode the small YAML scalar subset used by Kustomize image entries."""

    value = raw_value.strip()
    if not value:
        raise UpdateError(f"Missing scalar value for {context}")

    if value.startswith('"'):
        try:
            decoded, end = json.JSONDecoder().raw_decode(value)
        except (json.JSONDecodeError, TypeError) as error:
            raise UpdateError(f"Invalid quoted scalar for {context}: {value}") from error

        remainder = value[end:].strip()
        if remainder and not remainder.startswith("#"):
            raise UpdateError(f"Unexpected content after {context}: {remainder}")
        if not isinstance(decoded, str):
            raise UpdateError(f"Expected a string for {context}")
        return decoded

    if value.startswith("'"):
        index = 1
        decoded_parts: List[str] = []
        while index < len(value):
            if value[index] != "'":
                decoded_parts.append(value[index])
                index += 1
                continue
            if index + 1 < len(value) and value[index + 1] == "'":
                decoded_parts.append("'")
                index += 2
                continue

            remainder = value[index + 1 :].strip()
            if remainder and not remainder.startswith("#"):
                raise UpdateError(f"Unexpected content after {context}: {remainder}")
            return "".join(decoded_parts)

        raise UpdateError(f"Unterminated quoted scalar for {context}: {value}")

    # A comment on a plain scalar begins only after whitespace.
    return re.split(r"[ \t]+#", value, maxsplit=1)[0].rstrip()


def _line_ending(line: str) -> str:
    if line.endswith("\r\n"):
        return "\r\n"
    if line.endswith("\n"):
        return "\n"
    return ""


def _images_section(lines: Sequence[str]) -> Tuple[int, int]:
    headers = [index for index, line in enumerate(lines) if IMAGES_HEADER_RE.match(line)]
    if len(headers) != 1:
        raise UpdateError(
            "Expected exactly one top-level images block in kustomization.yaml; "
            f"found {len(headers)}"
        )

    start = headers[0] + 1
    end = len(lines)
    for index in range(start, len(lines)):
        line = lines[index]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if TOP_LEVEL_KEY_RE.match(line):
            end = index
            break

    return start, end


def _parse_entries(
    lines: Sequence[str],
    repairable_sibling_tags: AbstractSet[str] = frozenset(),
) -> List[ImageEntry]:
    section_start, section_end = _images_section(lines)
    item_lines: List[int] = []

    for index in range(section_start, section_end):
        if IMAGE_NAME_RE.match(lines[index]):
            item_lines.append(index)

    entries: List[ImageEntry] = []
    for position, item_line in enumerate(item_lines):
        name_match = IMAGE_NAME_RE.match(lines[item_line])
        if name_match is None:  # Defensive: item_lines contains only matching lines.
            raise AssertionError("Image entry parser lost its match")

        item_indent = name_match.group("indent")
        name = _decode_yaml_scalar(
            name_match.group("value"), f"image name on line {item_line + 1}"
        )

        entry_end = section_end
        for index in range(item_line + 1, section_end):
            list_match = LIST_ITEM_RE.match(lines[index])
            if list_match and len(list_match.group("indent")) <= len(item_indent):
                entry_end = index
                break

        tag_matches: List[Tuple[int, re.Match[str]]] = []
        for index in range(item_line + 1, entry_end):
            tag_match = NEW_TAG_RE.match(lines[index])
            if tag_match:
                tag_matches.append((index, tag_match))

        if len(tag_matches) != 1:
            raise UpdateError(
                f"Image {name!r} must contain exactly one newTag field; "
                f"found {len(tag_matches)}"
            )

        new_tag_line, tag_match = tag_matches[0]
        new_tag_indent = tag_match.group("indent")
        if len(new_tag_indent) <= len(item_indent):
            is_repairable_legacy_indent = (
                name in repairable_sibling_tags
                and bool(item_indent)
                and new_tag_indent == item_indent
            )
            if not is_repairable_legacy_indent:
                raise UpdateError(
                    f"newTag for image {name!r} on line {new_tag_line + 1} "
                    "must be indented beneath its list item"
                )

        entries.append(
            ImageEntry(
                name=name,
                item_line=item_line,
                item_indent=item_indent,
                new_tag_line=new_tag_line,
                new_tag_indent=new_tag_indent,
                current_tag=_decode_yaml_scalar(
                    tag_match.group("value"),
                    f"newTag for image {name!r} on line {new_tag_line + 1}",
                ),
            )
        )

    return entries


def update_text(content: str, images: Sequence[str], tag: str) -> str:
    """Return Kustomization content with the requested image tags updated."""

    if not OCI_TAG_RE.fullmatch(tag):
        raise UpdateError(
            f"Invalid OCI image tag {tag!r}; expected 1-128 letters, digits, '.', '_' or '-'"
        )
    if not images:
        raise UpdateError("At least one --image is required")
    if len(set(images)) != len(images):
        raise UpdateError("Duplicate --image arguments are not allowed")

    lines = content.splitlines(keepends=True)
    # A previous Jenkins updater could emit `newTag` at the same indentation as
    # an indented target list item. Permit only that exact, known legacy shape
    # for explicitly requested images; canonical replacement below repairs it.
    entries = _parse_entries(lines, repairable_sibling_tags=set(images))
    entries_by_name = {}
    for entry in entries:
        entries_by_name.setdefault(entry.name, []).append(entry)

    selected: List[ImageEntry] = []
    for image in images:
        matches = entries_by_name.get(image, [])
        if len(matches) != 1:
            raise UpdateError(
                f"Expected exactly one image entry for {image!r}; found {len(matches)}"
            )
        selected.append(matches[0])

    # Replace from the parsed line positions. Canonical indentation is derived from
    # the list item, so an updater can never emit a sibling-level newTag field.
    for entry in selected:
        newline = _line_ending(lines[entry.new_tag_line])
        lines[entry.new_tag_line] = (
            f'{entry.item_indent}  newTag: "{tag}"{newline}'
        )

    updated = "".join(lines)

    # Reparse our own output and assert every requested value before writing it.
    verified = {entry.name: entry for entry in _parse_entries(updated.splitlines(keepends=True))}
    for image in images:
        if image not in verified or verified[image].current_tag != tag:
            raise UpdateError(f"Post-update verification failed for image {image!r}")

    return updated


def _atomic_write(path: Path, content: bytes, mode: int) -> None:
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent)
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary_path, stat.S_IMODE(mode))
        os.replace(temporary_path, path)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def update_file(
    path: Path,
    images: Sequence[str],
    tag: str,
    validator: Optional[Validator],
) -> bool:
    """Update a file transactionally and return whether its contents changed."""

    path = path.resolve()
    if not path.is_file():
        raise UpdateError(f"Kustomization file does not exist: {path}")

    original = path.read_bytes()
    try:
        content = original.decode("utf-8")
    except UnicodeDecodeError as error:
        raise UpdateError(f"Kustomization file is not UTF-8: {path}") from error

    updated = update_text(content, images, tag).encode("utf-8")
    changed = updated != original
    mode = path.stat().st_mode

    if changed:
        _atomic_write(path, updated, mode)

    try:
        if validator is not None:
            validator(path.parent)
    except Exception:
        if changed:
            _atomic_write(path, original, mode)
        raise

    return changed


def find_render_validator() -> Tuple[str, Validator]:
    """Find a Kustomize renderer and return its display name and callable."""

    if shutil.which("kustomize"):
        name = "kustomize build"
        command = ["kustomize", "build", "."]
    elif shutil.which("kubectl"):
        name = "kubectl kustomize"
        command = ["kubectl", "kustomize", "."]
    else:
        raise UpdateError(
            "Render validation is required, but neither kustomize nor kubectl is installed"
        )

    def validate(directory: Path) -> None:
        result = subprocess.run(
            command,
            cwd=str(directory),
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            details = (result.stderr or result.stdout).strip()
            raise UpdateError(f"{name} failed:\n{details}")

    return name, validate


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", required=True, type=Path, help="Path to kustomization.yaml")
    parser.add_argument("--tag", required=True, help="OCI tag to assign to every image")
    parser.add_argument(
        "--image",
        action="append",
        required=True,
        dest="images",
        help="Exact Kustomize image name; repeat for every image",
    )
    parser.add_argument(
        "--defer-render-validation",
        action="store_true",
        help=(
            "Defer rendering only when the caller immediately runs an external "
            "fail-closed Kustomize validator"
        ),
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        validator_name: Optional[str] = None
        validator: Optional[Validator] = None
        if not args.defer_render_validation:
            validator_name, validator = find_render_validator()

        changed = update_file(args.file, args.images, args.tag, validator)
        action = "Updated" if changed else "Already up to date:"
        print(f"{action} {len(args.images)} image tag(s) in {args.file}")
        if validator_name:
            print(f"Validated overlay with {validator_name}")
        return 0
    except UpdateError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
