# @profile-bits/themes

Host-owned named theme catalog. This package is the **hex SSOT**. Data only: no Takumi, no yaml parse.

## Own

- Flavor records: `id`, `family`, `label`, `polarity` (`light` | `dark`), `pair`, `license`, `sourceUrl`, `swatches` (name → hex), `roles` (7 tokens → swatch id; `font` is Geist, not a color swatch)
- `NAMED_THEME_IDS`, `ThemeId`, `ColorRef`, `ThemePalette`
- `resolveColorRef` / `resolveTheme` (fail-closed; never fall back to `dark`)
- `contrastRatio` (WCAG relative luminance), `listFamilies`

Resolved `ThemePalette` tokens: `bg`, `card`, `text`, `muted`, `accent`, `border`, `font`. `font` is always `Geist`.

## Forbidden

- Do not import `takumi-js` / `@takumi-rs/*` / `yaml`
- Do not parse yaml or own Action/config schema
- Plugins, bits, and widgets MUST NOT copy flavor hex or define local `DARK_*` palettes / per-widget token types
- Linguist language colors stay out of the 7 tokens
- CSS variables are not the color SSOT
