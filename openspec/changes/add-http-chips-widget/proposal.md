## Why

Generic widget `json` already GETs any SSRF-safe HTTPS JSON URL through `createHttpClient`, but consumers still need a yaml shorthand for closed badge presets (shieldcn / shields) plus horizontal Chip chrome. This change adds widget `chips` on the existing `http` pack so those presets expand to allowlisted URLs without a new plugin, a new integration id, or flattened Action inputs. Widget `json` stays the escape hatch for arbitrary URLs.

## What Changes

- Stay on first-party pack `http` and integration `http`. Add widget id `chips` (new widget, not a new plugin or integration). Do **not** invent further first-party packs or integration ids. Catalog remains `github`, `wakatime`, `rss`, and `http`.
- Yaml-only enablement. Chips on only when `plugins.http.widgets.chips` is present. `plugins.http: {}` still parses and enables **zero** widgets. No `plugin_http` Action bool. No flattened `plugin_http_*` / `plugin_http_chips_*` Marketplace inputs. No yaml `bits:`. No `url` / `headers` on chips. Parse MAY omit `package` / `repo` / `workflow`; missing package or owner **after** expand (including Action `user` as owner when `repo` has no `/`) MUST `fail_widget`.
- One preset per chips widget (`shieldcn` or `shields`). Closed type enum `npm | stars | forks | license | release | issues | prs | ci` (min 1, max 8, dedupe preserve order). Types expand to allowlisted https JSON URLs; N types → N GETs on the **existing** `createHttpClient`, shared cache, `Promise.all`, one 480×160 card.
- Normalize payloads to `{ label, message, color? }` (`message = message ?? value`). Missing message → `fail_widget`. Missing color → theme accent. Ignore `link`/`href` in v1. Empty successful list → `"No data"`. One type GET/normalize fail → entire chips widget `fail_widget` (no partial card).
- Load helper in the widget folder calls the injected client (same split as `renderJsonFromClient`). Templates perform **no** HTTP. Widgets MUST NOT import `takumi-js` / `@takumi-rs/*` or octokit. Zero live network in tests.
- `packages/bits/src/Chip.tsx` stays children-only for github stats. Add optional `label` + `message` + `messageColor` horizontal split. Do **not** wrap `Stat` for this widget.
- Action engine (this change): extend `EnabledWidget` + `enabledWidgets` with `json` + `chips`. Http widgets skip `include_private` preflight. After the loop: github `fail_widget` keeps the current throw; http-only uses `decideHttpOnlyRunFailed`; mixed github-render + http-`fail_widget` MUST NOT throw. Engine tests use injected `renderWidget`.
- `usesHttpIntegration` is already `WIDGET_INTEGRATIONS.includes("http")` — adding `chips` in `types.ts` is enough. Update `auth-policy.test.ts` (“true only for json”). Add `plugin_http_chips_preset` to `BANNED_FLATTENED_INPUT_NAMES`.
- Example yaml:

```yaml
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
      chips:
        filename: chips
        preset: shieldcn          # or shields
        types: [npm, stars, ci]
        package: react
        repo: vercel/next.js
        workflow: ci.yml          # shields ci only; default ci.yml
```

## Capabilities

### New Capabilities

- (none — chips is a widget on the existing `http` pack / `http` integration; not a fourth capability and not a new integration id)

### Modified Capabilities

- `plugin-contract`: Http pack widgets become `[json, chips]`. Yaml-only enablement; no `plugin_http`; `plugins.http: {}` still zero widgets. No flattened `plugin_http_chips_*` inputs. Engine enumerates json + chips independently of github; http `fail_widget` MUST NOT fail mixed github+http runs.
- `widget-contract`: ADDED widget `chips` (integration `http` only; frozen preset/types options; 480×160 Chip row; fail_widget matrix; fetch none in the template).
- `integration-contract`: **No new integration id.** Preset expander under `packages/integrations/src/http/`; still GET JSON via existing `createHttpClient`; origin allowlist **in addition to** SSRF; no `/badge/dynamic/json`, `/https/{hostname}`, `/memo`, discord, reddit, nba, or views.

## Impact

- Specs: MODIFIED deltas under this change for `plugin-contract`, `widget-contract`, and `integration-contract`. After archive/sync those become the contract SSOT. Do **not** reopen or edit `openspec/changes/add-http-json-integration/`.
- Code (apply later, not this planning change): append `chips` in `packages/core/src/types.ts`; expander/normalize/fixtures under `packages/integrations/src/http/`; Chip split API in `packages/bits`; widget under `packages/plugins/src/http/widgets/chips/`; engine json+chips enumeration and fail_widget split in `packages/action/src/engine.ts`; flatten ban `plugin_http_chips_preset`; AGENTS.md ×6. No extra `undici`/`p-retry`. No second HTTP client. No `plugin_http` on Action inputs.
- Out of scope: `packages/action/src/main.ts` `renderWidget` wiring (sibling gap); live playground fetches and `/playground/http` UI (follow-on change `add-http-chips-playground`); extra plugin/integration ids; reopening `add-http-json-integration`; editing `docs-playground`; vendor SVG/PNG embed; yaml `bits:`; `stats.http`; POST/PUT; tagging `v1`; committing `dist/`; git commit.
