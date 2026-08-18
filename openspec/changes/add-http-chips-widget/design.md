## Context

See `proposal.md` Why. Pack `http`, widget `json`, integration `http`, and `createHttpClient` already exist. Synced SSOT catalogs still freeze github v0 without http; in-flight `add-http-json-integration` (and siblings rss/wakatime) already MODIFY the same three capabilities. This change **adds widget `chips` only**: never add plugin/integration ids; never replace id arrays with an exclusive subset; never reopen `openspec/changes/add-http-json-integration/` or `openspec/changes/docs-playground/`.

Live `packages/action/src/engine.ts` already unions `json` (and `feed`) into `EnabledWidget` and already calls `decideHttpOnlyRunFailed`. Apply MUST **append `chips`** without regressing json or feed. Http widgets MUST skip `include_private` preflight. Mixed github-render + http-`fail_widget` MUST NOT throw. This change MUST NOT edit `packages/action/src/main.ts`.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Takumi 2.9.2 via `@profile-bits/renderer` only, Vitest 4, Biome 2.5. Thin `action.yml`. No `plugin_http`. No flattened `plugin_<plugin>_<widget>_<option>` inputs. No yaml `bits:`. Widgets perform no HTTP. Http modules MUST NOT import octokit. Zero live network in tests. Exclusive H0 glob: `openspec/changes/add-http-chips-widget/**` only.

## Goals / Non-Goals

**Goals:**

- Ship widget `chips` on pack `http` / integration `http` as yaml shorthand: one preset, closed types, expander → existing GET JSON client → Chip row, 480×160.
- Keep `json` as the arbitrary-URL escape hatch. `plugins.http: {}` stays widget-less.
- Extend engine `enabledWidgets` with json + chips and split `fail_widget` (github throw vs http-only `decideHttpOnlyRunFailed`).
- Prove presets, normalize, Chip split, and engine policy with fixtures and injected `renderWidget`.

**Non-Goals:**

- New plugin or integration ids (`shieldcn`, `shields`, extra packs).
- `packages/action/src/main.ts` `renderWidget` wiring (sibling gap).
- Playground `/playground/http` UI and live docs fetches (follow-on change `add-http-chips-playground`).
- Editing `add-http-json-integration` or `docs-playground` in place.
- Yaml `bits:`, `stats.http`, vendor SVG/PNG embed, user-defined preset URLs, `/badge/dynamic/json`, `/https/{hostname}`, `/memo`, discord, reddit, nba, views.
- Extra `undici` / `p-retry` / MSW. Tagging `v1`. Committing `dist/`. Git commit.

## Decisions

### 1. MODIFIED three-layer deltas, not a new capability or integration id

- **Choice:** Delta `plugin-contract`, `widget-contract`, and `integration-contract`. No fourth capability folder. No new integration id. Catalog stays `github`, `wakatime`, `rss`, `http`.
- **Why:** A new `shieldcn` capability or integration would fight the id freeze and duplicate `createHttpClient`. Chips is a widget on an existing pack.
- **Alternative:** New integration ids 1:1 with CDNs — rejected. Alternative: hang `bits:` on stats — rejected (`packages/bits` is not yaml; stats is github-only).

### 2. Yaml-only chips; types.ts append widget id only

- **Choice:** Off unless `plugins.http.widgets.chips` is present. `plugins.http: {}` still zero widgets. `ChipsOptionsSchema` strictObject: `filename`, `preset`, `types` (min 1, max 8, dedupe preserve order), optional `package` / `repo` / `workflow`, `timeout_ms` (reuse JSON 1–20000 / default 10000), `animate`. **No `url`. No `headers`. No `bits`.** Parse allows omit of package/repo/workflow; expand-time missing package/owner → `fail_widget`.
  - Exclusive file: `packages/core/src/types.ts` (H1.types). Read first. Append `FIRST_PARTY_WIDGET_IDS += "chips"`; `WIDGET_INTEGRATIONS.chips = ["http"]`. Do **not** add plugin/integration ids.
  - Constants: `HTTP_CHIP_PRESETS`, `HTTP_CHIP_TYPES`, `CHIPS_FILENAME_DEFAULT = "chips"`, `CHIPS_TYPES_MAX = 8`, `CHIPS_WORKFLOW_DEFAULT = "ci.yml"`, `CHIPS_ANIMATE_DEFAULT = false`.
  - `HttpWidgetsConfigSchema`: optional `chips` beside `json`.
