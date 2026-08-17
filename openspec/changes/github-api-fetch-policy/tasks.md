## 1. T111a cache

- [ ] 1.1 Implement `packages/integrations/src/github/cache.ts`: run-scoped request cache. REST key MUST be `(method, url, params)`. GraphQL key MUST be `(query, variables)` and MUST NOT be `POST /graphql` alone.
- [ ] 1.2 Add mocked unit tests that identical REST pages coalesce once and that two GraphQL operations with different `query`/`variables` do not share a cache entry.

## 2. T111b capabilities

- [ ] 2.1 Implement `packages/integrations/src/github/capabilities.ts`: derive `canPrivate`, `canContributions`, `canGist`, and token class from probe payload. No HTTP crawl in this file.
- [ ] 2.2 Add tests: probe login ≠ configured `user` ⇒ public REST only and `include_private` / `contributions` unavailable (do not render `0`). Reuse core auth-policy; do not fork a second matrix.

## 3. T111c rate-limit

- [ ] 3.1 Implement `packages/integrations/src/github/rate-limit.ts`: HTTP 403 secondary/abuse and HTTP 429 are fail-after-backoff; GraphQL HTTP 200 with `errors[]` and/or remaining 0 is fail-after-backoff (not skip-widget).
- [ ] 3.2 Add tests for 403 secondary/abuse, 429, GraphQL 200+`errors[]`, and remaining 0. Fixture user `octocat`; no live GitHub.

## 4. T111d rest

- [ ] 4.1 Implement `packages/integrations/src/github/rest.ts`: coalesce `GET /users/{login}` plus paginated `/repos?type=owner&per_page=100` through the T111a cache; filter forks/archived first (unless include options), then cap 500; same ordered id list for stars. Every request MUST include `Authorization`. FORBIDDEN: identity probe (T111e), REST `/languages`, GraphQL.
- [ ] 4.2 When `include_private` and `canPrivate` and probe login equals `user`, list private-capable owner repos via authenticated owner listing (`GET /user/repos?type=owner&per_page=100`). When `include_private` is false, use public `GET /users/{login}/repos`.
- [ ] 4.3 Add tests: filter-then-cap 500 (cap-before-filter forbidden); mid-pagination `/repos` failure fails stats and languages together; empty token does not send unauth; never call REST `/languages`.

## 5. T111e client

- [ ] 5.1 Implement `packages/integrations/src/github/client.ts`: one identity probe per run (`GET /user`, or GraphQL `viewer { login }` as equivalent — not both); wire cache, capabilities, rate-limit, and rest. Empty/`""`/whitespace token MUST fail the job before any request (core auth-policy). FORBIDDEN: `graphql.ts`.
- [ ] 5.2 Map HTTP outcomes: 401 fails the run; 404 user fails the widget; `include_private: true` without `canPrivate` fails that widget (not a silent public chart).
- [ ] 5.3 Add tests: one probe; empty token sends zero requests; 401 fail run; 404 fail widget; `include_private` + installation/`canPrivate` false fails widget. Mock HTTP only.

## 6. T112 graphql

- [ ] 6.1 Implement `packages/integrations/src/github/graphql.ts`: language bytes via `nodes(ids:)` batches of 100 using the REST-ordered ids, with `languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }`. NEVER 500 per-repo GraphQL. NEVER paginate `repositories(first: 100)` as a second independent 500.
- [ ] 6.2 Issue a separate `contributionsCollection` query iff `canContributions`; omit it otherwise. Log `rateLimit.cost` on every GraphQL response (nodes batches and contributions). Key cache by `(query, variables)`.
- [ ] 6.3 Add tests: batches of 100; GraphQL 200+`errors[]` fail-after-backoff; contributions omitted without capability; `rateLimit.cost` logged; no REST `/languages`. Depends on T111e.
