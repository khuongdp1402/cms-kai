# Kalo (KChat) — Project Guide

**Kalo** is a multi-channel messaging + shop-management app for small online shops in Vietnam, built on Chatwoot OSS 4.16.1 (Rails 7.1 + Vue 3) plus a standalone `zalo-personal-bridge/` (Node/TS). *KChat* was the working name: the internal namespace, tables (`kchat_*`) and some paths stay `kchat`; the shown brand is Kalo (`INSTALLATION_NAME`). The Chatwoot UI is replaced by the Kalo app (rail with 6 items, orders, POS, reports, billing) in the same Vue codebase; Chatwoot stays the backend. Status: [docs/STATUS.md](docs/STATUS.md) · roadmap: [docs/ROADMAP.md](docs/ROADMAP.md) · go-live: [docs/reference/go-live-checklist.md](docs/reference/go-live-checklist.md).

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

- Dev stack: Docker compose (`docs/reference/dev-setup.md`). Do not run bare `bundle exec rspec` / `pnpm test` on the host.
- Backend tests: `script/ktech/rspec.sh <track> <spec paths…>` (own test DB per track; `KALO_SKIP_SCHEMA=1` skips schema reload). Exclude `spec/enterprise` for a whole run (enterprise code is absent: 139 load errors) and add a per-example timeout, one upstream spec hangs.
- Frontend tests: `script/ktech/vitest.sh [paths…]`. For the WHOLE suite on 8 GB Docker add `--poolOptions.threads.minThreads=1 --poolOptions.threads.maxThreads=3` or the run is SIGKILLed.
- **Before declaring a branch done run the WHOLE rspec and vitest suites**, not just your own directories (LESSONS B16), and compare failures with the base commit: 74 rspec failures are known upstream (mostly missing Vite test build).
- Lint specific files: `npx eslint <files> --ext .js,.vue` in the rails container (LESSONS B13; `pnpm eslint` lints everything with `--fix`); `bundle exec rubocop <files>`.
- Landing page: `node --test landing-page/test/landing.test.mjs`. Deploy configs: `bash deploy/compose_check.sh`, `bash deploy/nginx/test.sh`.
- Bridge: `cd zalo-personal-bridge && pnpm test`. Pick specs with `codegraph affected <files>`.

## Architecture notes (verified 2026-11-17)

- API: `/api/v1/accounts/:id/*` (core), `/api/v2` (reports), `/platform/api/v1` (multi-tenant admin), `/public/api/v1` (client-side). Auth: devise_token_auth headers (`access-token`, `client`, `uid`, `expiry`) or `api_access_token`.
- Realtime: ActionCable `RoomChannel`; events from `app/listeners/action_cable_listener.rb`. Headless switch: `CW_API_ONLY_SERVER=true`. CORS for authenticated API only from `CORS_ALLOWED_ORIGINS`; `/public/api`, `/packs`, `/audio` stay `*`.
- **No `enterprise/` dir** → Captain, SLA, custom roles, audit logs, companies, SAML, calls, capacity policies are routed but have **no controllers**; do not copy Chatwoot enterprise code. Confirm a feature works by its controller/model/service, not routes or UI (LESSONS B4, B12).
- **Kalo commerce module `Kchat`** (models `Kchat::{Product,Order,OrderItem,PaymentEvent}`, tables `kchat_*`, `Kchat::VietQr` local QR, `Kchat::Reports`, `Kchat::Entitlements`, `Kchat::PaymentSettings`). Routes:
  - `/api/v1/accounts/:id/kchat/{products,orders,payment_settings,reports/summary,subscription}`; orders add `transition`, `send_qr`, `qr`, filter `contact_id`, `meta.paid_total`. List shape `{payload, meta}`, `conversation_id` = display_id.
  - `/api/v1/console/{overview,accounts,payment_events}` (+ `assign`): SuperAdmin only, not account scoped.
  - `/api/v1/casso/webhook` (header `Secure-Token`, fail-closed, 120/min/IP) and `/casso/status`; `simulate` exists only in development.
  - `/api/v1/accounts/:id/brand_growth/*` (AI chat reply, repurpose, approve job; throttle counted in the controller).
- **Entitlements (ADR-019):** 14-day trial from `account.created_at`; expired → 403 `subscription_expired` on creating products/orders and AI, reads and messaging stay. **Plan limits are NOT enforced** (Chatwoot ignores `account.limits`): never advertise them. Casso memo `KALO <account_id|tenant_slug> [PLAN|TOKEN|SEED] [order_id]`.
- **AI:** `Ai::CustomLlmService` calls AgentGW (OpenAI-compatible, `AGENTGW_BASE_URL`/`AGENTGW_API_KEY`); `AI_PROVIDER=gemini_api` is the only alternative. No key → 503 and the UI hides suggestions. There is no CDP/Chrome/9router path.
- Frontend: Kalo shell and pages under `app/javascript/dashboard` (`KaloRail`, orders, POS, reports, marketing, billing, console); i18n keys `KALO_*` in `i18n/ktech/vi.json` (Vietnamese-original, no English counterpart).
- Not built: external POS (KiotViet, Sapo), GHN/GHTK, Ads APIs, SMS Brandname/ZNS, auto-posting, MMO video, affiliate payouts, per-plan limits, per-shop bank reconciliation. Zalo OA has webhook + processor but no channel model; Zalo Personal is complete. Stubs: `lib/integrations/{shopee,tiktok}`.
- Details: [docs/reference/backend-audit.md](docs/reference/backend-audit.md), [docs/reference/deploy.md](docs/reference/deploy.md), [docs/reports/2026-11-kalo-launch-qa.md](docs/reports/2026-11-kalo-launch-qa.md).

## Code conventions

- Smallest production-ready change; no speculative guards/fallbacks; fail loudly on misconfiguration.
- Ruby: RuboCop (150 cols), compact `module/class`, strong params, custom exceptions in `lib/custom_exceptions/`.
- Vue: Composition API `<script setup>`, PascalCase components, Tailwind only (no custom/scoped/inline CSS), no bare strings (i18n).
- Kalo-specific backend code goes under the `kchat` namespace; extend core via `prepend_mod_with` / `include_mod_with` rather than editing Chatwoot files, so upstream patches stay mergeable.
- Commits: Conventional Commits `type(scope): subject`. Commit/push only when the user asks.

## Lessons (always loaded)

@docs/LESSONS.md
