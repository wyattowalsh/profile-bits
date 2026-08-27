# Palette destinations and routing

Load only after the empty-args stop.

Yaml `theme`, flavors, tokens, and named palettes stay here. Hex SSOT is
`packages/themes` — do not invent flavor hex in this skill, in bits, or in
widgets. The `Theme` bit and in-card `Chip` are `author-bit`.

## Host-owned destinations

| Artifact | Destination |
| --- | --- |
| Named palettes / flavor records | `packages/themes/src/families/<family>.ts` |
| Seven-token maps (`bg`, `card`, `text`, `muted`, `accent`, `border`, `font`) | flavor `roles` in that family file (`font` is Geist) |
| Family registration / `NAMED_THEME_IDS` | `packages/themes/src/registry.ts` |
| Palette types (`ColorRef`, `ThemePalette`, `ThemeFlavor`) | `packages/themes/src/types.ts` |
| Yaml `theme` union (`ThemeConfigSchema`) | `packages/core/src/types.ts` (follows `NAMED_THEME_IDS`) |
| Family tests | `packages/themes/src/families/<family>.test.ts` |

Read live `NAMED_THEME_IDS` from the registry. Do not copy the catalog into
this skill. Do not dual-write a handwritten core `THEMES` array.

If a family file exists, extend its `readonly ThemeFlavor[]`; do not replace
the file. If a named id already has complete data and registry coverage, stop
as complete-existing.

For an approved new family, copy `templates/Palette.template`, preserve the
standard family-source import from a live neighbor, and register its exported
array. Never create `packages/palettes/`. A new named id, family, or yaml
shape still requires OpenSpec first.

## Required flavor fields

`id`, `family`, `label`, `polarity`, `pair`, `license`, `sourceUrl`,
`swatches`, and `roles`.

Roles resolve exactly `bg`, `card`, `text`, `muted`, `accent`, `border`, and
`font`; `font` remains Geist.

`readableInk` is a `@profile-bits/themes` export. Families do not invent a
local ink helper. `Chip` consumes it from `author-bit`; do not edit `Theme`
or `Chip` here.

## Yaml theme contract

`theme` is a live named catalog id **or**:

```yaml
theme:
  custom:
    bg: catppuccin-mocha.base
    card: dark.card
    text: "#e6edf3"
    muted: nord.muted
    accent: catppuccin-mocha.mauve
    border: "#30363d"
    pair: nord-light
```

Color refs: `{flavorId}.{swatchId}` | `{flavorId}.{role}` | hex (`#RGB` /
`#RRGGBB` / `#RRGGBBAA`). Unknown flavor, swatch, role, or hex fails closed
(hints OK). Never fall back to `dark`.

Custom + `output_pair: true` requires `pair` (`pair` is a named id or a
second `{ bg, card, text, muted, accent, border }` map).

Polarity files: `{filename}` is the light member, `{filename}-dark` is the
dark member. `output_pair: false` writes `{filename}` only in the selected
flavor.

Thin Action `theme` is a named id only. Custom is yaml-only. Do not flatten
color inputs.

## Routing boundary

| Request | Owner |
| --- | --- |
| `Theme` bit / in-card `Chip` | `author-bit` |
| yaml `theme`, flavors, tokens, named palettes | `author-palette` |
| card-specific styling | `author-widget` |
| pack registry | `author-plugin` |
| nested `packages/themes/AGENTS.md` | this skill, after mutating catalog-rule success (docs-closeout) |
| Shields.io README images | sibling README tooling |
| bare `theme` | `author` gallery |

Do not create `author-theme` or `author-badge`. Hex stays in
`packages/themes`; do not copy it into plugins, widgets, or bits.
