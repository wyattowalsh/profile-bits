## Why

The shared bit vocabulary can draw a card, a day grid, a chessboard, and a timestamp, and it still cannot draw the other shapes README cards repeat: a trend, a duration, a relative age, a rank, a split comparison, a table, or an empty state. Each widget was about to invent its own span for those. Steam recent playtime was a raw `1.5 h` stuffed into `Stat`, which duplicated the game name.

## What Changes

- Add capability `useful-bits`: twenty-six Takumi-safe primitives on top of Frozen 11 and the README-card seven. Refuse Dialog, Toast, Popover, Dropdown, and Command. `Cover` stays `Image`.
- Modify `widget-contract`: steam `recent` shows playtime with `Duration` (hours converted to seconds) and keeps `Image` for the icon.
- Modify `author-plugin`: pack `bitsUsed` may include the useful names once they are exported. The six-name starter is unchanged.
- No new first-party pack, widget, or integration id. No flattened Action inputs. No yaml `bits:` key.

## Capabilities

### New Capabilities

- `useful-bits`: Sparkline, Meter, Duration, Relative, Delta, Ordinal, Quote, Timeline, Empty, Figure, Table, StackBar, Compare, Legend, Code, Callout, Dot, Rating, Strip, Wrap, Ring, AvatarStack, KeyValue, Banner, Eyebrow, and Status.

### Modified Capabilities

- `widget-contract`: steam `recent` composes `Duration` and `Image`.
- `author-plugin`: `bitsUsed` may list the useful set after export.

## Impact

- `packages/bits/src/*` plus `BIT_EXPORTS` and focused tests.
- Docs bit samples at `/generate/bits` (layout preview, not an embed API).
- Steam recent playtime formatting and `STEAM_BITS_USED`.
- `packages/bits/AGENTS.md` and the bit section of `DESIGN.md`.
- Out of scope: Frozen 11 rewrites, new packs, unauthenticated GitHub, REST `/languages`, Playwright in the Action, tagging `v1` at `main`.
