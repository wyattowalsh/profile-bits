## Context

See `proposal.md` Why. Three-layer specs are synced. `action-yml-public-api` and `github-api-fetch-policy` are already proposed and MUST NOT be edited. `integration-contract` already requires playground App-or-fixtures and never-unauth. This change ADDED-specs the docs playground as capability `playground` so T130a/b/c, T310, T311a/b, and T312 can apply without rewriting those contracts.

Constraints: v0 first-party pack is `github` only (`demo`, `stats`, `languages`); README delivery is the Action (commit widget files), not a public embed CDN; never unauthenticated GitHub; docs chrome ≠ widget runtime; card size 480×160; Takumi 2.9.2 via `packages/renderer` only.

## Goals / Non-Goals

**Goals:**

- Make T130a Fumadocs app shell, T130b schema-derived `llms.txt` stub, T130c `source.config.ts`, T310 `POST /api/preview`, T311a thin workflow + yaml export, T311b playground UI, and T312 README-mode implementable against a frozen playground contract.
- Keep preview fail-closed on GitHub: no App token → fixtures and zero outbound requests; visitor tokens never leave `sessionStorage` / never logged.
- Keep README-mode honest: baked `renderSvg` / `renderAnimation` bytes plus a constraint checklist, not a Camo simulation.

**Non-Goals:**

- Implementing `apps/**` or `packages/**`, applying, or archiving this change in the same workflow.
- Other OpenSpec changes (`action-yml-public-api` edits, `github-api-fetch-policy` edits, `author-plugin`, `marketplace-release`).
- Rewriting `plugin-contract` / `widget-contract` / `integration-contract`.
- `/generate` UI tasks (catalog, download/share). Shared `POST /api/preview` is specified here; generate-only files are out of this task list.
- Extra first-party plugins, GET embed URLs, zip download, flattened Action inputs, or live Camo SHA checks.

## Decisions

### 1. Dedicated playground capability, not an integration-contract rewrite

- **Choice:** New `playground` spec. Do not MODIFIED-delta `integration-contract`.
- **Why:** Never-unauth and App-or-fixtures already live on the integration contract. Routes, three-column codegen, dual-pane README-mode, permalink, and `llms.txt` are docs-surface behavior. Peak propose is 1; archive stays one capability folder `openspec/specs/playground/`.
- **Alternative:** MODIFIED-extend `integration-contract` — rejected; that spec is fetch/auth grain, not Fumadocs UI.

### 2. POST-only preview, never a public embed

- **Choice:** `POST /api/preview` with `Cache-Control: no-store` and `X-Robots-Tag: noindex`. Reject GET. No GET image URLs, OG hosts, or zip. Permalink is `URLSearchParams` only, no token fields.
- **Why:** README delivery is committed files. A cacheable GET would become a de-facto CDN and would fight Camo/rate-limit assumptions.
- **Alternative:** `GET /api/preview.png?user=` embed — rejected.

### 3. Fixtures when no App token; wrap T110 static only

- **Choice:** Missing App token → T110 `static` fixtures, zero outbound GitHub, fixture pill. Do not fork a second JSON pack. When an App token exists, cache GitHub by login with TTL; 403 → fixtures + `rate_limited`. One github client per preview request; reuse core `auth-policy` (`include_private` without `canPrivate` fails the widget). `runtime = nodejs`.
- **Why:** Unauthenticated 60/h/IP is forbidden. A second fixture pack would drift from demo/static.
- **Alternative:** Anonymous REST for octocat — rejected. Alternative: fail the playground with no App token — rejected; fixtures keep the codegen path usable.

### 4. Visitor tokens are sessionStorage only

- **Choice:** Optional pasted token stays in `sessionStorage`. Never in query, POST body, generated YAML/README, or logs. Cross-link `/playground` ↔ `/generate` strips tokens.
- **Why:** Permalink sharing and server logs are the leak paths. Generated README must not teach visitors to paste PATs into workflows.
- **Alternative:** Query `?token=` for live preview — rejected.

### 5. Dual pane: WASM layout + README-mode bytes, not a Camo oracle

