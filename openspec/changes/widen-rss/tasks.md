## 1. OpenSpec artifacts (W2-RSS-01)

- [x] 1.1 Exclusive: `openspec/changes/widen-rss/proposal.md`. Cache is feed+item dump; leftover triple is the feed widget reader. Finish `docs-full-catalog-playground` in place (do not rewrite that change). No flatten (`plugin_*_*_*`, `plugin_rss_feed_url`). No `author-integration add` for github/wakatime/rss/http.
- [x] 1.2 Exclusive: `openspec/changes/widen-rss/design.md`. Dump shape `{ feed, items }`; SSRF/1MiB/no GitHub hosts stay; live `client.ts` later; this node does not edit `packages/integrations/src/rss/**`.
- [x] 1.3 Exclusive: `openspec/changes/widen-rss/specs/integration-contract/spec.md`. REMOVED leftover frozen item list as cache schema. ADDED feed+item dump (id, content/summary, authors, categories, updated, enclosures, feed metadata). Parser HTTP helper still forbidden.
- [x] 1.4 Exclusive: `openspec/changes/widen-rss/specs/widget-contract/spec.md`. MODIFIED frozen feed widget: leftover `{ title, url, published_at }` is the reader; extra dump fields not required to render; slice dump `items` to `limit`.
- [x] 1.5 `pnpm exec openspec validate --strict --type change widen-rss`. Do not archive. Do not edit `openspec/specs/**`.

## 2. Tests (W2-RSS-01)

- [x] 2.1 Exclusive: `scripts/widen-rss.test.ts`. Assert change files name the dump, keep the leftover triple as the feed widget reader, keep SSRF/1MiB/no GitHub hosts, forbid `plugin_*_*_*`, forbid `author-integration add` of live dests, and do not rewrite `docs-full-catalog-playground`.

## 3. Later apply (not this node)

- [x] 3.1 W2-RSS-02: type feed+item dump on live `packages/integrations/src/rss` parse/client payload types. Extend live `client.ts`. Do not `author-integration add` rss.
- [x] 3.2 W2-RSS-03: parser maps dump fields from existing fixtures. SSRF unchanged. MUST NOT call a parser HTTP helper.
- [x] 3.3 W2-RSS-04: fixtures expose content/id the leftover triple dropped.
- [x] 3.4 W2-RSS-05: feed widget reads `{ title, url, published_at }` from the dump and MAY still render title/url/date. Slice `items` to `limit`.
- [x] 3.5 W2-RSS-06: dump tests plus existing SSRF tests. Atom content/id present. Do not commit. Do not tag `v1` at `main`. Do not run `npx skills add`.
