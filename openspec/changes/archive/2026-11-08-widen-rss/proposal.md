## Why

The rss cache is leftover-shaped: a frozen array of `{ title, url, published_at }`. Wave 2 dumps every planned integration’s available source data into the typed cache; widgets only read that cache. The leftover triple belongs on the **feed widget**, not the cache schema. Without this delta, later `latest` / Time cards cannot reuse id, content, authors, categories, updated, or enclosures, and Atom fixtures that carry those fields keep dropping them at parse.

## What Changes

- Rss cached payload becomes a frozen **feed + item dump**: feed metadata (`title`, `link`, `description`, `updated`, `authors`, `categories`, `image`) plus items (`id`, `title`, `url`, `published_at`, `updated`, `content` / `summary`, `authors`, `categories`, `enclosures`).
- The leftover frozen triple `{ title, url, published_at }` becomes the **feed widget reader**. The widget still slices dump `items` to `limit` and MAY still render title / url / date. Extra dump fields MUST remain in cache even when `feed` does not draw them.
- Parser stays rss-parser **or equivalent** on an already-fetched XML string. MUST NOT use any parser HTTP/fetch helper.
- SSRF, 1 MiB body cap, no GitHub-owned hosts, no URL userinfo, auth `none`, and the HTTP skip/fail matrix stay. Do not add an Action token input. Do not flatten `plugin_rss_*`.
- Wave 2 MUST extend live `packages/integrations/src/rss/client.ts`. MUST NOT `author-integration add` github / wakatime / rss / http.
- No new first-party plugin, widget, or integration id in this change (`latest` stays Wave 3). `POST /api/preview` remains layout preview, not a public embed API.
- Finish `docs-full-catalog-playground` in place; do not rewrite that change id.

## Capabilities

### New Capabilities

- (none — dump vs leftover-triple is a delta on existing rss integration and feed widget contracts)

### Modified Capabilities

- `integration-contract`: REMOVED leftover “frozen item list” as the cache schema; ADDED feed+item dump (id, content/summary, authors, categories, updated, enclosures, feed metadata). Parser HTTP helper still forbidden. SSRF / 1 MiB / no GitHub hosts stay on existing fetch requirements.
- `widget-contract`: MODIFIED `feed` so the leftover `{ title, url, published_at }` triple is the widget reader on the dump. Empty dump items still render “No feed items”. Fetch-none stays.

## Impact

- Specs: deltas under this change only. Do not edit `openspec/specs/**` until archive. Do not rewrite `docs-full-catalog-playground` or `marketplace-release`.
- Code (later ranks, not W2-RSS-01): `packages/integrations/src/rss/{parse,client,cache}.ts`, rss fixtures, `packages/plugins/src/rss/widgets/feed/**`. This node writes OpenSpec artifacts plus exclusive contract tests.
- Out of scope: new widget `latest`, author-integration add of live dests, flattened `plugin_*_*_*`, tagging `v1` at `main`, unauthenticated GitHub, REST `/languages`, Playwright in the Action, `npx skills add`, git commit.
