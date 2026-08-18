## 1. Wave 1 — themes package skeleton

- [x] 1.1 Exclusive: `packages/themes/**`, `pnpm-workspace.yaml`, root `package.json` workspace if needed, `packages/themes/AGENTS.md`. Add `@profile-bits/themes` (data only: no Takumi, no yaml). Export `NAMED_THEME_IDS`, `ThemeId`, `ColorRef`, `ThemePalette`, `resolveColorRef`, `resolveTheme`, `contrastRatio`, `listFamilies`. Empty registry + tests for hex/ref grammar and fail-closed unknown refs. Move `light` / `dark` hex here from renderer (keep current Primer hex so existing cards do not shift). `font` always Geist. FORBIDDEN: editing `packages/themes/src/index.ts` after this wave’s skeleton (Wave 2b owns the full registry write); Wave 2 family files; core parse; `action.yml`.

## 2. Wave 2 — family files (19 parallel; after Wave 1)

Each task exclusive `packages/themes/src/families/<family>.ts` plus colocated test. Map official swatches; set roles + pair + license + sourceUrl. Do **not** edit `packages/themes/src/index.ts` or `registry.ts`.

- [x] 2.1 `[P]` Family `github`: `light`, `dark`, `github-dimmed`. Keep Primer hex for `light` / `dark`.
- [x] 2.2 `[P]` Family `catppuccin`: `catppuccin-latte`, `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha`.
- [x] 2.3 `[P]` Family `rose-pine`: `rose-pine`, `rose-pine-moon`, `rose-pine-dawn`.
- [x] 2.4 `[P]` Family `nord`: `nord`, `nord-light`.
- [x] 2.5 `[P]` Family `dracula`: `dracula`, `dracula-alucard`.
- [x] 2.6 `[P]` Family `gruvbox`: `gruvbox-dark`, `gruvbox-light`.
- [x] 2.7 `[P]` Family `tokyo-night`: `tokyo-night`, `tokyo-night-storm`, `tokyo-night-moon`, `tokyo-night-day`.
- [x] 2.8 `[P]` Family `solarized`: `solarized-dark`, `solarized-light`.
- [x] 2.9 `[P]` Family `one`: `one-dark`, `one-light`.
- [x] 2.10 `[P]` Family `ayu`: `ayu-dark`, `ayu-mirage`, `ayu-light`.
- [x] 2.11 `[P]` Family `everforest`: `everforest-dark`, `everforest-light`.
- [x] 2.12 `[P]` Family `kanagawa`: `kanagawa-wave`, `kanagawa-dragon`, `kanagawa-lotus`.
- [x] 2.13 `[P]` Family `flexoki`: `flexoki-dark`, `flexoki-light`.
- [x] 2.14 `[P]` Family `nightfox`: `nightfox`, `dawnfox`, `dayfox`.
- [x] 2.15 `[P]` Family `iceberg`: `iceberg-dark`, `iceberg-light`.
- [x] 2.16 `[P]` Family `night-owl`: `night-owl`, `light-owl`.
- [x] 2.17 `[P]` Family `horizon`: `horizon-dark`, `horizon-light`.
- [x] 2.18 `[P]` Family `bluloco`: `bluloco-dark`, `bluloco-light`.
- [x] 2.19 `[P]` Family `papercolor`: `papercolor-dark`, `papercolor-light`.

## 3. Wave 2b — registry index (after Wave 2)

- [x] 3.1 Exclusive: `packages/themes/src/index.ts`, `packages/themes/src/registry.ts`, catalog snapshot test. Register all 19 families. Snapshot: exactly 47 ids; every flavor has an opposite-polarity `pair` in the same family; every role resolves to hex. FORBIDDEN: editing family files; core parse.

## 4. Wave 3 — core parse (after Wave 2b)

- [x] 4.1 Exclusive: `packages/core/src/types.ts`, `packages/core/src/parse-config.ts`, `packages/core/src/config.ts`, parse tests. `ThemeConfigSchema` union: named catalog id **or** `{ custom: { bg, card, text, muted, accent, border, pair? } }`. Fail-closed unknown id / unknown swatch / unknown role / malformed hex / custom missing role / custom + `output_pair` without `pair`. Schema freeze exception is this change only. MUST NOT add first-party plugin ids.
- [x] 4.2 Exclusive: `packages/core/src/codegen/action-yml.ts` description only (`theme` named ids; still no custom object input). `theme: custom` as Action input fails. No flattened `plugin_<plugin>_<widget>_<color>` inputs. `just generate-action --check`.

