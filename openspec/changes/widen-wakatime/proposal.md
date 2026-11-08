## Why

The leftover integration contract “totals plus requested include slices”
drops WakaTime dump fields at fetch. Include/limit runs in the client,
so the cache cannot keep `percent`, `best_day`, `categories`, `machines`,
or unrequested slices for later cards. Wave 2 must rewrite that leftover
so the **cache** is the unsliced stats `data` dump and the **coding
widget** is the include/limit reader.

## What Changes

- **BREAKING** (typed payload): remove leftover
  `wakatime payload is totals plus requested include slices`. Cache the
  full stats `data` object: daily averages, `best_day`, `categories`,
  `machines`, `dependencies`, range metadata, and per-slice `percent` /
  `text` / `digital` when the source returns them.
- Include/limit stay yaml options on widget `coding` (defaults
  `[languages, editors]` and `8`). They MUST run in the coding widget
  reader. Fetch MUST NOT drop unrequested slices.
- Extra allowed authenticated endpoints, same RFC Basic:
  `all_time_since_today`, bounded `summaries`, `statusbar/today`,
  `goals`. Insights: omit on 402/403. Skip heartbeats/durations.
- RFC Basic stays (`base64(api_key + ":")`). Never `?api_key=`. Never
  Bearer for the API key. Never email or API keys in the model.
- Wakapi: stats path stays; extra endpoints Cloud-first; extra 404 omit,
  not `fail_job`. Pack-on empty `wakatime_token` still `fail_job`. Never
  unauthenticated scrape.
- Wave 2 extends live `packages/integrations/src/wakatime/client.ts`.
  MUST NOT `author-integration add` github / wakatime / rss / http.
- No new first-party widget ids (slice cards are later). No flattened
  `plugin_<plugin>_<widget>_<option>` inputs. Do not rewrite
  `docs-full-catalog-playground`. `POST /api/preview` is not a public
  embed API.

## Capabilities

### New Capabilities

- (none — dump vs widget-reader is a rewrite of existing wakatime
  contracts, not a fifth pack)

### Modified Capabilities

- `integration-contract`: REMOVED leftover sliced payload; ADDED unsliced
  stats dump, extra authenticated endpoints, RFC Basic lock, no
  email/key in the model.
- `widget-contract`: ADDED coding include/limit as the widget reader
  (render filters the dump; cache keeps unrequested slices).

## Impact

- Specs: deltas under this change only. Do not edit `openspec/specs/**`
  until archive. Do not rewrite `docs-full-catalog-playground`.
- This node: OpenSpec artifacts plus `scripts/widen-wakatime.test.ts`.
  Do not edit live `packages/integrations/src/wakatime/client.ts` (W2-WK-02+).
  Do not edit `packages/plugins/src/wakatime/**` (W2-WK-05). Do not edit
  `packages/core/src/wakatime-schema.ts`. Do not run `author-integration add`.
- Later (not this node): W2-WK-02 payload Zod; W2-WK-03 extra endpoints;
  W2-WK-04 fixtures; W2-WK-05 coding widget reader; W2-WK-06 tests.
  Wave 3 slice cards reuse the dump under new widget ids, not `stats`.
