---
name: author-bit
description: >-
  Completes shared UI bits under packages/bits. Use when authoring Theme, Chip,
  or an OpenSpec-approved 12th bit. NOT for yaml themes, palettes, packs,
  widgets, MCP, or Shields.io badges.
license: MIT
compatibility: Requires the profile-bits repo; OpenSpec author-plugin spec; packages/bits and packages/core/src/types.ts.
metadata:
  author: profile-bits
  version: "0.1.0"
---

# Author bit

Author shared Takumi-safe primitives in `packages/bits/src/<BitName>.tsx`.
This skill owns bits, not yaml configuration, cards, packs, or palette hex.
Load [destinations](references/destinations.md) only after empty arguments have
been ruled out.

## Dispatch

| `$ARGUMENTS` | Result |
| --- | --- |
| *(empty)* / `help` | Show the gallery below and stop |
| Complete `Theme`, `Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`, or `Divider` | Inventory that file and tests; complete missing work without replacing complete code |
| Complete `Chip` | Inventory **both** Chip APIs (children-only and split), then stop as complete-existing if source+export exist. Not Shields.io |
| Add a 12th bit | Require an OpenSpec delta first, then use `templates/Bit.template` |
| yaml `theme`, named palette, flavor, swatch, or token map | Stop → `author-palette` |
| Bare `theme` with no destination | Stop → `author` gallery; do not guess |
| widget/card or pack-level `bitsUsed` | Stop → `author-widget` or `author-plugin` |
| data source / new API | Stop → `author-integration` |
| README Shields.io badges | Stop → sibling `.agents/profile-bits-readme` or `add-badges` |
| MCP, flattened Action input, dest containing parent traversal | Refuse |

Natural-language `Theme bit` routes here. Bare `theme` without a destination is
ambiguous and routes back to the `author` gallery. In-card `Chip` routes here;
a Shields.io README image does not. Yaml theme and named palettes route to
`author-palette`. Never create `author-theme` or `author-badge`.

## Empty args

Empty arguments and help sit above all reads. Show these modes and **stop**:

1. Complete one of the frozen 11 bits.
2. Propose a 12th shared bit through OpenSpec.
3. Route yaml themes and named palettes to `author-palette`.
4. Route data sources to `author-integration`.
5. Route cards/packs to `author-widget` / `author-plugin`.

Do not read `packages/bits`, `types.ts`, or OpenSpec. Do not copy a template,
invent a bit name, or mutate files.

## Frozen 11

The complete-existing set is:

`Theme`, `Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`,
`Avatar`, `Divider`.

These are live exports in `packages/bits/src/index.ts`, not skill ids and not
yaml keys. For any named frozen bit:

1. Read `packages/bits/AGENTS.md`, the named source, `src/index.ts`, and related
   tests.
2. If the source and export already exist, report complete-existing and stop
   (skip docs-closeout).
3. If work is incomplete, extend only the missing source, export, or tests,
   then load [docs-closeout](../../references/docs-closeout.md) and update
   `packages/bits/AGENTS.md` when frozen-11 / Chip facts changed.
4. Do not copy `Bit.template`; it is for an approved 12th name only.

Never grow the frozen 11 silently.

## Complete Chip

`Chip` already ships two APIs in `packages/bits/src/Chip.tsx`. Completing Chip
**inventories both**, then still **stops as complete-existing** when the
source and `packages/bits/src/index.ts` export exist. Do not copy
`Bit.template`. Do not rewrite complete Chip code.

| API | Shape | Used by |
| --- | --- | --- |
| Children-only | `<Chip>followers</Chip>` | github `stats` / `languages` (bit-identical) |
| Split | `{ label, message, messageColor? }` | http `chips` widget |

Split chrome: pill `borderRadius` 999. Missing `messageColor` uses theme
`accent`. Message ink is `readableInk(fill)` from `@profile-bits/themes`.
Do not hardcode white. Do not invent flavor hex in bits. Related tests live
in `packages/bits/src/index.test.ts`. Do not wrap `Stat` for split. Do not
route Chip to Shields.io or create `author-badge`.

## New bit workflow

A 12th name changes the shared UI vocabulary and requires an OpenSpec delta
before code.

1. Confirm the request is a reusable bit rather than a card, palette, or pack.
2. Reject names containing `/`, `..`, or anything outside PascalCase.
3. Read `packages/bits/AGENTS.md`, all current bit sources, `src/index.ts`, and
   the relevant OpenSpec contracts.
4. Require the approved bit name and behavior in OpenSpec.
5. Copy the single generic `templates/Bit.template` to
   `packages/bits/src/<BitName>.tsx`; substitute `{{BitName}}`.
6. Add one named export to `packages/bits/src/index.ts` and update
   `BIT_EXPORTS`. Add focused tests.
7. Load [docs-closeout](../../references/docs-closeout.md) and update
   `packages/bits/AGENTS.md`.

Do not create one template per frozen bit and do not rewrite the barrel unless
an approved new bit actually lands.

## Theme and badge split

- `Theme` component in `packages/bits/src/Theme.tsx` → this skill.
- Root yaml `theme`, named palettes, flavors, swatches, and seven-token maps →
  `author-palette`. Never create `author-theme`.
- `Chip` inside a rendered card → this skill. Completing Chip inventories
  children-only **and** split `{ label, message, messageColor? }` here.
- Shields.io `<img>` rows in a consumer README → sibling README tooling.
  Completing Chip is not a Shields.io route.
- A new pack that fetches badge data → OpenSpec, then
  `author-integration` + `author-plugin` + `author-widget`.
- A proposed `Badge` primitive → this skill only after OpenSpec; never create
  `author-badge`.

## Canonical terms

- **Frozen 11:** Theme, Frame, Stack, Row, Text, Muted, Stat, Bar, Chip, Avatar, Divider.
- **Handwritten:** `packages/bits/AGENTS.md` after mutating success.
- **Generated:** none for bits (`just generate-docs` does not rewrite AGENTS.md).

## Critical rules

1. Empty `$ARGUMENTS` / help show the gallery and stop (no reads, no writes).
2. Complete-existing stops without rewriting `packages/bits/AGENTS.md`.
3. A 12th bit requires OpenSpec first; never silently grow the frozen 11.
4. After mutating success, load docs-closeout and update `packages/bits/AGENTS.md`.
5. Never copy into `DESIGN.md` or `apps/docs/**`.
6. Never add MCP or flattened `plugin_*_*_*` inputs.
7. Templates stay skill-local with no parent traversal.

## Locks

- Templates are skill-local and contain no parent traversal.
- Users never put `bits:` in `.github/profile-bits.yml`.
- Takumi imports stay in `@profile-bits/renderer`; bits use React-compatible
  `div` / `span` / `img` only. No DOM effects, portals, or `document`.
- Split Chip message ink uses `readableInk` from `@profile-bits/themes`. Do
  not hardcode white. Do not invent flavor hex in bits.
- Catalog decisions come from live `packages/core/src/types.ts`; never freeze a
  first-party pack-id table here.
- Never add MCP or flattened `plugin_<plugin>_<widget>_<option>` inputs.
- Never call GitHub unauthenticated or use REST `/languages`.
- Engine JSON is a subcommand flag; never run `openspec --json`.

## Reference index

Do not load all at once.

| File | Load when |
| --- | --- |
| [destinations](references/destinations.md) | Named bit or approved new-bit work, after empty args |
| [docs-closeout](../../references/docs-closeout.md) | Mutating success only |

## Proof

```bash
pnpm dlx skills-ref@0.1.5 validate skills/author-bit
```
