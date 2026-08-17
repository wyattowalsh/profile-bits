## Context

See `proposal.md` Why. Three-layer specs are already synced (`plugin-contract`, `widget-contract`, `integration-contract`). `action-yml-public-api` is already proposed and MUST NOT be edited. `integration-contract` already forbids unauth, empty-token fail-job, REST-then-`nodes(ids:)`, filter-then-cap 500, and the skip/fail matrix at a high level. This change ADDED-specs fetch details as capability `github-api-fetch-policy` so T111a–e and T112 can implement against a dedicated contract without rewriting the three-layer model.

Constraints: never unauthenticated GitHub; `GITHUB_TOKEN` is 1,000 REST/h and 1,000 GraphQL points/h per repo; empty/`""`/whitespace token fails the job; widgets perform no HTTP; v0 first-party pack remains `github` only.

## Goals / Non-Goals

**Goals:**

- Make T111a `cache.ts`, T111b `capabilities.ts`, T111c `rate-limit.ts`, T111d `rest.ts`, T111e `client.ts`, and T112 `graphql.ts` implementable against a frozen fetch contract.
- Keep GraphQL language bytes inside the 1,000-point hour (~5 points for 500 repos via `nodes(ids:)`), not 500 per-repo calls.
- Keep skip/fail HTTP outcomes fail-closed (fail-after-backoff or fail widget/run), never skip-with-zeros for exhaustion or `include_private` without `canPrivate`.

**Non-Goals:**

- Implementing `packages/**`, applying, or archiving this change in the same workflow.
- Other OpenSpec changes (`action-yml-public-api` edits, `docs-playground`, `author-plugin`, `marketplace-release`).
- Rewriting `integration-contract` / `widget-contract` / `plugin-contract`.
- Extra first-party plugins, REST `/languages`, flattened Action inputs, or widget HTTP.

## Decisions

### 1. Dedicated capability, not an integration-contract rewrite

- **Choice:** New `github-api-fetch-policy` spec. Do not MODIFIED-delta `integration-contract`.
- **Why:** The three-layer contract already states crawl and skip/fail at archive-clean grain. Fetch details (`rateLimit.cost`, cache-key shape, probe-vs-data split, batch size) belong in a capability T111*/T112 can apply without mixing Marketplace or plugin-model concerns. Peak propose is 1.
- **Alternative:** MODIFIED-extend `integration-contract` in place — rejected; user asked to prefer a dedicated capability if that keeps archive clean.

### 2. Core auth-policy owns empty-token and include_private; integrations own HTTP

- **Choice:** Empty/`""`/whitespace token fail-job and `include_private` without `canPrivate` remain `packages/core` auth-policy. The github client MUST refuse to send a request without `Authorization` and MUST map HTTP/GraphQL outcomes to the spec matrix. Do not fork a second skip/fail table in integrations.
- **Why:** T030a already owns `auth-policy.ts`. Duplicating the matrix would drift from `integration-contract`.
- **Alternative:** Reimplement skip/fail inside `client.ts` — rejected.

### 3. REST crawl then GraphQL nodes(ids:), never REST /languages

- **Choice:** `GET /users/{login}` + paginated `/repos?type=owner&per_page=100`; filter forks/archived first (unless include options), then cap 500; GraphQL `nodes(ids:)` batches of 100 for language bytes. When `include_private` and `canPrivate` and probe login equals `user`, use authenticated owner listing (`GET /user/repos?type=owner&per_page=100`) so private repos are included. Never `GET /repos/{o}/{r}/languages`. Never 500 per-repo GraphQL. Never a second `repositories(first: 100)` pagination.
- **Why:** 500 language GraphQL calls would exhaust the 1,000-pt hour; REST `/languages` is N extra REST calls; capping before filter would mix fork ids into stars vs languages. `/users/{login}/repos` is public-only even with a PAT.
- **Alternative:** Per-repo GraphQL, REST `/languages`, or GraphQL `repositories` as a second 500 — rejected.

