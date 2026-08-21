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
| `Chip` | `packages/bits/src/Chip.tsx` |
| `Avatar` | `packages/bits/src/Avatar.tsx` |
| `Divider` | `packages/bits/src/Divider.tsx` |

All 11 are exported by `packages/bits/src/index.ts`. If the named source and
export already exist, stop as complete-existing. Do not copy the generic
template onto a frozen bit or replace complete code.

## 12th-name destination

After an approved OpenSpec delta:

- Template: `templates/Bit.template`
- Destination: `packages/bits/src/<BitName>.tsx`
- Barrel: one export plus one `BIT_EXPORTS` entry in
  `packages/bits/src/index.ts`
- Tests: focused behavior and frozen-export membership

The template is generic and only for the approved 12th name.

## Routing boundaries

| Request | Owner |
| --- | --- |
| `Theme` UI component | `author-bit` |
| yaml `theme`, named flavors, swatches, seven-token palette | `author-palette` |
| in-card `Chip` primitive | `author-bit` |
| Shields.io README image row | sibling README tooling |
| card composition and pack-level `bitsUsed` | `author-widget` / `author-plugin` |

Do not create `author-theme`, `author-chip`, or `author-badge`.
