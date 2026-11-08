## Context

See `proposal.md` Why. Widget id `latest` and `LatestOptionsSchema` already live in `packages/core/src/types.ts` (W3-T-01). Time bit already lives at `packages/bits/src/Time.tsx` (W3-B-08) and is in `BIT_EXPORTS` (W3-B-09). W2-RSS-06 landed the frozen `{ feed, items }` dump on live `client.ts`. This node completes the rss pack card.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Vitest 4, Biome 2.5.
Same-file exclusive: `openspec/changes/rss-latest/**`, `scripts/rss-latest.test.ts`, and `packages/plugins/src/rss/**`. Do not edit `packages/core/src/types.ts`, `packages/action/**`, `packages/bits/**`, `packages/plugins/src/index.ts`, `openspec/specs/**`, or `openspec/changes/docs-full-catalog-playground/**`.
Never unauthenticated GitHub. Never REST `/languages`. No `plugin_*_*_*`. No Playwright in the Action. Do not run `npx skills add`. Do not commit. Do not tag `v1` on `main`. Wave 2 MUST NOT `author-integration add` github / wakatime / rss / http.

## Goals / Non-Goals

**Goals:**

- Contract + implementation for rss `latest`: dated card using Time, dump reader, shared client, empty card.
- Register `latest` on `rssPlugin.widgets` without changing pack defaults (`feed`).
- Union Time into pack-level `RSS_BITS_USED`.

**Non-Goals:**

- Appending `FIRST_PARTY_*` (already done).
- Rewriting `docs-full-catalog-playground` or playground eight-widget lists.
- Action engine / `packages/plugins/src/index.ts` fan-in (sibling pack agents).
- `author-integration add` of live dests.
- Flattened Action inputs, extra pack bools, new first-party plugin ids.

## Decisions

### 1. Complete the existing `latest` id; do not mint another

- **Choice:** Change id `rss-latest` specifies render behavior for catalog id `latest`. Pack agents MUST NOT edit `types.ts`.
- **Why:** Facts: new ids are OpenSpec-first; elbow-catalog already named `latest`; W3-T-01 is the single types writer.
- **Alternative:** A second widget id (`headlines`, `rss-headlines`) — rejected; catalog already maps `latest` → `rss`.

### 2. Time bit is the date chrome; leftover triple is not enough

- **Choice:** Each visible row is title (`Text`) plus Time. Time `value` is dump `updated` when present, otherwise `published_at`. Optional render `timezone` is passed through; Time defaults to UTC.
- **Why:** Plan: “rss `latest` + Time bit”. Feed may still render title/url/date without Time. Latest is the dated card.
- **Alternative:** `List` `meta` string — rejected; would skip the Time bit this node must compose.

### 3. Recency sort then `limit`; client still dumps everything

- **Choice:** Widget copies dump `items`, orders by `updated ?? published_at` descending (stable), then slices to `limit` (1–8, default 1). Missing dates sort last. The rss client MUST NOT drop dump fields.
- **Why:** “latest” means most recent dated entries, not “first N of parser order”. Include/limit stay widget-side (same leftover-vs-dump split as feed).
- **Alternative:** Reuse feed’s unsorted `slice(0, limit)` — rejected; a chronological RSS 2.0 feed would show the oldest item as “latest”.

### 4. One shared `RssClient` per run; widget never HTTP

- **Choice:** `latest` calls `client.fetchFeed(url)` on the same run-scoped client as `feed`. Cache/single-flight stays in integrations. Widget modules MUST NOT `fetch(`.
- **Why:** Plan verify: “One client per run still shared”. Same URL from feed + latest is one GET.
- **Alternative:** A second rss client inside the widget — rejected; would break single-flight and duplicate SSRF.

### 5. Empty copy is “No latest item”; feed copy stays

- **Choice:** Empty dump `items` (or empty slice) renders “No latest item”. Feed still renders “No feed items”.
- **Why:** Distinct cards. Do not crash. `0` / missing dates on a present item still render the title.
- **Alternative:** Reuse “No feed items” — rejected; two widgets would share empty copy and hide which card failed.

### 6. Exclusive files stay inside the rss pack + this change

- **Choice:** Implement under `packages/plugins/src/rss/widgets/latest/` plus `plugin.ts` / `plugin.test.ts`. Do not dual-write Action engine, plugins barrel, bits, or types.
- **Why:** Wave 3 pack panel shares `engine.ts` / `packages/plugins/src/index.ts` with GR/WK/SP/LC/CH/ST. Same-file exclusive.
- **Alternative:** Wire Action now — rejected; collides with sibling implementers.

## Risks / Trade-offs

- [Yaml `plugins.rss` still requires `widgets.feed.url` (W3-T-01 `RssWidgetsConfigSchema`)] → latest is optional beside required feed. Do not retouch types.ts.
- [Action engine still handles only `feed`] → yaml may parse `latest` while this node’s render API is pack-local until a later fan-in. Tests lock the pack registry and dump reader.
- [Takumi SVG is outlined glyphs] → assert Time via `fromJsx` text nodes, not SVG string match.

## Migration Plan

Land unarchived. Targeted vitest on `packages/plugins/src/rss/**` plus `scripts/rss-latest.test.ts`. Rollback is deleting this change and the latest widget dir, restoring `rssPlugin.widgets` to `["feed"]`. Do not archive from this node. Do not edit `openspec/specs/**`.

## Open Questions

None. Time bit path is `@profile-bits/bits`. Dump path is live `RssClient.fetchFeed`.
