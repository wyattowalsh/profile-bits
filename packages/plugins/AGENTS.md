# @profile-bits/plugins

v0 first-party pack: **`github`**. Widgets: **`demo`** (opt-in / playground smoke), **`stats`** and **`languages`** (defaults when the plugin is on with no widget list).

A new widget is not a new plugin. A new integration is not a new plugin. Do not invent extra first-party packs in v0.

## Widgets

- **No HTTP** in widgets. Consume the cached integration payload.
- `demo` → `static` only. `stats` / `languages` → `github`.
- Card 480×160. Default format svg (baked still). Empty languages → “No language data”, not a crash.
- Layout: `packages/plugins/src/github/widgets/{demo,stats,languages}/` plus pack `plugin.ts` (registry only; T210 does **not** run `generate-action`).

## Forbidden

- Do **not** edit `packages/core/**` (schema is frozen).
- Do **not** edit root `action.yml` (thin codegen owns it).
- Do **not** add flattened `plugin_*_*_*` Action inputs.
