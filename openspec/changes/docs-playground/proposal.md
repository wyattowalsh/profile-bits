## Why

Docs still lack a dedicated playground capability: Fumadocs `/playground` as a codegen surface (layout/time-axis preview + emit thin workflow YAML, `.github/profile-bits.yml`, and README markdown). Without that lock, Wave 3 can treat `POST /api/preview` as a public embed API, hit GitHub unauthenticated when no App token exists, or present README-mode as a Camo/sanitize oracle instead of baked `renderSvg` / `renderAnimation` bytes.

## What Changes

- Add capability `playground`: Fumadocs + shadcn + Tailwind docs playground (not a CDN, zip, or stable embed API).
- Lock routes `/playground` (redirect to `/playground/github`) and `/playground/github` (plus `/playground/github/[widget]`).
- Lock three-column codegen UI: left plugin → widget checkboxes → schema forms → integration panel; center Takumi preview with theme toggle, pair mode, and format picker including gif/apng/animated webp (real `renderAnimation` bytes); right thin workflow YAML, `.github/profile-bits.yml`, README markdown (user pastes) with copy buttons.
- Lock preview as `POST /api/preview` only — GET rejected, not cacheable as an embed.
- Lock no-App-token path: T110 static fixtures, **zero outbound GitHub**. Cache GitHub by login with TTL when an App token exists. Never log visitor tokens; pasted tokens are sessionStorage only.
- Lock dual pane: WASM layout + README mode showing actual `renderSvg` / `renderAnimation` bytes plus a constraint checklist. Playground is layout/time-axis preview, not a Camo/sanitize oracle.
- Lock `ImageResponse` as docs-only still frames; motion uses `renderAnimation`. Permalink is query string only. `llms.txt` is generated from schemas.

This change is planning only. Do not implement `apps/**` or `packages/**`. Do not rewrite `plugin-contract`, `widget-contract`, `integration-contract`, or `action-public-api`.

## Capabilities

### New Capabilities

- `playground`: Docs codegen playground — Fumadocs/shadcn/Tailwind chrome, `/playground` routes, three-column tuners + Takumi preview + YAML/README export, `POST /api/preview` (not a stable embed), fixtures with zero outbound GitHub when no App token, login-TTL cache when App token exists, sessionStorage-only visitor tokens, dual-pane WASM + README-mode baked bytes (not a Camo oracle), docs-only `ImageResponse` stills, permalink query string, and schema-derived `llms.txt`.

### Modified Capabilities

- (none — `integration-contract` already requires playground App-or-fixtures and never-unauth. This change ADDED-specs the docs playground as a dedicated capability so archive stays clean. Do not MODIFIED-delta `plugin-contract`, `widget-contract`, `integration-contract`, or `action-public-api`.)

## Impact

- Specs: new `openspec/specs/playground/spec.md` after archive/sync. No edits to `plugin-contract`, `widget-contract`, `integration-contract`, `action-public-api`, or `github-api-fetch-policy` in this change.
- Code (later, not this change): `apps/docs` T130a Fumadocs app (except `source.config.*`, `llms.txt`, playground/preview/export), T130b `llms.txt` stub, T130c `source.config.ts`, T310 `POST /api/preview`, T311a `export-workflow.ts`, T311b playground UI except `readme-mode.*` / `export-workflow.ts`, T312 `readme-mode.*`.
- Out of scope: `packages/**` / `apps/**` implementation in this workflow, `author-plugin`, `marketplace-release`, extra first-party plugins, `/generate` implementation tasks (shared preview contract is specified here; generate UI is a sibling surface), archiving, git commit, plan/README edits.
