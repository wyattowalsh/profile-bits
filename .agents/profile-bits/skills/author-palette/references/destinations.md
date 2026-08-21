# Palette destinations and routing

Load only after the empty-args stop.

## Host-owned destinations

| Artifact | Destination |
| --- | --- |
| Family flavor data | `packages/themes/src/families/<family>.ts` |
| Family registration | `packages/themes/src/registry.ts` |
| Palette types | `packages/themes/src/types.ts` |
| Named yaml ids and custom theme schema | live `packages/core/src/types.ts` |
| Family tests | `packages/themes/src/families/<family>.test.ts` |

If a family file exists, extend its `readonly ThemeFlavor[]`; do not replace
the file. If a named id already has complete data and registry coverage, stop
as complete-existing.

For an approved new family, copy `templates/Palette.template`, preserve the
standard family-source import from a live neighbor, and register its exported
array. Never create `packages/palettes/`.

## Required flavor fields

`id`, `family`, `label`, `polarity`, `pair`, `license`, `sourceUrl`,
`swatches`, and `roles`.

Roles resolve exactly `bg`, `card`, `text`, `muted`, `accent`, `border`, and
`font`; `font` remains Geist.

## Routing boundary

| Request | Owner |
| --- | --- |
| `Theme` bit source | `author-bit` |
| yaml `theme`, named theme, custom role map, flavor/pair/swatches | `author-palette` |
| card-specific styling | `author-widget` |
| pack registry | `author-plugin` |

Do not create `author-theme`, and do not copy hex into plugins or widgets.
