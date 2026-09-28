# KChat CMS — Project Guide

KChat is a multi-channel messaging platform for the KTech ecosystem, built on Chatwoot OSS 4.16.1 (Rails 7.1 + Vue 3) plus a standalone `zalo-personal-bridge/` (Node/TS). **Goal:** hide the Chatwoot UI entirely and ship a new, modern KChat CMS that uses Chatwoot as a headless backend. Full plan: [docs/ROADMAP.md](docs/ROADMAP.md).

## HARD RULES (never break)

1. **`~/Projects/DSF/` is read-only reference.** Reading/grepping is allowed. Never edit, write, create, delete, format, install, build, index (`codegraph init`), or run git commands that write (`git status` refreshes the index — use `git --no-optional-locks log/show/diff` only) inside it.
2. **Never call any DSF-related API or service** — no requests to `dsfsoft.vn`, `dsf-software` GitHub repos (no fetch/pull/clone/push), DSF gateways, or endpoints found in DSF code/config. Do not copy DSF secrets/URLs/env values into this repo.
3. **Follow the docs workflow below on every task.** The plan and status docs are the source of truth for what to work on.
4. **Read [docs/LESSONS.md](docs/LESSONS.md) before starting work** and never repeat a logged mistake.

## Docs workflow (mandatory)

- Before starting: read `docs/STATUS.md` → work on the task marked as current (or the next `todo` in the current phase).
- While working: keep the task's status in `docs/STATUS.md` accurate (`todo` → `in-progress` → `done`/`blocked`), with a one-line note of what changed.
- **Interruptions:** if the user asks for something outside the current task, add it to `docs/STATUS.md` (section "Việc chen ngang") and, if it changes scope/order, update `docs/ROADMAP.md` too. Then return to the plan.
- Architectural choices → record in `docs/DECISIONS.md` (ADR format).
- Any error/mistake you hit, or any correction/requirement from the user → append to `docs/LESSONS.md` right away (symptom, cause, rule to follow).
- Docs are written in Vietnamese; code, identifiers and commit messages in English.

## Tooling

- **CodeGraph** (skill `codegraph`, MCP in `.mcp.json`): use it first for "where is X / who calls X / what breaks if I change X / which specs cover this". Run `codegraph sync` after big changes.
- **Superpowers** plugin (enabled in `.claude/settings.json`): use its brainstorming → writing-plans → executing-plans flow for new features, TDD skill for implementation, systematic-debugging for bugs, verification-before-completion before claiming done. Plans it produces go under `docs/plans/`, not elsewhere.

## Build / Test / Lint

- Setup: `bundle install && pnpm install` (Ruby via rbenv: `eval "$(rbenv init -)"`, version in `.ruby-version`)
- Dev: `overmind start -f Procfile.dev` (or `pnpm dev`)
- Seed: `bundle exec rails db:seed`
- Lint: `pnpm eslint` / `bundle exec rubocop -a`
- Test: `pnpm test`, `bundle exec rspec spec/path_spec.rb[:LINE]` — pick specs with `codegraph affected <files>`
- Bridge: `cd zalo-personal-bridge && pnpm test`

## Architecture notes (verified 2026-09-28)

- API: `/api/v1/accounts/:id/*` (core), `/api/v2` (reports), `/platform/api/v1` (multi-tenant admin), `/public/api/v1` (client-side). Auth: devise_token_auth headers (`access-token`, `client`, `uid`, `expiry`) or `api_access_token`.
- Realtime: ActionCable `RoomChannel` (`pubsub_token` + `account_id` + `user_id`); events broadcast from `app/listeners/action_cable_listener.rb`.
- Headless switch: `CW_API_ONLY_SERVER=true` (routes + CORS). CORS is in `config/initializers/cors.rb` (currently `origins '*'`).
- **No `enterprise/` dir** → Captain, SLA, custom roles, audit logs, companies, SAML, calls, capacity policies, reporting_events are routed but have **no controllers**. Do not copy Chatwoot enterprise code (different license).
- Stubs not wired anywhere: `lib/integrations/{shopee,tiktok}`, `app/services/ai/custom_llm_service.rb`. Zalo OA has webhook + processor but no channel model. Zalo Personal is complete.
- Details: [docs/reference/backend-audit.md](docs/reference/backend-audit.md).

## Code conventions

- Smallest production-ready change; no speculative guards/fallbacks; fail loudly on misconfiguration.
- Ruby: RuboCop (150 cols), compact `module/class`, strong params, custom exceptions in `lib/custom_exceptions/`.
- Vue: Composition API `<script setup>`, PascalCase components, Tailwind only (no custom/scoped/inline CSS), no bare strings (i18n).
- KChat-specific backend code goes under a `kchat` namespace; extend core via `prepend_mod_with` / `include_mod_with` rather than editing Chatwoot files, so upstream patches stay mergeable.
- Commits: Conventional Commits `type(scope): subject`. Commit/push only when the user asks.

## Lessons (always loaded)

@docs/LESSONS.md
