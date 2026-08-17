## Why

`integration-contract` already forbids unauthenticated GitHub and sketches REST-then-`nodes(ids:)` crawl, but Wave 1 still lacks a dedicated fetch-policy spec for the github client: one capability probe, filter-then-cap 500, GraphQL batching, cache keys, skip/fail HTTP matrix, and `rateLimit.cost` logging. Without that lock, T111*/T112 can still invent REST `/languages`, 500 per-repo GraphQL calls, or skip-widget on GraphQL 200+`errors[]`.

## What Changes

- Add capability `github-api-fetch-policy`: the GitHub integration fetch contract (probe, REST crawl, GraphQL `nodes(ids:)`, cache, HTTP matrix, rate-limit cost).
- Reference — do not contradict — existing never-unauth and empty/`""`/whitespace token fail-job rules from `integration-contract` / `action-public-api`.
- Lock one identity probe per run (`GET /user` or GraphQL `viewer { login }`) for capability only (`canPrivate`, `canContributions`, `canGist`). Data queries stay `GET /users/{login}` plus paginated owner repos.
- Lock REST crawl: `GET /users/{login}` + paginated `/repos?type=owner&per_page=100`; **filter forks/archived first, then cap 500**; stars and language bytes share that ordered id list.
- Lock GraphQL: `nodes(ids:)` batches of 100 with `languages(first: 10, orderBy: { field: SIZE, direction: DESC })`. NEVER REST `/languages`. NEVER 500 per-repo GraphQL. Separate `contributionsCollection` iff `canContributions`.
- Lock cache keys: REST `(method, url, params)`; GraphQL `(query, variables)` — not `POST /graphql` alone.
- Lock HTTP matrix: 401 fail run; 403 secondary/abuse fail-after-backoff; 404 user fail widget; 429 fail-after-backoff; GraphQL 200+`errors[]` / remaining 0 fail-after-backoff; mid-pagination REST failure fails stats+languages together; `include_private` without `canPrivate` fails that widget.
- Lock logging of GraphQL `rateLimit.cost`.

This change is planning only. Do not implement `packages/**`. Do not rewrite `integration-contract`, `widget-contract`, or `plugin-contract`.

## Capabilities

### New Capabilities

- `github-api-fetch-policy`: GitHub fetch implementation contract — never-unauth reference, one capability probe, REST filter-then-cap 500, GraphQL `nodes(ids:)` language bytes, forbidden REST `/languages` and per-repo GraphQL, cache keys, skip/fail HTTP matrix, `include_private` fail-closed, and `rateLimit.cost` logging.

### Modified Capabilities

- (none — `integration-contract` already states the high-level crawl and skip/fail matrix; this change ADDED-specs fetch details as a dedicated capability so archive stays clean. Do not MODIFIED-delta `plugin-contract`, `widget-contract`, or `integration-contract`.)

## Impact

- Specs: new `openspec/specs/github-api-fetch-policy/spec.md` after archive/sync. No edits to `plugin-contract`, `widget-contract`, `integration-contract`, or `action-public-api` in this change.
- Code (later, not this change): `packages/integrations` github client split as T111a `cache.ts`, T111b `capabilities.ts`, T111c `rate-limit.ts`, T111d `rest.ts`, T111e `client.ts`, T112 `graphql.ts`. Widgets remain no-HTTP consumers of the cached payload.
- Out of scope: `packages/**` implementation, `action-yml-public-api` edits, `docs-playground`, `author-plugin`, `marketplace-release`, extra first-party plugins, archiving, git commit, plan/README edits.
