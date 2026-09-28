---
name: codegraph
description: Navigate and analyze this codebase via the CodeGraph index (symbols, callers/callees, impact analysis, affected tests). Use BEFORE grepping broadly when you need to find where something is defined, who calls it, what a change will break, or which specs cover a file — in the Rails backend, the Vue dashboard, or zalo-personal-bridge.
---

# CodeGraph

The repo is indexed by the `codegraph` CLI (index in `.codegraph/`, gitignored, local per machine). The MCP server `codegraph` is declared in `.mcp.json`; when its tools (`codegraph_explore`, `codegraph_node`, …) are loaded prefer them, otherwise use the CLI below.

## When to use

| Need | Command |
|---|---|
| Find a symbol (class, method, component) | `codegraph query <name>` |
| Understand an area before changing it | `codegraph explore <topic words>` |
| Gather context for a task | `codegraph context <task description>` |
| One symbol's source + call trail | `codegraph node <Symbol>` |
| Who calls X / what X calls | `codegraph callers <Symbol>` / `codegraph callees <Symbol>` |
| Blast radius before editing core code | `codegraph impact <Symbol>` |
| Which specs to run after a change | `codegraph affected <changed files...>` |

## Rules

- Run `codegraph sync` after pulling or after large edits so results stay current; `codegraph status` shows index health.
- Before modifying any Chatwoot core class/controller/service, run `codegraph impact` and record notable risks in the task's notes in `docs/STATUS.md`.
- Use `codegraph affected` to pick specs to run instead of running the whole suite.
- CodeGraph is read-only analysis; it never replaces reading the actual file before editing it.
- Only index this repo. Never run `codegraph init`/`index` inside `~/Projects/DSF` (it would write `.codegraph/` there, which violates the DSF read-only rule).
