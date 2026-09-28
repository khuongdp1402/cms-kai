import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIRECTORY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPT_DIRECTORY))

from update_kustomize_images import UpdateError, update_file, update_text  # noqa: E402


CHATWOOT = "192.168.80.118:80/dental_project/dsf-chatwoot"
PERSONAL = "192.168.80.118:80/dental_project/dsf-zalo-personal-bridge"
OA = "192.168.80.118:80/dental_project/dsf-zalo-oa-web-bridge"


class UpdateTextTest(unittest.TestCase):
    def test_updates_indented_image_list_and_quotes_numeric_sha(self):
        source = f"""apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
images:
  - name: unrelated/image
    newTag: "keep-me"
  - name: {CHATWOOT}
    newTag: old
  - name: {PERSONAL}
    newTag: old
  - name: {OA}
    newTag: old
"""

        updated = update_text(source, [CHATWOOT, PERSONAL, OA], "3996262")

        self.assertIn('  - name: unrelated/image\n    newTag: "keep-me"', updated)
        self.assertEqual(updated.count('    newTag: "3996262"'), 3)

    def test_updates_unindented_image_list(self):
        source = f"""apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
images:
- name: {CHATWOOT}
  newTag: production
- name: {PERSONAL}
  newTag: production
"""

        updated = update_text(source, [CHATWOOT, PERSONAL], "abc1234")

        self.assertIn(f'- name: {CHATWOOT}\n  newTag: "abc1234"', updated)
        self.assertIn(f'- name: {PERSONAL}\n  newTag: "abc1234"', updated)

    def test_rejects_missing_image_without_appending_it(self):
        source = f"""kind: Kustomization
images:
- name: {CHATWOOT}
  newTag: old
"""

        with self.assertRaisesRegex(UpdateError, "found 0"):
            update_text(source, [PERSONAL], "abc1234")

    def test_rejects_duplicate_image_entries(self):
        source = f"""kind: Kustomization
images:
- name: {CHATWOOT}
  newTag: old
- name: {CHATWOOT}
  newTag: old
"""

        with self.assertRaisesRegex(UpdateError, "found 2"):
            update_text(source, [CHATWOOT], "abc1234")

    def test_repairs_legacy_new_tag_at_the_list_item_indentation(self):
        source = f"""kind: Kustomization
images:
  - name: {CHATWOOT}
  newTag: old
"""

        updated = update_text(source, [CHATWOOT], "abc1234")

        self.assertIn(f'  - name: {CHATWOOT}\n    newTag: "abc1234"', updated)

    def test_repairs_all_three_consecutive_legacy_entries_from_the_incident(self):
        source = f"""kind: Kustomization
images:
  - name: {CHATWOOT}
  newTag: old
  - name: {PERSONAL}
  newTag: old
  - name: {OA}
  newTag: old
"""

        updated = update_text(source, [CHATWOOT, PERSONAL, OA], "f6031cdf9")

        self.assertEqual(updated.count('    newTag: "f6031cdf9"'), 3)

    def test_rejects_selected_new_tag_indented_less_than_its_list_item(self):
        source = f"""kind: Kustomization
images:
    - name: {CHATWOOT}
  newTag: old
"""

        with self.assertRaisesRegex(UpdateError, "must be indented beneath"):
            update_text(source, [CHATWOOT], "abc1234")

    def test_rejects_legacy_indentation_for_an_unselected_image(self):
        source = f"""kind: Kustomization
images:
  - name: unrelated/image
  newTag: old
  - name: {CHATWOOT}
    newTag: old
"""

        with self.assertRaisesRegex(UpdateError, "must be indented beneath"):
            update_text(source, [CHATWOOT], "abc1234")

    def test_rejects_tag_that_could_change_yaml_structure(self):
        source = f"""kind: Kustomization
images:
- name: {CHATWOOT}
  newTag: old
"""

        with self.assertRaisesRegex(UpdateError, "Invalid OCI image tag"):
            update_text(source, [CHATWOOT], "tag: injected")


class UpdateFileTest(unittest.TestCase):
    def test_rolls_back_file_when_render_validation_fails(self):
        source = f"""kind: Kustomization
images:
- name: {CHATWOOT}
  newTag: old
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "kustomization.yaml"
            path.write_text(source, encoding="utf-8")

            def reject_render(_directory):
                raise UpdateError("render failed")

            with self.assertRaisesRegex(UpdateError, "render failed"):
                update_file(path, [CHATWOOT], "abc1234", reject_render)

            self.assertEqual(path.read_text(encoding="utf-8"), source)

    def test_validates_even_when_tag_is_already_current(self):
        source = f"""kind: Kustomization
images:
- name: {CHATWOOT}
  newTag: "abc1234"
"""
        calls = []
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "kustomization.yaml"
            path.write_text(source, encoding="utf-8")

            changed = update_file(path, [CHATWOOT], "abc1234", calls.append)

            self.assertFalse(changed)
            self.assertEqual(calls, [path.parent.resolve()])


if __name__ == "__main__":
    unittest.main()
