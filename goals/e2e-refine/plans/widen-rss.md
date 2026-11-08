# Workstream: widen-rss

Wave 2. Cache becomes feed+item dump. Frozen `{title,url,published_at}` becomes the **feed widget reader**, not the cache schema.

## Files

- `packages/integrations/src/rss/{client,parse,cache}.ts`
- `packages/plugins/src/rss/widgets/feed/**`
- rss fixtures under `packages/integrations/src/rss/fixtures/`

## Steps

1. Type feed metadata (title, link, description, updated, authors, categories, image).
2. Type items: id/guid, title, url, published_at, updated, content/summary, authors, categories, enclosure.
3. Keep SSRF, 1 MiB, no GitHub hosts, no URL userinfo, no parser HTTP helper.
4. Feed widget may still render title/url/date.

## Verify

- Atom fixture exposes content/id that the old triple dropped
- SSRF tests unchanged
- Feed render tests still pass

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W2-RSS-01 | R0 | — |
| W2-RSS-02 | R1 | RSS-01 |
| W2-RSS-03 | R2 | RSS-02 |
| W2-RSS-04 | R2 | RSS-02 |
| W2-RSS-05 | R3 | RSS-03, RSS-04 |
| W2-RSS-06 | R4 | RSS-05 |