- **Choice:** Center tabs: WASM layout (time-axis / format picker including real `renderAnimation` gif/apng/animated webp) and README mode (actual `renderSvg` / `renderAnimation` bytes + constraint checklist: baked still SVG, no CSS/SMIL promise, APNG-as-png, 480×160, relative `![](./profile-bits/…)`). Do not claim Camo or `?sanitize=true` rewriting.
- **Why:** Takumi SVG is a baked still. Simulating Camo would be wrong and untestable without a live SHA check (out of v0).
- **Alternative:** Single CSS-animated PNG preview — rejected; that hides the README bytes.

### 6. ImageResponse is docs-only stills

- **Choice:** Docs still frames MAY use `ImageResponse` from `takumi-js/response`. Motion MUST call `renderAnimation` and return the file. Action stays on `render` / `renderSvg` / `renderAnimation`.
- **Why:** `ImageResponse` is a Next/docs helper; ncc Action must not take that path.
- **Alternative:** Use `ImageResponse` for gif/apng — rejected.

### 7. Three-column codegen; Copy is the only primary CTA

- **Choice:** Left plugin → widget checkboxes → schema forms (`getPlaygroundFields()` from codegen) → integration panel (including source paste/drop that calls core `discoverSource`, no forked heuristic). Center preview + theme + pair + format. Right thin workflow YAML + `.github/profile-bits.yml` + README markdown, each with copy. No Download/Share primary on `/playground`.
- **Why:** Playground is codegen for the Action path; `/generate` owns download/share (sibling surface, not these tasks).
- **Alternative:** One-page visual generator with yaml rail — that is `/generate`, not this surface.

### 8. Module split matches T130a/b/c then T310/T311a/b/T312

- **Choice:** Exclusive files under `apps/docs`:
  - T130a: Fumadocs app except `source.config.*`, `llms.txt`, playground/preview/export
  - T130b: `llms.txt` stub from schemas
  - T130c: `apps/docs/source.config.ts`
  - T310: `app/api/preview/**` plus preview server (no App token → fixtures, zero GitHub)
  - T311a: `export-workflow.ts` only (thin workflow + yaml)
  - T311b: playground UI except `readme-mode.*` and `export-workflow.ts`
  - T312: `readme-mode.*`
- **Why:** Plan OWN globs. T311b must not write README-mode or the exporter. T130a must not own `llms.txt` or `source.config.ts`.
- **Alternative:** One `playground.tsx` blob — rejected; overlapping writers.

### 9. Schema-driven forms and llms.txt

- **Choice:** Playground fields and `llms.txt` come from the same plugin/widget Zod schemas as yaml/codegen. Do not hand-author a parallel option table.
- **Why:** Flattened option drift is the failure mode this repo already forbids on `action.yml`.
- **Alternative:** MDX-hardcoded forms — rejected.

## Risks / Trade-offs

- [GET preview becomes a public CDN] → POST only; `no-store` + `noindex`; reject GET.
- [No App token hits unauth 60/h] → Fixtures, zero outbound GitHub, fixture pill.
- [Visitor PAT in permalink or logs] → `sessionStorage` only; strip on cross-link; never log.
- [README-mode CSS fake hides baked SVG] → Dual pane; motion is `renderAnimation` bytes; checklist not a Camo oracle.
- [Second fixture JSON pack drifts from T110] → Wrap `static` only.
- [ImageResponse pulled into Action ncc] → Docs-only stills; Action stays on renderer APIs.
- [T311b edits `readme-mode.*` or `export-workflow.ts`] → Exclusive globs in tasks.md.
- [`prefers-reduced-motion` vs gif picker] → Force still + notice for motion feedback; format picker may still emit motion bytes for copy/export preview when explicitly selected (implementation MUST honor reduced-motion for auto-playing preview).

## Migration Plan

Greenfield docs playground. Apply later (new request) in `apps/docs` only, in task order: T130a → T130b ∥ T130c, then T310, then T311a ∥ T311b, then T312 (README-mode needs preview bytes). Archive/sync then copies `playground` into `openspec/specs/`. Tests: yaml + thin workflow round-trip; no App token → fixtures and zero outbound GitHub; GET preview rejected; tokens absent from permalink and logs.

Rollback: delete this change folder before archive; no production playground exists yet.

## Open Questions

None. Routes, three-column layout, POST-only preview, fixture-or-App GitHub, sessionStorage tokens, dual-pane README-mode, docs-only `ImageResponse`, permalink query string, and schema-derived `llms.txt` are locked by the plan and this spec.