### 4. Module split matches T111a–e then T112

- **Choice:** Exclusive files under the github integration: `cache.ts` (T111a) → REST and GraphQL keys; `capabilities.ts` (T111b) capability flags with **no HTTP crawl**; `rate-limit.ts` (T111c) 403 secondary/abuse + GraphQL 200+`errors[]` / remaining 0; `rest.ts` (T111d) coalesce user+repos, filter-then-cap, never unauth — **FORBIDDEN** identity probe and `/languages`; `client.ts` (T111e) one probe + wire — **FORBIDDEN** `graphql.ts`; `graphql.ts` (T112) `nodes(ids:)` + separate `contributionsCollection`. Apply order: T111a∥T111b∥T111c, then T111d (needs cache + rate-limit), then T111e (needs capabilities + rest), then T112 (needs client).
- **Why:** Plan OWN globs. Probe in `rest.ts` would duplicate T111e. GraphQL in `client.ts` would block T112.
- **Alternative:** One `github.ts` file — rejected; false `[P]` and overlapping writers.

### 5. Cache keys are method/url/params and query/variables

- **Choice:** One run-scoped cache shared by stats and languages. REST key `(method, url, params)`. GraphQL key `(query, variables)` — never `POST /graphql` alone.
- **Why:** Stats stars and language bytes must share the same REST-ordered ids; two GraphQL operations share one endpoint.
- **Alternative:** Key GraphQL as URL only — rejected; contributions and `nodes` would collide or miss.

### 6. GraphQL 200 + errors[] is exhaustion, not skip

- **Choice:** HTTP 200 with `errors[]` or `rateLimit.remaining` 0 is fail-after-backoff, same family as 429 / secondary 403. Log `rateLimit.cost` on every GraphQL response.
- **Why:** Skipping would commit partial language cards that look complete. Cost logs prove the ~5-point budget.
- **Alternative:** Skip widget on GraphQL errors — rejected.

### 7. One REST identity probe; GraphQL viewer is equivalent

- **Choice:** T111e issues one `GET /user` probe by default. GraphQL `viewer { login }` is an allowed equivalent, not a second probe in the same run. Data path stays REST `GET /users/{login}`.
- **Why:** Capability vs data split is the lock; two probes waste the 1,000/h budget.
- **Alternative:** Probe plus `viewer` every run — rejected.

## Risks / Trade-offs

- [GraphQL point exhaustion on languages] → REST-ordered ids + `nodes(ids:)` batches of 100 (~5 pts for 500 repos), not 500 calls; log `rateLimit.cost`.
- [Cap-before-filter skews stars vs languages] → Filter forks/archived first, then cap 500 so both share ids.
- [Empty secret silently becomes unauth 60/h] → Fail job before any request; every request has `Authorization`.
- [Silent public chart when include_private lacks canPrivate] → Fail that widget; do not warn-and-render.
- [Partial repo pagination looks like a short star total] → Mid-pagination REST failure fails stats and languages together.
- [GraphQL HTTP 200 with errors looks successful] → Treat `errors[]` / remaining 0 as fail-after-backoff.
- [GET /users/{login}/repos misses privates] → Authenticated owner listing only when `include_private` and `canPrivate`.

## Migration Plan

Greenfield fetch policy. Apply later (new request): T111a–e then T112 under `packages/integrations` github client, mocked HTTP tests only. Archive/sync then copies `github-api-fetch-policy` into `openspec/specs/`. Widgets keep consuming the cached payload (T201/T202); they MUST NOT add HTTP.

Rollback: delete this change folder before archive; no production Action fetch exists yet.

## Open Questions

None. Probe-vs-data, filter-then-cap, `nodes(ids:)` batches, cache keys, HTTP matrix, `include_private` fail-closed, and `rateLimit.cost` logging are locked by the plan and this spec.
