## Why

Wave 3 reuse widgets add a dated `latest` card on the existing rss pack. Catalog id `latest` is already named (`elbow-catalog` / W3-T-01). Without a widget-contract for render behavior, the pack cannot complete that id: the feed leftover reader still drops recency (`updated`) and does not compose the Time bit. The widened `{ feed, items }` dump already has those fields.

## What Changes

- Complete existing widget id `latest` on pack `rss` (integration `rss` only). Do not mint a new catalog id. Do not edit `packages/core/src/types.ts`.
- `latest` consumes the cached rss feed+item dump. Include/limit stay widget-side. The widget MUST NOT perform HTTP. Feed and latest share one `RssClient` per run.
- Date-aware card using the Time bit: one item by default (`limit` 1–8, default 1). Time formats `updated` when present, otherwise `published_at`.
- Empty dump items render a “No latest item” card, not a crash. Card 480×160 svg baked still. `animate` is plumbed; gif/apng motion is not required.
- Pack defaults stay `feed`. `latest` is opt-in. Existing feed leftover reader and coding widgets stay.
- Finish `docs-full-catalog-playground` in place; do not rewrite that change id.
- Wave 2 already extended live `client.ts`. MUST NOT `author-integration add` github / wakatime / rss / http.

## Capabilities

### New Capabilities

- (none — `latest` is an existing catalog id; this change completes its widget contract)

### Modified Capabilities

- `widget-contract`: ADDED frozen `latest` options, Time-bit dated reader, dump slice, empty card, no HTTP, no flatten.
- `plugin-contract`: MODIFIED first-party rss pack widgets to `[feed, latest]`; defaults stay `[feed]`; no `plugin_rss` bool; no `plugin_rss_*` inputs.

## Impact

- Specs: deltas under this change only. Do not edit `openspec/specs/**` until archive. Do not rewrite `docs-full-catalog-playground`.
- Code (this node): `packages/plugins/src/rss/**` (`plugin.ts` registry plus `widgets/latest/**`) and exclusive tests. Do not edit `types.ts`, Action engine, `packages/bits`, or `packages/plugins/src/index.ts` (fan-in with sibling pack agents).
- Out of scope: playground / catalog eight-widget expansion, flattened `plugin_*_*_*`, tagging `v1` at `main`, unauthenticated GitHub, REST `/languages`, Playwright in the Action, `POST /api/preview` as an embed API, `npx skills add`, git commit.
