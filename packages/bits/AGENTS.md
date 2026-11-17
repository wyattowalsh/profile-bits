# @profile-bits/bits

Shared Takumi-safe widget UI index. Not a plugin and not a yaml layer. Users never put `bits:` in `.github/profile-bits.yml`.

v0 exports: `Theme`, `Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`, `Divider`.

README-card exports: `Image`, `Heatmap`, `Board`, `Icon`, `Grid`, `List`, `Time`.

Useful exports: `Sparkline`, `Meter`, `Duration`, `Relative`, `Delta`, `Ordinal`, `Quote`, `Timeline`, `Empty`, `Figure`, `Table`, `StackBar`, `Compare`, `Legend`, `Code`, `Callout`, `Dot`, `Rating`, `Strip`, `Wrap`, `Ring`, `AvatarStack`, `KeyValue`, `Banner`, `Eyebrow`, `Status`.

Rules: `div`/`span`/`img` + `tw`/`style`/`className` only. No `react-dom`, no `useEffect`, no portals, no `document`.

Further names need an OpenSpec delta. Do not add `Dialog`, `Toast`, `Popover`, `Dropdown`, or `Command`. Ranking name `Cover` is `Image`, not a second export.

## Chip

Two APIs in `src/Chip.tsx` (both complete; barrel export in `src/index.ts`). Completing Chip inventories both, then stops as complete-existing if source+export exist.

| API | Shape | Used by |
| --- | --- | --- |
| Children-only | `<Chip>followers</Chip>` | github `stats` / `languages` (bit-identical) |
| Split | `{ label, message, messageColor? }` | http `chips` widget |

Split: pill `borderRadius` 999. Missing `messageColor` → theme `accent`. Message ink via `readableInk(fill)`. Do not wrap `Stat` for split. Tests in `src/index.test.ts`.

In-card Chip (children-only or split `label`+`message`) is `author-bit`, not Shields; never yaml `bits:`.

- Split Chip message ink uses `readableInk` from `@profile-bits/themes` (not hardcoded white). Bits consume `ThemePalette` / context only; no flavor hex maps. A new bit name still needs OpenSpec. Do not invent overlay bits.
