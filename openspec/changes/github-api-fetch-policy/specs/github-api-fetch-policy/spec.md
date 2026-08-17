## Purpose

Defines the GitHub integration fetch contract: one capability probe, authenticated REST crawl with filter-then-cap 500, GraphQL `nodes(ids:)` language bytes, request cache keys, skip/fail HTTP matrix, and `rateLimit.cost` logging.

## ADDED Requirements

### Requirement: Never unauthenticated GitHub requests
The github integration MUST NEVER send a REST or GraphQL request without `Authorization`. Empty, `""`, or whitespace `github_token` MUST be treated as missing. A missing Action token MUST fail the job before any GitHub request is sent. This requirement references — and MUST NOT contradict — the never-unauth and empty-token fail-job rules in `integration-contract` and `action-public-api`. Unauthenticated 60 requests/hour per IP MUST NEVER be used. `auth: optional` MUST NOT mean unauthenticated access.

#### Scenario: Every GitHub request has Authorization
- **WHEN** the github integration performs REST or GraphQL
- **THEN** every request MUST include `Authorization` and MUST NOT fall back to unauthenticated access

#### Scenario: Empty token fails before any request
- **WHEN** `github_token` is empty, `""`, or whitespace
- **THEN** the Action MUST fail the job and MUST NOT send any GitHub request

### Requirement: One identity probe for capability only
The system MUST perform exactly one identity probe per run: REST `GET /user` or GraphQL `viewer { login }`. The probe MUST be used for capability only (`canPrivate`, `canContributions`, `canGist`, and token class). Data queries MUST NOT use `GET /user` as the stats/languages source; they MUST use `GET /users/{login}` / GraphQL `user(login:)`. If probe login does not equal the configured `user`, the run MUST use public REST only; `include_private` and `contributions` MUST be unavailable and MUST NOT render as `0`.

#### Scenario: Probe is capability only
- **WHEN** a github integration run starts with a non-empty token
- **THEN** the system MUST issue one `GET /user` or `viewer { login }` probe and MUST NOT treat that probe response as the stats or languages payload

#### Scenario: Probe login mismatch disables private and contributions
- **WHEN** the identity probe login does not equal the configured `user`
- **THEN** the run MUST use public REST only and MUST treat `include_private` and `contributions` as unavailable without rendering `0` for those fields

### Requirement: REST user and owner-repo crawl
Stats and languages MUST start from REST `GET /users/{login}` plus paginated `GET /users/{login}/repos?type=owner&per_page=100`. When `include_private` is true and `canPrivate` is true, the owner-repo listing MUST include private repositories the token can read (authenticated owner listing, still `type=owner&per_page=100`). When `include_private` is false, the listing MUST be public owner repositories only. The system MUST coalesce these REST calls through the run-scoped cache. The system MUST NEVER call REST `/repos/{owner}/{repo}/languages`.

#### Scenario: Public owner crawl endpoints
- **WHEN** github widgets need owner repositories and `include_private` is false
- **THEN** the system MUST call `GET /users/{login}` and paginated `GET /users/{login}/repos?type=owner&per_page=100`

#### Scenario: Private owner listing only with capability
- **WHEN** `include_private` is true and `canPrivate` is true
- **THEN** the owner-repo crawl MUST include private repositories the token can read, still paginated at `per_page=100` with `type=owner`

### Requirement: Filter forks and archived then cap 500
After the owner-repo listing is retrieved, the system MUST filter forks and archived repositories first unless the widget options set `include_forks` or `include_archived` respectively, then MUST cap the remaining list at **500** repositories. The system MUST NOT cap at 500 before applying those filters. Stars and language bytes MUST use that same ordered repository id list.

#### Scenario: Filter then cap 500
- **WHEN** the owner repo list is crawled
- **THEN** forks and archived repos MUST be filtered first (unless the matching include option is true) and the remaining list MUST be capped at 500 before stars or language bytes are computed

#### Scenario: Cap before filter is forbidden
- **WHEN** more than 500 owner repositories exist including forks or archived
- **THEN** the system MUST NOT keep fork or archived ids in the capped 500 solely because they appeared earlier in pagination

#### Scenario: Stars and languages share ordered ids
- **WHEN** stats stars and languages bytes are computed in the same run
- **THEN** both MUST use the same ordered repository id list produced by the filter-then-cap crawl

### Requirement: GraphQL nodes ids language bytes
Language bytes MUST be loaded via GraphQL `nodes(ids:)` in batches of 100 using the REST-ordered ids. Each batch MUST request `languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }`. The system MUST NEVER issue 500 per-repo GraphQL calls. The system MUST NOT paginate `repositories(first: 100)` as a second independent 500. Language bytes MUST come from those GraphQL sizes, not REST `repo.language` counts.