- **Why:** User forbade new ids, flattened inputs, and yaml `bits:`. Missing params at parse would block playground/Action from filling `user`.
- **Alternative:** `plugin_http` bool — rejected. Alternative: required package/repo at parse — rejected; Action `user` fills owner.

### 3. Preset expander + normalize on the existing client

- **Choice:** New files under `packages/integrations/src/http/`: `presets.ts`, `normalize.ts`, `colors.ts`, `fixtures/chips/**`. `expandChipsRequest({ preset, type, user, repo, packageName, workflow })` → `{ url: URL }` https only. Origin allowlist `shieldcn.dev` and `img.shields.io` **in addition to** existing SSRF. `normalizeBadgeJson` → `{ label, message, color? }` with `message = message ?? value`; empty/missing message throws; ignore `link`. `resolveChipColor(color, accent)` named+hex else accent.
- **Lock:** Widget load helper calls injected `createHttpClient` (same split as `renderJsonFromClient`). N types → N GETs, shared cache, `Promise.all`, one card. One GET/normalize fail → entire widget `fail_widget`. Http module MUST NOT import octokit. No second client.
- **Why:** Generic json already fetches any SSRF-safe URL. Chips is shorthand plus Chip chrome, not a new transport.
- **Alternative:** Fetch inside the template — rejected; widgets do no HTTP. Alternative: nest vendor SVG — rejected; baked still + no remote images.

### 4. Closed path templates (v1)

- **Choice:** Shared type enum `npm | stars | forks | license | release | issues | prs | ci`. Path tables are locked in `integration-contract` (shieldcn `.json` routes vs shields `/npm/v/`, `/github/v/release/`, `/issues-pr/`, Actions workflow status). Forbidden even if the vendor has them: `/badge/dynamic/json`, `/https/{hostname}`, `/memo`, discord, reddit, nba, views. `repo` with `/` splits owner/repo; else owner = Action `user`. Shields `ci` workflow default `ci.yml`.
- **Why:** Open `endpoint?url=` / dynamic JSON is SSRF. Closed tables keep origin allowlist trivial.
- **Alternative:** User-defined URL templates — rejected; use widget `json`.

### 5. Chip split API; do not wrap Stat

- **Choice:** `packages/bits/src/Chip.tsx` stays children-only for github stats/languages (bit-identical). Add optional `label` + `message` + `messageColor` horizontal split. Do **not** change `Stat.tsx`. Color: named map `brightgreen|green|yellowgreen|yellow|orange|red|blue|lightgrey|success|important|critical|informational|inactive` plus `#rgb`/`#rrggbb`; else theme accent. Inline `style` only.
- **Why:** Stats Chip wrapping Stat is vertical label/value — wrong chrome for a shields pill. shieldcn npm JSON has `value` and no color.
- **Alternative:** Reuse Stat inside Chip — rejected.

### 6. Engine fail_widget split; Action main renderer deferred

- **Choice:** This change **does** extend `EnabledWidget` + `enabledWidgets` with json + chips, skip `include_private` on http widgets, keep github `fail_widget` throw, use `decideHttpOnlyRunFailed` for http-only, and **not** throw on mixed github-render + http-`fail_widget`. Engine stays a port (injected `renderWidget`; no HTTP). `usesHttpIntegration` is already `WIDGET_INTEGRATIONS.includes("http")` — adding `chips` in types is enough; update `auth-policy.test.ts` (“true only for json”). **Do not** edit `packages/action/src/main.ts`.
- **Why:** A chips 404 must not fail github stats. Default yaml is github; github also has no Action renderer. Half-wiring http in `main.ts` still throws for stats. Sibling `wire-action-renderers`.
- **Alternative:** Throw on any `fail_widget` — rejected. Alternative: wire `main.ts` in this change — rejected.

### 7. Playground deferred to `add-http-chips-playground`

