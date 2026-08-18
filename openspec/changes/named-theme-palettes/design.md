## Context

See `proposal.md` Why. Synced `plugin-contract` freezes yaml `theme` as `light` | `dark`. Synced `widget-contract` already freezes the 7 tokens. Renderer `packages/renderer/src/themes.ts` is the only real palette; rss/wakatime duplicate dark hex; http already calls `themePalette()`; bits `<Theme>` toggles light/dark; docs `PREVIEW_THEMES` re-lists those two ids. In-flight `docs-playground` owns playground routes and `POST /api/preview`; this change shares picker chrome and MUST NOT rewrite that folder.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Takumi 2.9.2 via `@profile-bits/renderer` only, Vitest 4, Biome 2.5. Thin `action.yml`. No flattened `plugin_<plugin>_<widget>_<option>` inputs. No new first-party plugin packs. Never unauthenticated GitHub. Schema freeze exception is this change only. Do not edit sibling `openspec/changes/*` folders.

## Goals / Non-Goals

**Goals:**

- Host-owned `@profile-bits/themes` data package as hex SSOT; resolve named ids and custom refs to one `ThemePalette` before render.
- Widen yaml `theme` to named id or custom object; keep Action `theme` a named-id string override.
- Lock `output_pair` polarity files `{filename}` (light) / `{filename}-dark` (dark).
- Delete plugin-local palettes so every pack inherits the catalog.
- Replace the light/dark toggle with a shared generate/playground picker, mixer, and permalink.

**Non-Goals:**

- Implementing packages in Wave 0 (this design is apply guidance for Waves 1–7).
- github-readme-stats dump, plugin-declared palettes, custom fonts, Linguist-as-theme-tokens, runtime CSS inside baked SVG.
- Rewriting the in-flight `docs-playground` change or adding first-party plugin packs.
- Flattened Action color inputs. Tagging `v1`. Committing.

## Decisions

### 1. New themes package, not renderer-owned hex

- **Choice:** Add `@profile-bits/themes` (`packages/themes`): data only (no Takumi, no yaml). Core, renderer, bits (via renderer), plugins, and docs depend on it. Exports: `NAMED_THEME_IDS`, `ThemeId`, `ColorRef`, `ThemePalette`, `resolveColorRef`, `resolveTheme`, `contrastRatio`, `listFamilies`.
- **Why:** Core must not import renderer; renderer must not grow yaml/zod. Hex + swatches therefore cannot stay in `themes.ts` forever.
- **Alternative:** Keep palettes in renderer — rejected; core parse cannot validate refs. Alternative: put hex in core — rejected; core is schema/auth, not a swatch catalog.

### 2. Official systems only; 47 ids; keep Primer light/dark hex

- **Choice:** Keep `light` / `dark` as GitHub Primer chrome with current renderer hex so existing cards do not shift. Add `github-dimmed`. Ship Catppuccin 4, Rosé Pine 3, and the 16 official families with the exact flavor ids in `theme-catalog`. Each flavor: `id`, `family`, `label`, `polarity`, `pair`, `license`, `sourceUrl`, `swatches`, `roles`. `font` always Geist.
- **Why:** Upstream github-readme-stats paused unofficial dumps; those entries have no swatch names, so they cannot be mixed.
- **Alternative:** Clone ~80 github-readme-stats themes — rejected. Alternative: plugin-declared palettes — rejected; mocha would drift per pack.

### 3. Yaml union; Action override stays a named string

- **Choice:** Root `theme` is `ThemeId | { custom: { bg, card, text, muted, accent, border, pair? } }`. Refs: `{flavorId}.{swatchId}` | `{flavorId}.{role}` | `#RGB` / `#RRGGBB` / `#RRGGBBAA`. Fail-closed unknown refs. `output_pair` + custom requires `pair`. `pair` is a named id or a second 7-role map. Thin Action `theme` is a named-id enum only; `theme: custom` as Action input fails. Yaml custom + Action `theme: nord` → nord wins.
- **Why:** Custom mixes belong in yaml / generate permalink, not Marketplace inputs. Existing override semantics stay.
- **Alternative:** Flattened `plugin_*_*_bg` inputs — rejected. Alternative: Action JSON custom object — rejected; thin string override only.

### 4. Schema freeze exception is this change only

- **Choice:** Core may widen `ThemeConfigSchema` / parse in this change. Do not add plugin ids, widget options, or flattened Action inputs. After apply, the freeze resumes.
- **Why:** Theme is a root field already; widening the union is the authorized exception. A silent “just add keys” would reopen the catalog.
- **Alternative:** New yaml `palette:` key — rejected; `theme` is already run-global.

### 5. output_pair polarity files, not stem-light / stem-dark

