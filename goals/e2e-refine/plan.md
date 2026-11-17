# Plan: e2e-refine (audited)

This revision replaces the unstarted three-wave DAG. Waves 1–3 are already on `main`. The live gap was the shared bit vocabulary, not another pack. Wave 4 is the `useful-bits` change: twenty-six Takumi-safe primitives, docs samples, and steam recent playtime via `Duration`.

## Audit

The previous `plan.md` was a fan-out graph for work that has since landed. Treating it as the next execution order would dual-write files that already exist.

| Claim in the old plan | On disk now |
| --- | --- |
| Wave 1 still has to build the four-pack playground | `apps/docs` serves github, wakatime, rss, and http. `docs-full-catalog-playground` is archived. |
| Wave 2 still has to widen github, wakatime, and rss | `widen-github`, `widen-wakatime`, and `widen-rss` are archived. `widen-http` is still an open change. |
| Wave 2 still has to add `oauth-refresh` and `query-key` | Both are archived. Spotify and Steam clients exist. |
| Wave 3 still has to add spotify, leetcode, chess, and steam | All four packs, their widgets, and `chesscom` / `lichess` are in `FIRST_PARTY_*`. |
| Wave 3 still has to add Image, Heatmap, Board, Icon, Grid, List, and Time | All seven are in `BIT_EXPORTS` with sources and `/generate/bits` samples. |
| `readme-card-bits` is spec-only and must not land sources | Tasks 3.1–3.3 are checked and the sources exist. The change is still unarchived, and its spec still says W3-B-01 must not create those files. Do not re-apply that change. |
| DESIGN.md and `packages/bits/AGENTS.md` describe eleven bits | They described eleven after eighteen had shipped. This revision names the useful set as well. `packages/core/AGENTS.md` still describes the pre-elbow schema freeze; live `types.ts` is the catalog. |

What the old plan got right, and what this revision keeps:

- Same-file writers stay sequential. One implementer owns a node and its tests.
- OpenSpec before a new public id. This wave does not add a pack, widget, or integration id.
- Bits are a barrier. Packs do not invent private copies of a trend, a duration, or a table.
- Lock-auditor checks stay in force (below). They are not a reason to reopen landed dumps.

## Critique

The coarse plan under-counted two kinds of drift.

1. **It froze the graph after the code moved.** Rank tables still assigned `packages/integrations/src/github/**` and `packages/bits/src/Image.tsx` to future agents. A second writer on those trees would fight the landed clients and the landed bits.
2. **It stopped the vocabulary at seven names.** Image, Heatmap, Board, Icon, Grid, List, and Time cover covers, calendars, chess, marks, generic cells, title/meta rows, and absolute timestamps. They do not cover a series, a duration, a relative age, a signed change, a rank, a quote, a rail, an empty state, a captioned figure, a table, a stacked share, a two-sided split, a legend, a code line, a callout, a status dot, a rating, a one-row strip, a wrap, a ring, an avatar pile, a one-line pair, a banner, an eyebrow, or a status label. Widgets were starting to fake those with `Stat` and string concatenation. Steam recent rendered `1.5 h` as a `Stat` value and repeated the game name when hours were missing.

Refused, with the same reasons as before:

- `Dialog`, `Toast`, `Popover`, `Dropdown`, `Command` need portals, `document`, or `useEffect`.
- `Cover` is `Image`. `Avatar` stays the circle.
- New packs beyond live `FIRST_PARTY_PLUGIN_IDS` (Codeforces, AniList, Last.fm, and the rest of `backlog.md`).
- Flattened `plugin_<plugin>_<widget>_<option>` inputs.
- Unauthenticated GitHub, REST `/languages`, Playwright in the Action, tagging `v1` at `main`.
- `POST /api/preview` as a public embed API.

`Grid` still uses `display: grid`. Useful bits use flex so their marks do not depend on grid support in Takumi. Do not rewrite `Grid` in this wave; its tests lock `gridTemplateColumns`.

## Wave 4 — useful bits

Change id: `useful-bits`. One writer. Do not fan this wave across `packages/bits/src/index.ts`.