- **Choice:** H5 is a **follow-on OpenSpec change**, not this folder. Do not start it until the chips widget exists **and** no writer holds `apps/docs/**`. Do **not** edit `docs-playground` in place. This change MUST NOT add `/playground/http` UI or live vendor fetches. Docs stay fixtures-only; do not add `http` to `PREVIEW_PLUGIN_IDS` here.
- **Why:** `docs-playground` still claims `apps/docs/**`. Colliding writers on preview types is the failure mode.
- **Alternative:** H5 inside this change — rejected.

### 8. Exclusive-glob apply graph (H0–H6)

- **Choice:** One writer per exclusive file. Never two agents on `types.ts`, `parse-config.ts`, `auth-policy.ts`, `flatten.ts`, `action-yml.ts`, root `action.yml`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `packages/plugins/src/http/plugin.ts`, `packages/plugins/src/index.ts`, `packages/integrations/src/index.ts`, `engine.ts`, `main.ts`, `apps/docs/AGENTS.md`, `apps/docs/src/preview/types.ts`, `Chip.tsx`.
- **Waves:** H0 this folder (planning). H1 parallel after H0 (types serial vs presets/normalize/fixtures/Chip). H2 after types (parse, flatten, plugin, auth tests, AGENTS ×6). H3 widget + engine; barrel after widget. H4 tests. H5 follow-on change. H6 parent `just lint && just test && just generate-action --check`.
- **H2.flatten:** `BANNED_FLATTENED_INPUT_NAMES += "plugin_http_chips_preset"` even though the flatten regex already matches `plugin_http_chips_*`.
- **H2.plugin:** `widgets: ["json","chips"]`; `defaults.widgets` stays `["json"]` metadata only; `bitsUsed` += `Chip`.
- **Why:** Disjoint globs; json Action wiring stays in the sibling http-json change; chips must not clobber it.
- **Alternative:** Serialize all apply — rejected. Alternative: implement H5 or `main.ts` here — rejected.

### 9. Tests: fixtures, injected client, zero live network

- **Choice:** 16 hand-authored fixture JSON files (preset × type) plus inline normalize shapes (shieldcn npm without color; shields with color). Widget tests: `vi.spyOn(globalThis, "fetch")` unused in template. Accept: yaml chips + injected fetch map → `renderSvg` 480×160. Engine tests: injected `renderWidget` stubs. `just generate-action --check`.
- **Why:** Live CDN in CI is flaky and fights docs AGENTS (zero live URLs).
- **Alternative:** Capture live JSON in CI — rejected.

## Risks / Trade-offs

- [New integration id sneaks in] → Append widget id only; specs forbid `shieldcn`/`shields` as integration ids.
- [types.ts clobber of rss/wakatime/json] → Read first; append `chips` only.
- [Chips 404 fails github stats] → Latch `fail_widget` throw for github widgets only; `decideHttpOnlyRunFailed` for http-only.
- [Regress json/feed engine enablement] → Append chips; keep existing json/feed branches.
- [SSRF via dynamic badge URLs] → Closed path tables + origin allowlist + existing SSRF; no `url` on chips.
- [Partial card on one type 404] → Entire widget `fail_widget`.
- [shieldcn has `value` and no color] → `message ?? value`; missing color → accent.
- [Stat chrome on chips] → Optional Chip split; do not wrap Stat.
- [Flattened `plugin_http_chips_preset`] → Explicit ban + `--check`.
- [Playground live fetch / writer collision] → Defer to `add-http-chips-playground`; do not edit `docs-playground`.
- [Http-only yaml never paints in production] → Accepted: `main.ts` renderer is a sibling gap; engine + library still land.
- [AGENTS.md freeze omits chips] → H2.agents updates six files after types.
- [Reopening http-json change] → Exclusive glob this folder only.

## Migration Plan

Greenfield additive widget on an existing pack. Default committed yaml stays github-only; existing json yaml keeps working. Apply follows `tasks.md` H1–H4 then H6.1. H5 is a separate change after the widget exists. Rollback: omit `plugins.http.widgets.chips`; delete this change folder before archive. Do not archive or commit unless asked.

## Open Questions

(none — preset tables, origin allowlist, Chip split, engine fail_widget split, deferred playground, and deferred `main.ts` renderer are locked above)
