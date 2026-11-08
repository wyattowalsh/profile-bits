# Workstream: github-reuse-widgets

Wave 3 on existing github pack. OpenSpec new widget ids. Reuse widened github cache. Not a new integration.

## Files

- `packages/plugins/src/github/plugin.ts`, `widgets/`
- `packages/core/src/types.ts` `FIRST_PARTY_WIDGET_IDS` after OpenSpec
- pack `bitsUsed`

## Widgets

- `top-repos` from owner crawl (stars/forks list already fetched)
- contribution `heatmap` after Heatmap bit (calendar dump from widen-github)

Do not reuse widget id `stats`. `author-widget` extend, do not overwrite complete schema.

## Verify

- Widgets declare integration `github` only
- No new HTTP in widget fetch
- `just generate-docs --check` after new option schemas

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W3-GR-01 | 3 | B-09, W2-G-06, W3-T-01 |
| W3-GR-02 | 3 | B-09, W2-G-06, W3-T-01 |
