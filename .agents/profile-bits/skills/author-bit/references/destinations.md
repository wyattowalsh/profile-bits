# Bit destinations and routing

Load only for named bit work after the empty-args stop.

## Complete-existing table

| Bit | Source |
| --- | --- |
| `Theme` | `packages/bits/src/Theme.tsx` |
| `Frame` | `packages/bits/src/Frame.tsx` |
| `Stack` | `packages/bits/src/Stack.tsx` |
| `Row` | `packages/bits/src/Row.tsx` |
| `Text` | `packages/bits/src/Text.tsx` |
| `Muted` | `packages/bits/src/Muted.tsx` |
| `Stat` | `packages/bits/src/Stat.tsx` |
| `Bar` | `packages/bits/src/Bar.tsx` |
| `Chip` | `packages/bits/src/Chip.tsx` (children-only **and** split; both shipped) |
| `Avatar` | `packages/bits/src/Avatar.tsx` |
| `Divider` | `packages/bits/src/Divider.tsx` |

All 11 are exported by `packages/bits/src/index.ts`. If the named source and
export already exist, stop as complete-existing. Do not copy the generic
template onto a frozen bit or replace complete code.

## Chip APIs

Completing Chip inventories **both** live APIs, then still stops as
complete-existing when `packages/bits/src/Chip.tsx` and the barrel export
exist. Tests: `packages/bits/src/index.test.ts`.

| API | Shape | Used by |
| --- | --- | --- |
| Children-only | `<Chip>followers</Chip>` | github `stats` / `languages` (bit-identical) |
| Split | `{ label, message, messageColor? }` | http `chips` widget |

Split pill `borderRadius` is 999. Missing `messageColor` uses theme `accent`.
Message ink is `readableInk(fill)` from `@profile-bits/themes`. Do not
hardcode white. Do not invent flavor hex in bits. Do not wrap `Stat` for
split. Do not route to Shields.io or create `author-badge`.

## 12th-name destination

After an approved OpenSpec delta:

- Template: `templates/Bit.template`
- Destination: `packages/bits/src/<BitName>.tsx`
- Barrel: one export plus one `BIT_EXPORTS` entry in
  `packages/bits/src/index.ts`
- Tests: focused behavior and frozen-export membership

The template is generic and only for the approved 12th name.

## Routing boundaries

Exactly six skills: `author`, `author-bit`, `author-palette`,
`author-integration`, `author-widget`, and `author-plugin`.

| Request | Owner |
| --- | --- |
| `Theme` UI component | `author-bit` (`packages/bits/src/Theme.tsx`) |
| in-card `Chip` primitive (children-only **and** split) | `author-bit` (`packages/bits/src/Chip.tsx`) |
| yaml `theme` / custom role map | `author-palette` (yaml config; not this skill) |
| named palette / flavors, swatches, tokens | `author-palette` (`packages/themes/src/families/<family>.ts`) |
| Bare `theme` with no destination | `author` gallery; stop; do not guess |
| data source / new API | `author-integration` |
| Shields.io README image row | sibling README tooling or `add-badges` |
| card composition and pack-level `bitsUsed` | `author-widget` / `author-plugin` |
| nested `packages/bits/AGENTS.md` | this skill, after mutating success (docs-closeout) |
| data-backed badge pack | OpenSpec, then `author-integration` + `author-plugin` + `author-widget` |

Do not write yaml theme or named-palette files from this skill. Do not create
`author-theme`, `author-chip`, or `author-badge`.