| Bit | Job | Not |
| --- | --- | --- |
| `Sparkline` | Column series scaled to the peak | `Bar` (one percent) |
| `Meter` | Track plus the numeric value. `max` default 100 | `Bar` (no value text) |
| `Duration` | `45s`, `1m 30s`, `1h 1m`, `1d 1h` from seconds | `Time` |
| `Relative` | Age of `value` against injected `now` | `Date.now()` inside the bit |
| `Delta` | Signed change. Positive accent, negative text, zero muted | `Stat` |
| `Ordinal` | `#12`. Invalid rank is an em dash | a raw string |
| `Quote` | Muted body and optional attribution | `Text` alone |
| `Timeline` | Dot, title, optional meta | `List` |
| `Empty` | Centered muted message. The widget owns the exact string | inventing `0` |
| `Figure` | Rectangular `Image` plus caption | `Avatar` |
| `Table` | Header and string cells | `Grid` |
| `StackBar` | One track, shares by value, accent toward muted | a column of `Bar`s |
| `Compare` | Two labels and a split track | two `Stat`s |
| `Legend` | Swatches using the same stops as `StackBar` | flavor hex |
| `Code` | Padded card block, radius 3 | a font-family outside the theme |
| `Callout` | 3px accent rule plus text | an overlay |
| `Dot` | Circle. Tone is accent, muted, border, or text | `Icon` |
| `Rating` | Star row, default 5 | a numeric `Stat` |
| `Strip` | One row of intensity cells | 7-row `Heatmap` |
| `Wrap` | Wrapping row, gap 8 | `Row` (no wrap) |
| `Ring` | Circled value, 2px accent stroke | `Stat` |
| `AvatarStack` | Overlapping circles and `+N` | one `Avatar` |
| `KeyValue` | Single-line label and value | stacked `Stat` |
| `Banner` | Full-width accent strip, `readableInk` | `Chip` |
| `Eyebrow` | Uppercase muted kicker | `Muted` without the case |
| `Status` | `Dot` plus a short label | a pill `Chip` |

Color rule: host `ThemePalette` only. No new hue, no `boxShadow`, no `react-dom`, no `document`.

Adoption on this branch uses the new bits where the dump already has the numbers: WakaTime `Duration` / `Sparkline` / `StackBar`, LeetCode solved `Meter` and `StackBar` beside `Stat`, GitHub contributions `Empty` and top-repos `Ordinal`, RSS `latest` `Relative` only when the caller passes a real `now`. Steam recent already uses `Duration`. Chess and Spotify stay on `Stat` / `Image` / `Board` because their view-models have no extra pair to draw.

Docs: `PREVIEW_BIT_IDS` and `/generate/bits` samples include the set. Samples are layout preview, not an embed API.

## File locks

| Lock | Owner |
| --- | --- |
| `packages/bits/src/<Useful>.tsx`, `index.ts`, `useful-bits.test.ts` | this wave |
| `apps/docs` bit sample list | this wave, after the barrel |
| `packages/plugins/src/steam/widgets/recent/widget.tsx` and steam `bitsUsed` | this wave |
| Frozen 11 sources | nobody |
| `packages/core/src/types.ts` `FIRST_PARTY_*` | nobody in this wave |
| `readme-card-bits` | do not re-apply |

## Verify

```bash
pnpm exec openspec validate --strict --type change useful-bits
pnpm exec vitest run packages/bits/src/useful-bits.test.ts packages/bits/src/index.test.ts scripts/useful-bits.test.ts packages/plugins/src/steam/plugin.test.ts apps/docs/src/generate/bit-samples.test.ts apps/docs/app/generate/bits/page.test.ts
```

Lock-auditor, still read-only:

- no `plugin_<plugin>_<widget>_<option>`
- no unauthenticated GitHub
- no REST `/repos/{owner}/{repo}/languages`
- no Playwright in `packages/action`
- GET `/api/preview` 405; POST is not an embed API
- never tag `v1` at `main`
- CLI `output_action` default `none`; Action default `commit`
- no `npx skills add`

## Left open

- Archive `useful-bits` when the deltas should become `openspec/specs/`. Until then the change folder is the delta and `packages/bits` is the code.
- `widen-http` is still open. Do not start it from this wave.
- `readme-card-bits` should be archived only after its “sources must not exist” requirement is reconciled with the files already on disk. Do not delete those files to satisfy the stale sentence.
- Marketplace listing stills, `release.yml` dispatch, and the live `@v1` pin stay human (`goals/e2e-refine/plans/marketplace-operator.md`).
- `packages/core/AGENTS.md` and the four-pack paragraphs in `DESIGN.md` still describe the pre-elbow catalog. Live ids are `packages/core/src/types.ts`. Updating that prose is a docs-honesty pass, not a new pack.
- Backlog packs stay backlog. A further bit name still needs OpenSpec. Do not grow `BIT_EXPORTS` silently past this set.
