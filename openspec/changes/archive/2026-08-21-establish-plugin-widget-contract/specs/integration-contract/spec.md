## Purpose

Defines reusable integrations, GitHub auth capability (never unauthenticated), the skip/fail matrix, and REST-then-`nodes(ids:)` languages crawl with filter-then-cap 500.

## ADDED Requirements

### Requirement: Integration is a reusable data source
An integration MUST have an id, auth (`none` | `optional` | `required`), `scopes[]`, inputs, and a client bound to run context. One client instance MUST be shared per Action or playground run by every widget that needs it. Auth MAY also be constrained per widget option.

#### Scenario: Shared client per run
- **WHEN** two widgets declare the same integration in one run
- **THEN** they MUST share one client instance for that integration

### Requirement: static integration needs no auth
Integration `static` MUST use auth `none`. It MUST serve fixture JSON. It MUST be usable by `demo` and tests. It MUST NOT call GitHub.

#### Scenario: static auth none
- **WHEN** a widget uses integration `static`
- **THEN** no Authorization header and no GitHub request MUST be sent

### Requirement: github integration never sends unauthenticated requests
Integration `github` auth MUST be token-class plus capability, not “optional means unauthenticated”. `auth: optional` MUST NOT send a request without `Authorization`. The Action MUST have a non-empty token or fail. Playground MUST use a GitHub App token or fixtures and MUST NEVER call GitHub unauthenticated. Unauthenticated 60 requests/hour per IP MUST NEVER be used.

#### Scenario: github request always has Authorization
- **WHEN** the github integration performs REST or GraphQL
- **THEN** every request MUST include `Authorization` and MUST NOT fall back to unauthenticated access

#### Scenario: Playground never unauthenticated
- **WHEN** the docs playground previews github widgets
- **THEN** it MUST use an App token or fixtures and MUST NOT send unauthenticated GitHub requests

### Requirement: Token classes and missing token
Token classes MUST be `actions_installation` | `user_pat` | `github_app_install`. Empty / `""` / whitespace `github_token` MUST be treated as missing. A missing Action token MUST fail the job. Default Actions `github_token` is `${{ github.token }}`, which MUST be treated as **1,000 REST requests/hour and 1,000 GraphQL points/hour per repo** (not 5,000). User PAT rate is 5,000/hour.

#### Scenario: missing token is never unauthenticated
- **WHEN** `github_token` is empty, `""`, or whitespace
- **THEN** the Action MUST fail the job and MUST NOT send unauthenticated requests

### Requirement: One identity probe for capability only
The system MUST perform one identity probe per run: REST `GET /user` or GraphQL `viewer { login }`, used for capability only (`canPrivate`, `canContributions`, `canGist`). Data queries MUST use `GET /users/{login}` / GraphQL `user(login:)`. If probe login ≠ configured `user`, the run MUST use public REST only; `include_private` and `contributions` MUST be unavailable and MUST NOT render as `0`.

#### Scenario: Probe login mismatch disables private and contributions
- **WHEN** the identity probe login does not equal the configured `user`
- **THEN** the run MUST use public REST only and MUST treat `include_private` and `contributions` as unavailable without rendering `0` for those fields

### Requirement: Skip and fail matrix
GitHub HTTP and capability outcomes MUST follow this matrix. Fail-after-backoff MUST retry with backoff then fail the run (not skip the widget). GraphQL HTTP 200 with `errors[]` or remaining 0 MUST be fail-after-backoff, not skip-widget.

#### Scenario: empty token fails the job
- **WHEN** the Action token is empty, `""`, or whitespace
- **THEN** the job MUST fail

#### Scenario: 401 fails the run
- **WHEN** GitHub returns HTTP 401
- **THEN** the run MUST fail

#### Scenario: 403 secondary or abuse fails after backoff
- **WHEN** GitHub returns HTTP 403 for secondary rate limit or abuse detection
- **THEN** the run MUST fail-after-backoff (not skip the widget)

