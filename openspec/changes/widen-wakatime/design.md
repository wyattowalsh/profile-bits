## Context

See `proposal.md` Why. Today `fetchStats` caches the stats envelope by
`(method, url, params)` then calls `selectCodingPayload` with yaml
`include`/`limit` before return. The leftover OpenSpec
`wakatime payload is totals plus requested include slices` requires that
slice. Fixture `last_7_days.json` already has `languages`, `editors`,
`projects`, and `operating_systems`, but Zod drops `percent` / `text` /
`best_day` / `categories` / `machines`.

Constraints: Node 24, pnpm, OpenSpec 1.9.0. Thin Action. No
`plugin_*_*_*`. Never unauthenticated GitHub. Never REST `/languages`.
Same-file exclusive: this node writes only
`openspec/changes/widen-wakatime/**` plus `scripts/widen-wakatime.test.ts`.
W2-WK-02 owns payload types; W2-WK-03 extra endpoints; W2-WK-04 fixtures;
W2-WK-05 the coding widget reader; W2-WK-06 tests. Do not rewrite
`docs-full-catalog-playground`. Do not edit live `client.ts` here.

## Goals / Non-Goals

**Goals:**

- Land an OpenSpec-first rewrite so the wakatime cache is the unsliced
  stats `data` dump and include/limit is the coding widget reader.
- Name extra authenticated endpoints, RFC Basic, no email/key in the
  model, Wakapi extra 404 omit, skip heartbeats/durations.

**Non-Goals:**

- Implementing payload Zod, extra HTTP, fixtures, or the widget reader
  in this node (W2-WK-02…05).
- New widget ids (wakatime slice cards are W3-WK-01, not `stats`).
- `author-integration add` for github / wakatime / rss / http.
- Flattened Action inputs, tagging `v1` at `main`, Playwright in the
  Action, `npx skills add`, git commit, treating `POST /api/preview` as
  an embed API.
- Changing the stats path split, SSRF `api_domain` gates, or the stats
  HTTP matrix (401 `fail_run`; stats 404 `fail_widget`).

## Decisions

### 1. REMOVED leftover + ADDED dump (do not keep the leftover heading)

- **Choice:** REMOVED `wakatime payload is totals plus requested include
  slices`. ADDED `wakatime cache is the full stats data dump`.
- **Why:** MODIFIED under the leftover heading would archive a dump
  contract still named “totals plus requested include slices”.
- **Alternative:** MODIFIED in place — rejected; heading would lie.
  Alternative: RENAMED only — rejected; behavior also changes.

### 2. Include/limit moves to widget-contract, not fetch

- **Choice:** ADDED `Coding include/limit is the widget reader`. Frozen
  coding yaml options stay (`include` default `[languages, editors]`,
  `limit` 8). Fetch does not take those filters as a reason to drop
  cache fields.
- **Why:** Facts: include/limit stay on the coding widget. Wave 3 slice
  cards reuse the dump.
- **Alternative:** Keep `selectCodingPayload` inside `fetchStats` —
  rejected; that is the leftover. Alternative: new widget id `stats` —
  rejected; coding stays `coding`.

### 3. Extra endpoints are Cloud-first omit-on-404

- **Choice:** Allowed extras: `all_time_since_today`, bounded
  `summaries`, `statusbar/today`, `goals`. Insights omit on 402/403.
  Heartbeats/durations never fetched (PII / volume; backlog). Wakapi
  extra 404 omits, not `fail_job`. Stats path split unchanged.
- **Why:** Workstream steps 3–5. Stats 404 stays `fail_widget`.
- **Alternative:** Fail the job when Wakapi lacks extras — rejected.
  Alternative: fetch heartbeats — rejected (backlog).

### 4. RFC Basic stays; email and keys never enter the model

- **Choice:** `Authorization: Basic base64(api_key + ":")`. Never
  Bearer for the key, never `?api_key=` / `?key=`, never email as
  username, never email/key in dumps, logs, or cache keys.
- **Why:** Already in `packages/integrations/AGENTS.md`. Leftover spec
  only said “Authorization” without Basic vs Bearer.
- **Alternative:** Reuse http-optional Bearer — rejected.

### 5. This node is spec + lock tests only

- **Choice:** Exclusive files are this change tree plus
  `scripts/widen-wakatime.test.ts`. Later ranks apply `client.ts`.
- **Why:** Pipeline is spec → payload → extras → fixtures → reader →
  tests. Same-file exclusive with W2-WK-02 on `payload.ts`.
- **Alternative:** Implement Zod in this node — rejected; dual-write.

## Risks / Trade-offs

- [Coding callers still pass include/limit into `fetchStats`] → W2-WK-02
  stops `selectCodingPayload` inside fetch; W2-WK-05 keeps the reader on
  the dump. Spec forbids fetch-side drops even if the function still
  accepts the args until that apply.
- [Wakapi missing extras] → omit, not `fail_job`; stats still render.
- [Insights paywall 402] → omit, not the stats `fail_after_backoff`
  403 path.
- [Archive heading drift] → REMOVED + ADDED so main spec does not keep
  the leftover name.

## Migration Plan

- Spec-only until W2-WK-02. Apply in rank order: payload types, extra
  endpoints, fixtures (`percent`/`text` survive), coding widget reader,
  pack-on empty token tests.
- Archive after apply. Do not archive from this node. Do not edit
  `openspec/specs/**` until archive.
- Rollback is deleting this in-flight change; main specs are untouched
  until archive.

## Open Questions

- (none — extra endpoint list, Basic auth, and widget-side include/limit
  are in facts.md / widen-wakatime.md)
