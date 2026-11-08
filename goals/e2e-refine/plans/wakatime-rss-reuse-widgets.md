# Workstream: wakatime-rss-reuse-widgets

Wave 3. Extra cards on existing packs from widened caches.

## WakaTime

Slice cards (`languages` / `editors` / `projects` / `os`) that share the stats dump. New widget ids (global; cannot be `stats`). Include/limit stay widget-side.

## RSS

`latest` (one item + date) and/or date-aware list using `Time` bit. Same XML dump.

## Files

- `packages/plugins/src/wakatime/**`, `packages/plugins/src/rss/**`
- types `FIRST_PARTY_WIDGET_IDS` after OpenSpec

## Verify

- One client per run still shared
- Feed/coding existing widgets still pass

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W3-WK-01 | 3 | B-09, W2-WK-06, W3-T-01 |
| W3-RS-01 | 3 | B-09, W2-RSS-06, W3-T-01 |