#### Scenario: GraphQL HTTP 200 with errors or remaining 0 fails after backoff
- **WHEN** GraphQL returns HTTP 200 with `errors[]` and/or remaining 0
- **THEN** the run MUST fail-after-backoff and MUST NOT skip the widget

#### Scenario: 404 user fails the widget
- **WHEN** GitHub returns HTTP 404 for the configured user
- **THEN** that widget MUST fail

#### Scenario: 429 fails after backoff
- **WHEN** GitHub returns HTTP 429
- **THEN** the run MUST fail-after-backoff

#### Scenario: 200 with zeros renders allowed fields only
- **WHEN** GitHub returns HTTP 200 with zeros for valid empty public stats
- **THEN** the widget MUST render those zeros only for fields the capability allows and MUST NOT invent `0` for skipped contributions

#### Scenario: gist without canGist fails the run
- **WHEN** `output_action` is `gist` and `canGist` is false
- **THEN** the run MUST fail

#### Scenario: gist with non-svg format fails
- **WHEN** `output_action` is `gist` and format is not `svg`
- **THEN** the run MUST fail

#### Scenario: all github widgets skipped and allow_skipped false fails the job
- **WHEN** every github widget is skipped and `allow_skipped` is false
- **THEN** the job MUST fail

#### Scenario: skip does not write files
- **WHEN** a widget is skipped
- **THEN** the Action MUST NOT write or overwrite that widget’s files and MUST NOT count the skip as `data-changed`

### Requirement: REST crawl then GraphQL nodes ids
Languages and stats MUST share one run-scoped request cache. REST cache key MUST be `(method, url, params)`. GraphQL cache key MUST be `(query, variables)` — not `POST /graphql` alone.

The crawl MUST be: REST `GET /users/{login}` plus paginated `GET /users/{login}/repos?type=owner&per_page=100`. The system MUST filter forks and archived first (unless the widget options include them), then cap **500** remaining repositories. Stars and language bytes MUST use that same ordered id list.

GraphQL MUST load language bytes via `nodes(ids:)` in batches of 100 with `languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }`. The system MUST NEVER call REST `/languages` (`GET /repos/{owner}/{repo}/languages`). The system MUST NEVER issue 500 per-repo GraphQL calls. The system MUST NOT paginate `repositories(first:100)` as a second independent 500.

A separate 1-point `contributionsCollection` query MUST run if and only if `canContributions` is true. Mid-pagination REST failure MUST fail stats and languages together.

#### Scenario: Filter forks and archived then cap 500
- **WHEN** the owner repo list is crawled
- **THEN** forks and archived repos MUST be filtered first and the remaining list MUST be capped at 500 before stars or language bytes are computed

#### Scenario: Stars and languages share ordered ids
- **WHEN** stats stars and languages bytes are computed in the same run
- **THEN** both MUST use the same ordered repository id list produced by the filter-then-cap crawl

#### Scenario: GraphQL nodes ids batches of 100
- **WHEN** language bytes are fetched
- **THEN** the system MUST call GraphQL `nodes(ids:)` in batches of 100 with `languages(first: 10, orderBy: { field: SIZE, direction: DESC })` and MUST NOT issue one GraphQL call per repository

#### Scenario: REST languages endpoint is forbidden
- **WHEN** language data is needed
- **THEN** the system MUST NOT call REST `/repos/{owner}/{repo}/languages`

#### Scenario: contributionsCollection only with capability
- **WHEN** `canContributions` is true
- **THEN** the system MUST issue a separate `contributionsCollection` query; when `canContributions` is false that query MUST be omitted

#### Scenario: REST cache key is method url params
- **WHEN** a REST request is cached
- **THEN** the cache key MUST be `(method, url, params)`

#### Scenario: GraphQL cache key is query and variables
- **WHEN** a GraphQL request is cached
- **THEN** the cache key MUST be `(query, variables)` and MUST NOT be `POST /graphql` alone

#### Scenario: Mid-pagination REST failure fails stats and languages
- **WHEN** a REST `/repos` page fails before pagination completes
- **THEN** both stats and languages MUST fail (not a partial star total)
