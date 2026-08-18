## Why

Takumi default SVG is a baked still, so colors must be hex at render time. Today palettes live in renderer plus plugin-local hex copies, and yaml `theme` is only `light` | `dark`. Named families (Catppuccin, Rosé Pine, Nord, and the rest of the official catalog) and user-composed mixes cannot resolve once and apply to every pack without drifting.

## What Changes

- Add a host-owned theme catalog (future `@profile-bits/themes`) as the only hex SSOT. Plugins, bits, and widgets MUST NOT own palettes.
- Freeze the 7 tokens: `bg`, `card`, `text`, `muted`, `accent`, `border`, `font`. `font` is always Geist (no extra WOFF2).
- Expand named theme ids from `light` | `dark` to **47** official flavor ids: keep GitHub Primer `light` / `dark`; add `github-dimmed`; Catppuccin 4; Rosé Pine 3; plus nord, dracula, gruvbox, tokyo-night, solarized, one, ayu, everforest, kanagawa, flexoki, nightfox, iceberg, night-owl, horizon, bluloco, papercolor with the exact flavor ids locked in `theme-catalog`. Unknown ids fail parse (no silent fallback to `dark`).
- Widen yaml root `theme` to a **union**: named id string **or** `theme: { custom: { bg, card, text, muted, accent, border, pair? } }`. Color refs are `{flavorId}.{swatchId}` | `{flavorId}.{role}` | hex. Unknown refs fail closed. `output_pair` + custom requires `pair`.
- Thin Action `theme` override remains a **named id string only**. `theme: custom` as an Action input fails. Yaml custom + Action `theme: nord` → nord wins.
- Lock `output_pair` polarity files: `{filename}` = light member, `{filename}-dark` = dark member. When `output_pair` is false, write `{filename}` only in the selected flavor.
- Widgets and bits consume a resolved `ThemePalette` only. Delete plugin-local palettes (`DARK_*`, per-widget token types). Author-widget templates use `ThemeId` or resolved palette.
- Add `/generate` theming chrome: family-grouped combobox, customize mixer, permalink, yaml export. Playground GlobalBar **shares** that picker; this change MUST NOT rewrite the in-flight `docs-playground` change.
- **Schema freeze exception is this change only.** No new first-party plugin packs. No github-readme-stats dump. No flattened `plugin_<plugin>_<widget>_<color>` Action inputs.

This change is OpenSpec planning only. Do not implement `packages/**`, `apps/**`, `action.yml`, or pnpm workspace in this wave.

## Capabilities

### New Capabilities

- `theme-catalog`: Host-owned catalog of 47 named flavor ids, frozen 7-token `ThemePalette`, official swatches/roles/pairs, color-ref grammar, fail-closed resolve, and the `@profile-bits/themes` data-package contract (no Takumi, no yaml).
- `generate-theming`: `/generate` picker + mixer + permalink + yaml export. Playground chrome shares the same picker and permalink params. Do not rewrite the in-flight playground capability.

### Modified Capabilities

- `plugin-contract`: Root yaml `theme` becomes named id **or** custom object; unknown named ids and unknown custom refs fail parse; `output_pair` polarity files are `{filename}` (light) + `{filename}-dark` (dark); thin Action `theme` override is named id only (`theme: custom` as Action input fails). Schema freeze exception is this change only. No new first-party plugin ids. No flattened color inputs.
- `widget-contract`: Widgets and bits consume a resolved `ThemePalette` only (the frozen 7 tokens). They MUST NOT declare local palettes, per-widget token types, or plugin-owned hex.

## Impact

- Specs: ADDED `theme-catalog` and `generate-theming`; MODIFIED deltas for `plugin-contract` and `widget-contract`. After archive/sync those become the contract SSOT. Do not edit sibling folders under `openspec/changes/` except this change. Do not MODIFIED-delta the in-flight `docs-playground` / `playground` spec.
- Code (later apply, Waves 1–7): new `packages/themes`; core `ThemeConfigSchema` + fail-closed parse; renderer re-exports; bits `<Theme>`; delete plugin-local palettes; thin Action named-id override + polarity pairing; `/generate` + shared playground picker. Schema freeze exception applies to core theme types in this change only.
- Out of scope: github-readme-stats dump (`radical`, `merko`, gradients, transparent); plugin-declared / per-widget yaml themes; custom fonts or extra WOFF2; Linguist language colors as theme tokens; runtime CSS / `prefers-color-scheme` inside baked SVG; new first-party packs; flattened Action color inputs; implementing packages in this wave; committing; tagging `v1`.