- **Choice:** `{filename}` = light member; `{filename}-dark` = dark member. `theme` selects family and which dark/light flavor when several exist. Example: `theme: catppuccin-mocha` + pair → latte in `stats.svg`, mocha in `stats-dark.svg`. `output_pair: false` writes `{filename}` only in the selected flavor. Pure helper `themesFor(config)` used by engine tests and docs preview (docs twin owned by Wave 6).
- **Why:** Spec already said `filename` + `filename-dark`; preview currently emits `stem-dark` / `stem-light`. Lock polarity.
- **Alternative:** Always suffix both files `-light` / `-dark` — rejected; breaks existing `filename` + `filename-dark` contract.

### 6. Wave 2 family files then Wave 2b registry

- **Choice:** 19 exclusive family modules under `packages/themes/src/families/<family>.ts` (+ colocated test). Wave 2 MUST NOT edit `index.ts`. Wave 2b registers in `registry.ts` / `index.ts` and snapshots 47 ids, opposite pairs, and role resolve.
- **Why:** Parallel writers cannot share `index.ts`. Registry is the join point.
- **Alternative:** One giant catalog file — rejected; 19-way conflict.

### 7. Consumers delete local palettes; CSS vars from resolved hex

- **Choice:** Renderer `themes.ts` becomes a re-export; `stylesheets.ts` builds `--pb-*` from the resolved palette. Bits `<Theme theme={id | palette}>`. Plugins pass id or resolved palette; delete `CodingThemeTokens` / `FeedThemeTokens` / `DARK_*`. Author templates: `theme: ThemeId` (or resolved palette).
- **Why:** CSS vars help png/className authoring, not Camo. Baked SVG still has no `<style>`.
- **Alternative:** Treat CSS as SSOT — rejected; GitHub README SVG cannot run it.

### 8. Generate picker shared with playground; do not rewrite playground change

- **Choice:** New `theme-picker.tsx` / `theme-mixer.tsx` after types/permalink land. Import catalog; drop `PREVIEW_THEMES = ["light","dark"]`. Permalink: `theme=<id>` or `theme=custom` + `cbg`/`ccard`/`ctext`/`cmuted`/`caccent`/`cborder`/`cpair`. Same exporter for generate yaml and playground codegen. `POST /api/preview` `theme` widens; still no token fields; still fixtures without App token. Contrast warning < 4.5:1 does not block.
- **Why:** One run-global theme must round-trip to yaml SSOT. Playground already specified; this change only replaces the 2-item toggle.
- **Alternative:** Per-bit themes — rejected; cannot emit one yaml `theme`. Alternative: MODIFIED-delta the in-flight playground spec — rejected; share chrome instead.

### 9. Exclusive-file apply graph (Waves 1–7)

- **Choice:** Never two writers on: `packages/core/src/types.ts`, `packages/core/src/parse-config.ts`, `packages/themes/src/index.ts`, `packages/renderer/src/index.ts`, `packages/action/src/engine.ts`, `apps/docs/src/preview/types.ts`, `apps/docs/src/preview/permalink.ts`, `apps/docs/src/preview/global-bar.tsx`, `pnpm-workspace.yaml`, `action.yml`.
- **Waves:** 1 themes skeleton → 2 family files (19 parallel) → 2b registry → 3 core parse → 4 consumers (parallel) → 5 Action pairing → 6 generate UI (serialized) → 7 gate. Model pin `cursor-grok-4.6-xhigh`.
- **Why:** Same exclusive-writer protocol as other in-flight applies.
- **Alternative:** One agent for all families — rejected; the 19 files are disjoint.

## Risks / Trade-offs

- [Plugin-local hex drifts from mocha] → Delete `DARK_*` / per-widget token types; one catalog.
- [Unknown id silently becomes dark] → Fail-closed parse/resolve; no fallback.
- [Custom + pair missing writes one file] → Parse fails when `output_pair` and custom lack `pair`.
- [Action `theme: custom` looks like a mix] → Reject that string; custom lives in yaml only.
- [Preview emits stem-light / stem-dark] → Lock `{filename}` / `{filename}-dark` polarity.
- [Docs re-lists 47 ids] → Import catalog; no local union.
- [Playground change rewrite] → Share picker; do not edit `openspec/changes/docs-playground/`.
- [CSS vars treated as Camo theme] → Generate vars from resolved hex; baked SVG stays still.
- [Schema freeze reopened for plugins] → Exception is theme union only; no new packs.
- [Wave 2 races on index.ts] → Families exclusive; Wave 2b registers.
- [types.ts / engine.ts multi-writer] → Exclusive globs in tasks.md.

## Migration Plan

Greenfield catalog plus a widening of an existing root field. Default committed yaml stays `theme: dark`; existing `light` / `dark` hex stay Primer so current cards do not shift. Apply later in Waves 1–7 (`tasks.md`). Rollback: omit new named ids and custom objects; keep `theme: dark`. Do not archive or commit unless asked.

## Open Questions

(none — catalog ids, custom grammar, Action override, polarity files, package split, and generate permalink keys are locked above)
