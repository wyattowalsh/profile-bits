# Workstream: leetcode

Wave 3 elbow #2. Auth none. POST GraphQL (not http json). Heatmap + solved widgets.

## Data

Dump public profile, contest ranking, submission calendar, recent AC. Complete GraphQL fields into the typed cache.

## Risk

GitHub Actions IPs may hit Cloudflare 403. Fixtures default; `fail_widget` on CF; HTML scrape only as documented fallback through SSRF; no Playwright; no community proxy.

## Files

- `packages/integrations/src/leetcode/`
- `packages/plugins/src/leetcode/`
- Heatmap bit must exist (readme-card-bits)

## Verify

- Mocked GraphQL fixture maps full payload
- 403 → fail_widget not fail_job
- No Authorization header

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W3-LC-01…05 | 3–7 | B-09, W3-T-01 |
