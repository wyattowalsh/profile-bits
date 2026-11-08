# Workstream: html-scrape-client

Wave 2 shared primitive. Used by docs optional live scrape and by wave 3 sources with no JSON API.

## Files

- New module under `packages/integrations/src/` (https GET HTML, not a fifth pack)
- SSRF reuse from rss/http
- Fixtures + mocked HTTP tests
- Docs preview wiring in `render-preview.ts` (visitor URL only, SSRF)

## Steps

1. Fetch https HTML through existing SSRF (manual redirects, DNS pin, 1 MiB, no private IPs).
2. Parse with a Node HTML parser (not Playwright, not a browser). Extract typed fields into the integration dump.
3. Fixture-first. Login walls and ToS-hostile targets refuse.
4. Docs: fixtures default; optional live scrape of visitor https URL; POST still not an embed API; GET 405.

## Verify

- No `playwright` dependency in `packages/action` ncc graph
- SSRF denials match rss/http
- Mocked HTML fixture maps into a typed object

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W1-S-01 | 0 | — |
