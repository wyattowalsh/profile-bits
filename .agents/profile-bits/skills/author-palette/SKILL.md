---
name: author-palette
description: >-
  Completes or authors profile-bits named palettes, yaml theme values, flavor
  families, swatches, and seven-token theme maps under packages/themes. Use
  for palette and yaml theme work. NOT for the shared Theme bit, cards, packs,
  MCP, or plugin-owned hex.
license: MIT
compatibility: Requires the profile-bits repo; OpenSpec author-plugin and theme-catalog specs; packages/themes and packages/core/src/types.ts.
metadata:
  author: profile-bits
  version: "0.1.0"
---

# Author palette

Author host-owned theme data under
`packages/themes/src/families/<family>.ts`. This skill owns named palettes and
yaml theme semantics, not the `Theme` UI primitive.

Load [destinations](references/destinations.md) only after empty arguments have
been ruled out.

## Dispatch

| `$ARGUMENTS` | Result |
| --- | --- |
| *(empty)* / `help` | Show the palette gallery and stop |
| Complete an existing named theme id or family | Inventory its family file and registry; extend missing data without clobbering complete flavors |
| Add a new named palette id or family | Require an OpenSpec delta first, then use `templates/Palette.template` |
| yaml `theme`, custom role map, flavor, swatch, pair, or token | This skill |
| `Theme` bit / `packages/bits/src/Theme.tsx` | Stop → `author-bit` |
| card, plugin pack, data source | Stop → the matching specialized skill |
| `packages/palettes`, MCP, flattened Action input, parent-traversal dest | Refuse |

Bare `theme` without a destination is ambiguous and routes back to the
`author` gallery. A request that explicitly says `Theme bit` routes to
`author-bit`.

## Empty args

Empty arguments and help sit above all reads. Show these modes and **stop**:

1. Complete a named theme flavor already in the live catalog.
2. Propose a new flavor or family through OpenSpec.
3. Work with yaml `theme` custom roles and pairing.
4. Route the `Theme` bit to `author-bit`.

Do not read `types.ts`, packages, or OpenSpec. Do not copy templates, select a
default family, invent an id, or mutate files.

## Palette model

Hex is host-owned by `@profile-bits/themes`. Each flavor records:

- `id`, `family`, `label`, `polarity`, `pair`, `license`, and `sourceUrl`
- named `swatches`
- exactly seven resolved roles: `bg`, `card`, `text`, `muted`, `accent`,
  `border`, `font`

`font` is always Geist. Plugins, widgets, and bits do not own flavor hex.
Linguist language colors are outside the seven tokens.

Root yaml `theme` accepts a live named id or the strict custom object defined by
the core schema. Never flatten theme values into Action inputs.

## Complete-existing workflow

1. Read `packages/themes/AGENTS.md`, `packages/core/src/types.ts`, the target
   family file, `packages/themes/src/registry.ts`, and matching tests.
2. Resolve the named id from the live registry, not from a frozen table in this
   skill.
3. If the flavor and registry entry are complete, report complete-existing and
   stop.
4. Otherwise extend only missing flavor data or tests. Preserve unrelated
   flavors and pair symmetry.

## New palette workflow

A new named id, family, yaml shape, or role changes public theme vocabulary and
requires OpenSpec first.

1. Confirm this is palette data rather than the `Theme` bit.
2. Require an OpenSpec delta for the id, family, polarity, pair, license/source,
   swatches, and role mapping.
3. Reject ids containing `/`, `..`, uppercase, or characters outside
   lowercase kebab-case.
4. Copy `templates/Palette.template` to
   `packages/themes/src/families/<family>.ts` only for a new family. For an
   existing family, extend its live array instead of overwriting it.
5. Preserve the import style from an existing family source. Substitute the
   approved placeholders, then register the exported family array in
   `packages/themes/src/registry.ts`.
6. Add focused registry, pairing, role, and contrast tests.
7. Update the core named-theme enum only when the approved contract requires
   it; do not invent Action inputs.

Never create `packages/palettes/`.

## Theme and badge split

- `Theme` component in `packages/bits/src/Theme.tsx` → `author-bit`.
- Yaml `theme`, named flavor ids, swatches, pairs, and tokens → this skill.
- `Chip` and any proposed in-card `Badge` primitive → `author-bit`.
- Shields.io README images → sibling README tooling, not this plugin.

Do not create `author-theme` or `author-badge`.

## Locks

- Templates are skill-local and contain no parent traversal.
- Live catalog and schema come from `packages/core/src/types.ts`; never encode
  a frozen first-party pack-id table.
- Palette data stays in `packages/themes`; no plugin-local hex maps.
- Never add MCP, flatten theme/widget options, call GitHub unauthenticated, or
  use REST `/languages`.
- Engine JSON is a subcommand flag; never run `openspec --json`.

## Reference index

| File | Load when |
| --- | --- |
| [destinations](references/destinations.md) | Existing or approved new palette work, after empty args |

## Proof

```bash
pnpm dlx skills-ref@0.1.5 validate skills/author-palette
```