#### Scenario: GraphQL nodes ids batches of 100
- **WHEN** language bytes are fetched
- **THEN** the system MUST call GraphQL `nodes(ids:)` in batches of 100 with `languages(first: 10, orderBy: { field: SIZE, direction: DESC })` and MUST NOT issue one GraphQL call per repository

#### Scenario: Independent repositories pagination is forbidden
- **WHEN** language bytes are fetched
- **THEN** the system MUST NOT paginate GraphQL `repositories(first: 100)` as a second independent 500-repository list

### Requirement: REST languages endpoint is forbidden
The system MUST NEVER call REST `/languages` (`GET /repos/{owner}/{repo}/languages`) to obtain language data.

#### Scenario: REST languages endpoint is not called
- **WHEN** language data is needed
- **THEN** the system MUST NOT call REST `/repos/{owner}/{repo}/languages`

### Requirement: contributionsCollection only with capability
A separate `contributionsCollection` GraphQL query MUST run if and only if `canContributions` is true. When `canContributions` is false, that query MUST be omitted. Contributions MUST NOT be rendered as `0` when the query is omitted.

#### Scenario: contributionsCollection only with capability
- **WHEN** `canContributions` is true
- **THEN** the system MUST issue a separate `contributionsCollection` query; when `canContributions` is false that query MUST be omitted

### Requirement: Request cache keys
Languages and stats MUST share one run-scoped request cache. REST cache key MUST be `(method, url, params)`. GraphQL cache key MUST be `(query, variables)` — not `POST /graphql` alone. Duplicate identical REST or GraphQL requests in the same run MUST reuse the cached response.

#### Scenario: REST cache key is method url params
- **WHEN** a REST request is cached
- **THEN** the cache key MUST be `(method, url, params)`

#### Scenario: GraphQL cache key is query and variables
- **WHEN** a GraphQL request is cached
- **THEN** the cache key MUST be `(query, variables)` and MUST NOT be `POST /graphql` alone

#### Scenario: Identical REST requests coalesce
- **WHEN** stats and languages need the same `GET /users/{login}/repos` page in one run
- **THEN** the system MUST send that request once and MUST reuse the cached response

### Requirement: Skip and fail HTTP matrix
GitHub HTTP and GraphQL outcomes MUST follow this matrix. Fail-after-backoff MUST retry with backoff then fail the run (not skip the widget).

- Empty / `""` / whitespace token: fail the job (no request).
- HTTP 401: fail the run.
- HTTP 403 secondary rate limit or abuse detection: fail-after-backoff.
- HTTP 404 for the configured user: fail the widget.
- HTTP 429: fail-after-backoff.
- GraphQL HTTP 200 with `errors[]` and/or remaining 0: fail-after-backoff, not skip-widget.
- Mid-pagination REST `/repos` failure: fail stats and languages together (not a partial star total).

#### Scenario: 401 fails the run
- **WHEN** GitHub returns HTTP 401
- **THEN** the run MUST fail

#### Scenario: 403 secondary or abuse fails after backoff
- **WHEN** GitHub returns HTTP 403 for secondary rate limit or abuse detection
- **THEN** the run MUST fail-after-backoff (not skip the widget)

#### Scenario: 404 user fails the widget
- **WHEN** GitHub returns HTTP 404 for the configured user
- **THEN** that widget MUST fail

#### Scenario: 429 fails after backoff
- **WHEN** GitHub returns HTTP 429
- **THEN** the run MUST fail-after-backoff

#### Scenario: GraphQL HTTP 200 with errors or remaining 0 fails after backoff
- **WHEN** GraphQL returns HTTP 200 with `errors[]` and/or remaining 0
- **THEN** the run MUST fail-after-backoff and MUST NOT skip the widget

#### Scenario: Mid-pagination REST failure fails stats and languages
- **WHEN** a REST `/repos` page fails before pagination completes
- **THEN** both stats and languages MUST fail (not a partial star total)

### Requirement: include_private without canPrivate fails the widget
`include_private: true` without `canPrivate` MUST fail that widget. The system MUST NOT silently render a public chart and MUST NOT soft-warn.

#### Scenario: include_private true without canPrivate
- **WHEN** a github widget has `include_private: true` and `canPrivate` is false
- **THEN** that widget MUST fail (not a silent public chart)

### Requirement: Log GraphQL rateLimit cost
The system MUST log GraphQL `rateLimit.cost` for each GraphQL request, including `nodes(ids:)` batches and `contributionsCollection` when that query runs.

#### Scenario: nodes batch logs cost
- **WHEN** a GraphQL `nodes(ids:)` language batch completes
- **THEN** the system MUST log that response’s `rateLimit.cost`

#### Scenario: contributionsCollection logs cost
- **WHEN** a `contributionsCollection` query runs
- **THEN** the system MUST log that response’s `rateLimit.cost`
