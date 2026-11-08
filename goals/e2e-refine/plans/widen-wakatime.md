# Workstream: widen-wakatime

Wave 2. Extend live wakatime client. Requires rewriting the leftover spec “totals plus requested include slices” so the **cache** is the dump and the **coding widget** still applies include/limit.

## Files

- `packages/integrations/src/wakatime/{client,payload,cache,http}.ts`
- `packages/integrations/src/wakatime/fixtures/last_7_days.json`
- `packages/plugins/src/wakatime/widgets/coding/**`
- `packages/core/src/wakatime-schema.ts`

## Steps

1. Zod-parse full stats `data` (passthrough or explicit): daily averages, best_day, categories, machines, dependencies, range metadata, per-slice `percent`/`text`/`digital`.
2. Stop calling `selectCodingPayload` inside `fetchStats`. Cache the unsliced dump. Widget applies include/limit.
3. Extra allowed authenticated endpoints, same Basic auth: `all_time_since_today`, bounded `summaries`, `statusbar/today`, `goals`. Insights: omit on 402/403. Skip heartbeats/durations.
4. Never `?api_key=`, never Bearer for the key, never email in the model, never unauth scrape.
5. Wakapi: stats path stays; extra endpoints Cloud-first, 404 omit not fail_job.

## Verify

- Fixture `percent`/`text` survive parse
- Coding widget with include `[languages]` omits editors in **render** but cache still has them
- Pack-on empty `wakatime_token` still `fail_job`

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W2-WK-01 | WK0 | — |
| W2-WK-02 | WK1 | WK-01 |
| W2-WK-03 | WK2 | WK-02 |
| W2-WK-04 | WK2 | WK-02 |
| W2-WK-05 | WK3 | WK-03, WK-04 |
| W2-WK-06 | WK4 | WK-05 |
