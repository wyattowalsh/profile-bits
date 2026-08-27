---
name: author-palette
description: >-
  Authors yaml themes and named palettes under packages/themes. Use when
  editing flavors, swatches, or seven-token maps. NOT for the Theme bit,
  in-card Chip, cards, packs, or MCP.
license: MIT
compatibility: Requires the profile-bits repo; OpenSpec author-plugin and theme-catalog specs; packages/themes and packages/core/src/types.ts.
metadata:
  author: profile-bits
  version: "0.1.0"
---

# Author palette

Author host-owned theme data under
`packages/themes/src/families/<family>.ts`. This skill owns yaml `theme`,
flavors, tokens, and named palettes, not the `Theme` bit or in-card `Chip`.

Load [destinations](references/destinations.md) only after empty arguments have
been ruled out.

## Dispatch

| `$ARGUMENTS` | Result |
| --- | --- |
| *(empty)* / `help` | Show the palette gallery and stop |
| Complete an existing named theme id or family | Inventory its family file and registry; extend missing data without clobbering complete flavors |
| Add a new named palette id or family | Require an OpenSpec delta first, then use `templates/Palette.template` |
| yaml `theme`, custom role map, flavor, swatch, pair, or token | This skill |
| `Theme` bit / in-card `Chip` / `packages/bits/src/Theme.tsx` | Stop → `author-bit` |
| card, plugin pack, data source | Stop → the matching specialized skill |
| `packages/palettes`, MCP, flattened Action input, parent-traversal dest | Refuse |

Bare `theme` without a destination is ambiguous and routes back to the
`author` gallery. `Theme` bit and in-card `Chip` route to `author-bit`.

## Empty args

Empty arguments and help sit above all reads. Show these modes and **stop**:

1. Complete a named theme flavor already in the live catalog.
2. Propose a new flavor or family through OpenSpec.
3. Work with yaml `theme` custom roles and pairing.
4. Route the `Theme` bit and in-card `Chip` to `author-bit`.

Do not read `types.ts`, packages, or OpenSpec. Do not copy templates, select a
default family, invent an id, or mutate files.

## Palette model

Hex SSOT is `packages/themes` (`@profile-bits/themes`). Each flavor records:

- `id`, `family`, `label`, `polarity`, `pair`, `license`, and `sourceUrl`
- named `swatches`
- exactly seven resolved roles: `bg`, `card`, `text`, `muted`, `accent`,
  `border`, `font`

`font` is always Geist. Plugins, widgets, and bits do not own flavor hex.
Linguist language colors are outside the seven tokens.

Named ids are live `NAMED_THEME_IDS` from
`packages/themes/src/registry.ts`. Do not copy a 47-id table into this skill.

Root yaml `theme` is a live named id **or**
`{ custom: { bg, card, text, muted, accent, border, pair? } }`. Color refs are
`{flavorId}.{swatchId}` | `{flavorId}.{role}` | hex (`#RGB` / `#RRGGBB` /
`#RRGGBBAA`). Unknown flavor, swatch, role, or hex fails closed (hints OK);
never fall back to `dark`. Custom + `output_pair` requires `pair`.

`output_pair: true` writes `{filename}` (light) and `{filename}-dark` (dark).
`output_pair: false` writes `{filename}` only in the selected flavor.

Never flatten theme values into Action inputs. Thin Action `theme` is a named
id only (`theme: custom` as an Action input fails). Custom lives in yaml.

## Complete-existing workflow

After mutating success, load [docs-closeout](../../references/docs-closeout.md)
and update `packages/themes/AGENTS.md` when catalog **rules** changed. Complete-existing
that only inventories a live flavor skips docs-closeout.

1. Read `packages/themes/AGENTS.md`, the target family file,
   `packages/themes/src/registry.ts` (`NAMED_THEME_IDS`), and matching tests.
   For yaml `theme` shape, read `ThemeConfigSchema` in
   `packages/core/src/types.ts` — it follows `NAMED_THEME_IDS`.
