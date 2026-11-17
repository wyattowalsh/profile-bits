## Context

Frozen 11 and the README-card seven (`Image`, `Heatmap`, `Board`, `Icon`, `Grid`, `List`, `Time`) already ship. README cards still repeat structures those bits do not name: trends, durations, relative times, ranks, comparisons, tables, and empty copy. Overlay widgets stay impossible under Takumi (`div` / `span` / `img` only).

## Goals / Non-Goals

**Goals:**

- Add the useful set as named bits with theme-token color, tests, and `/generate/bits` samples.
- Format steam recent playtime with `Duration`.
- Keep Frozen 11 sources unchanged.
- Keep overlay names and `Cover` out of the barrel.

**Non-Goals:**

- New plugin packs or widget ids.
- Restyling frozen github `demo` / `stats` / `languages` / `repo` cards.
- Dialog, Toast, Popover, Dropdown, Command.
- A second hue beyond the host palette.

## Decisions

### 1. One change, one vocabulary

The seven README-card names stay owned by `readme-card-bits`. This change adds a second approved set instead of reopening that list. `Cover` remains `Image`.

### 2. Distinct jobs

`Sparkline` is a series, not `Bar`. `Duration` is a span of seconds, not `Time`. `Relative` takes an injected `now` so renders stay deterministic. `Strip` is one row, not `Heatmap`. `Table` is data, not `Grid`. `KeyValue` is one line, not `Stat`. `Meter` shows the number `Bar` omits.

### 3. Color

Stops are `accent`, `muted`, `border`, and `text` from bit theme context. `Banner` ink is `readableInk(accent)`. No flavor hex and no `boxShadow`.

### 4. Steam recent

Playtime is `Math.round(hours * 3600)` seconds through `Duration`. The icon stays `Image`. The name is `Text`. `Stat` remains on the player card.

## Risks / Trade-offs

- [More names in `BIT_EXPORTS`] → samples and the barrel test list them explicitly.
- [`display: grid` is unchanged on `Grid`] → useful bits use flex so a missing grid layout does not hide the new marks.
- [Spec still says recent uses `Stat` until this change is archived] → the delta replaces that scenario.

## Migration Plan

- Land the bits, samples, steam recent, and this change together.
- Archive updates `openspec/specs/` for `useful-bits`, the recent widget scenario, and `bitsUsed` membership.
- Rollback deletes the new sources and restores the recent `Stat` value string.

## Open Questions

- (none)