## 5. Wave 4 — consumers (parallel after Wave 3)

- [x] 5.1 `[P]` 4a renderer exclusive: `packages/renderer/src/themes.ts` becomes re-export; `packages/renderer/src/stylesheets.ts` builds `--pb-*` from resolved palette; tests. CSS vars MUST NOT be the color SSOT.
- [x] 5.2 `[P]` 4b bits exclusive: `packages/bits/src/Theme.tsx` accepts `ThemeId | ThemePalette`; bits keep reading context only and MUST NOT import flavor hex.
- [x] 5.3 `[P]` 4c github widgets: `demo` / `stats` / `languages` widget + render widen `theme` type to id or resolved palette; tests.
- [x] 5.4 `[P]` 4d wakatime: delete `CodingThemeTokens` / `DARK_CODING_THEME`; `codingTemplate` uses `resolveTheme`.
- [x] 5.5 `[P]` 4e rss: delete `FeedThemeTokens` / `DARK_FEED_THEME`; feed template uses `resolveTheme`.
- [x] 5.6 `[P]` 4f http: switch `themePalette` to `resolveTheme`.
- [x] 5.7 `[P]` 4g author templates exclusive: `agent-plugin/profile-bits/skills/author-widget/assets/templates/widget.tsx.template` (`.agents` symlink target is the same tree). `theme: ThemeId` or resolved palette; never per-widget token types.

## 6. Wave 5 — Action pairing (after Wave 4)

- [ ] 6.1 Exclusive: Action engine render port + tests. When `output_pair` is true, call `renderWidget` per polarity and write `{stem}` (light) / `{stem}-dark` (dark). When false, write `{stem}` only in the selected flavor. Gist remains SVG-only. No GitHub HTTP in engine. Implement pure `themesFor(config): ThemeId[]` used by engine tests. Docs twin `apps/docs/src/preview/server/render-preview.ts` is Wave 6-owned — do not edit it here. FORBIDDEN: `action.yml` flattened color inputs; live GitHub in engine.

## 7. Wave 6 — generate / playground chrome (serialized; after Wave 5)

Exclusive: `apps/docs/src/preview/{types,permalink,global-bar,schema-form}.ts(x)`, `apps/docs/src/generate/**` theme plumbing, `apps/docs/src/codegen/export-workflow.ts`, `apps/docs/src/preview/server/render-preview.ts`, preview route tests. Do **not** rewrite `openspec/changes/docs-playground/`.

- [ ] 7.1 Import host catalog; drop `PREVIEW_THEMES = ["light","dark"]`. Widen permalink/types so `theme` is named id or custom refs. `POST /api/preview` body `theme` widens the same way; still no token fields; still fixtures when no App token.
- [ ] 7.2 Family-grouped combobox + customize mixer (`apps/docs/src/preview/theme-picker.tsx`, `theme-mixer.tsx`) after types/permalink land. Shared GlobalBar on `/generate/*` and `/playground/*`. Contrast warning below 4.5:1 (text-on-bg, muted-on-bg) does not block render. Live 480×160 preview.
- [ ] 7.3 Permalink: named `theme=<id>`; custom `theme=custom` plus `cbg` / `ccard` / `ctext` / `cmuted` / `caccent` / `cborder` / `cpair`. Cross-link `/playground` ↔ `/generate` keeps these params and still strips tokens. Generate export yaml emits named id or `theme.custom`. Playground codegen uses the same exporter. Bit isolator / pack stage / preview POST pass resolved palette. `output_pair` preview renders the resolved pair.
- [ ] 7.4 Playwright: `/generate/github` pick mocha → card hex; mix mauve accent → permalink round-trip; `output_pair` shows two figures. `/generate/bits/Bar` and `/generate/github/languages` share permalink `theme`.

## 8. Wave 7 — gate (after Wave 6)

- [ ] 8.1 `just lint`. Focused vitest on `themes`, `core`, `renderer`, `bits`, `plugins`, `action`, `docs`. `just generate-action --check`. `just generate-docs --check` if the recipe cares about theme enums. Verify: unknown id / unknown swatch / custom missing role / custom+pair missing fail parse; mocha stats SVG contains mocha `bg` hex not Primer `#0d1117`; rss/coding/json/github/bit samples change together; baked SVG has no `<style>` / `@keyframes` / SMIL / `foreignObject`. Do not commit unless asked. Do not tag `v1`.