2. Resolve the named id from the live registry, not from a frozen table in this
   skill or a handwritten core `THEMES` array.
3. If the flavor and registry entry are complete, report complete-existing and
   stop.
4. Otherwise extend only missing flavor data or tests. Preserve unrelated
   flavors and pair symmetry.

## New palette workflow

A new named id, family, yaml shape, or role changes public theme vocabulary and
requires OpenSpec first.

1. Confirm this is palette data rather than the `Theme` bit or `Chip`.
2. Require an OpenSpec delta for the id, family, polarity, pair, license/source,
   swatches, and role mapping.
3. Reject ids containing `/`, `..`, uppercase, or characters outside
   lowercase kebab-case.
4. Copy `templates/Palette.template` to
   `packages/themes/src/families/<family>.ts` only for a new family. For an
   existing family, extend its live array instead of overwriting it.
5. Preserve the import style from an existing family source. Substitute the
   approved placeholders, then register the exported family array in
   `packages/themes/src/registry.ts`. `NAMED_THEME_IDS` is derived from that
   registry.
6. Add focused registry, pairing, role, and contrast tests.
7. Core yaml schema follows live `NAMED_THEME_IDS`. Do not dual-write a
   handwritten core `THEMES` array. Do not invent Action inputs.

Never create `packages/palettes/`.

## Theme and badge split

- `Theme` component in `packages/bits/src/Theme.tsx` → `author-bit`.
- Yaml `theme`, named flavor ids, swatches, pairs, and tokens → this skill.
- `Chip` and any proposed in-card `Badge` primitive → `author-bit`.
- Shields.io README images → sibling README tooling, not this plugin.

Do not create `author-theme` or `author-badge`.

## Canonical terms

- **Handwritten:** `packages/themes/AGENTS.md` after mutating catalog-rule changes.
- **Generated:** none (`just generate-docs` does not rewrite AGENTS.md).
- **Hex SSOT:** `packages/themes`; bits and plugins do not own flavor hex.

## Critical rules

1. Empty `$ARGUMENTS` / help show the gallery and stop.
2. New named id or family requires OpenSpec first.
3. After mutating success, load docs-closeout and update `packages/themes/AGENTS.md` when rules changed.
4. Unknown flavor/swatch/role/hex fails closed; never fall back to `dark`.
5. Never edit the Theme bit; that is `author-bit`.
6. Never add MCP or flattened theme Action inputs.
7. Templates stay skill-local with no parent traversal.

## Locks

- Templates are skill-local and contain no parent traversal.
- Named catalog is live `packages/themes/src/registry.ts` / `NAMED_THEME_IDS`.
  Do not freeze a 47-id table here. Core `ThemeConfigSchema` follows that
  export; do not dual-write a handwritten `THEMES` array.
- A new named id, family, or yaml theme shape still requires OpenSpec first.
- Unknown flavor, swatch, role, or hex fails closed; never fall back to `dark`
  (suggestions/hints OK).
- Color refs: `{flavorId}.{swatchId}` | `{flavorId}.{role}` | hex.
- Yaml `theme` is a live named id **or**
  `{ custom: { bg, card, text, muted, accent, border, pair? } }`.
- Custom + `output_pair` requires `pair`.
- Polarity files: `{filename}` is light, `{filename}-dark` is dark;
  `output_pair: false` writes the selected flavor only.
- `readableInk` is a `@profile-bits/themes` export used by `Chip`. Families
  do not invent local ink helpers. `Chip` itself is `author-bit`.
- Palette data stays in `packages/themes`; no plugin-local hex maps.
- Never add MCP, flatten theme/widget options, call GitHub unauthenticated, or
  use REST `/languages`.
- Engine JSON is a subcommand flag; never run `openspec --json`.

## Reference index

Do not load all at once.

| File | Load when |
| --- | --- |
| [destinations](references/destinations.md) | Existing or approved new palette work, after empty args |
| [docs-closeout](../../references/docs-closeout.md) | Mutating success only |

## Proof

```bash
pnpm dlx skills-ref@0.1.5 validate skills/author-palette
```
