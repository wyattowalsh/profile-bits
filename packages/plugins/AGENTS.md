# @profile-bits/plugins

First-party packs: **`github`**, **`wakatime`**, **`rss`**, and **`http`** (post-v0). GitHub widgets: **`demo`** (opt-in / playground smoke), **`stats`** and **`languages`** (defaults when the plugin is on with no widget list). WakaTime widget: **`coding`** (yaml `plugins.wakatime` only; default when the pack is on with no widget list). Rss widget: **`feed`** (yaml `plugins.rss` only; required https `url`). Http widgets: **`json`** (yaml `plugins.http.widgets.json` only; required https `url`) and **`chips`** (yaml `plugins.http.widgets.chips` only; required `preset` + `types`; no `url`/`headers`/`bits`); `plugins.http: {}` is widget-less.

A new widget is not a new plugin. A new integration is not a new plugin. Do not invent extra first-party packs beyond `github`, `wakatime`, `rss`, and `http`.

## Widgets

- **No HTTP** in widgets. Consume the cached integration payload.
- `demo` → `static` only. `stats` / `languages` → `github`. `coding` → `wakatime`. `feed` → `rss`. `json` / `chips` → `http`.
- Card 480×160. Default format svg (baked still). Empty languages → “No language data”. Empty coding → “No coding data”. Empty feed → “No feed items”. Empty json after successful jmespath → “No data”. Empty chips → “No data”. `0` and `false` render. Do not invent `0` for omitted include keys.
- Layout: `packages/plugins/src/github/widgets/{demo,stats,languages}/` plus pack `plugin.ts` (registry only; T210 does **not** run `generate-action`). WakaTime: `packages/plugins/src/wakatime/widgets/coding/` plus pack `plugin.ts`. Rss: `packages/plugins/src/rss/widgets/feed/` plus pack `plugin.ts`. Http: `packages/plugins/src/http/widgets/{json,chips}/` plus pack `plugin.ts`.
- Do not import `takumi-js` / `@takumi-rs/*` directly; use `@profile-bits/renderer`.

## Forbidden

- Do **not** edit `packages/core/**` except the authorized schema exceptions in `packages/core/src/types.ts` and `packages/core/src/wakatime-schema.ts` (wakatime/`coding`, rss/`feed`, and http/`json`+`chips` ids and yaml schemas). Do not add further first-party ids.
- Do **not** edit root `action.yml` (thin codegen owns it).
- Do **not** add flattened `plugin_*_*_*` Action inputs. No `plugin_wakatime`, `plugin_rss`, or `plugin_http` bool.
