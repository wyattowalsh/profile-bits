## MODIFIED Requirements

### Requirement: REST crawl then GraphQL nodes ids
Languages and stats MUST share one run-scoped request cache. REST cache key MUST be `(method, url, params)`. GraphQL cache key MUST be `(query, variables)` — not `POST /graphql` alone.

The user crawl MUST run for widgets `stats` and `languages` only. The crawl MUST be: REST `GET /users/{login}` plus paginated `GET /users/{login}/repos?type=owner&per_page=100`. The system MUST filter forks and archived first (unless the widget options include them), then cap **500** remaining repositories. Stars and language bytes MUST use that same ordered id list.

Widgets `demo` and `repo` MUST skip that user crawl. Widget `demo` MUST NOT call `GET /users/{login}` or paginated owner-repo listing in order to render. Widget `repo` MUST NOT call that user crawl and MUST use the single-repo GET requirement instead.

GraphQL MUST load language bytes via `nodes(ids:)` in batches of 100 with `languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color id } } pageInfo { hasNextPage endCursor } }`. When a repository languages connection has `pageInfo.hasNextPage` true, the system MUST paginate that connection with GraphQL (`after` cursor, same `first: 10` page size) until complete. Follow-up pages MUST use GraphQL and MAY query only the repository node ids that still have `hasNextPage`. Follow-up pagination MUST NOT replace the batched `nodes(ids:)` first page. The system MUST NEVER call REST `/languages` (`GET /repos/{owner}/{repo}/languages`). Widget `repo` language MUST NOT use GraphQL `nodes(ids:)` sizes. The system MUST NEVER issue 500 per-repo GraphQL calls as the initial language load. The system MUST NOT paginate `repositories(first:100)` as a second independent 500. Cached language nodes MUST keep `color` and `id` alongside `name` and size.

A separate `contributionsCollection` query MUST run if and only if `canContributions` is true. When that query runs, the cached payload MUST dump `contributionCalendar.totalContributions` and calendar `weeks`. When `canContributions` is false, that query MUST be omitted and those fields MUST NOT be invented as `0`. Mid-pagination REST failure MUST fail stats and languages together. Mid-pagination REST failure MUST NOT be required to fail widget `repo` (repo does not use that listing).

The cached typed payload for those fetches MUST be the fetched REST/GraphQL JSON dump. Widgets MUST select fields from that dump and MUST NOT perform HTTP. Include/limit/min_pct/exclude MUST stay widget-side and MUST NOT drop dump fields at fetch.

#### Scenario: Filter forks and archived then cap 500
- **WHEN** the owner repo list is crawled
- **THEN** forks and archived repos MUST be filtered first and the remaining list MUST be capped at 500 before stars or language bytes are computed

#### Scenario: Stars and languages share ordered ids
- **WHEN** stats stars and languages bytes are computed in the same run
- **THEN** both MUST use the same ordered repository id list produced by the filter-then-cap crawl

#### Scenario: GraphQL nodes ids batches of 100
- **WHEN** language bytes are fetched
- **THEN** the system MUST call GraphQL `nodes(ids:)` in batches of 100 with `languages(first: 10, orderBy: { field: SIZE, direction: DESC })` and MUST NOT issue one GraphQL call per repository as the initial language load

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

#### Scenario: crawl is stats and languages only
- **WHEN** a run enables only `stats` and/or `languages` among github data widgets
- **THEN** the system MUST perform the user crawl for those widgets

#### Scenario: demo skips user crawl
- **WHEN** widget `demo` loads a payload
- **THEN** the system MUST NOT call `GET /users/{login}` or paginated `GET /users/{login}/repos` for that widget

#### Scenario: repo skips user crawl
- **WHEN** widget `repo` loads a payload
- **THEN** the system MUST NOT call `GET /users/{login}` or paginated `GET /users/{login}/repos` for that widget and MUST NOT crawl the owner list to render `repo`

#### Scenario: Language nodes keep color and id
- **WHEN** language bytes are fetched
- **THEN** each cached language node MUST include `name`, size, `color`, and `id`

#### Scenario: GraphQL languages paginate after first 10
- **WHEN** a repository languages connection has more than 10 languages
- **THEN** the system MUST paginate that GraphQL connection after `first: 10` and MUST NOT call REST `/languages`

#### Scenario: Calendar weeks dump when capable
- **WHEN** `canContributions` is true
- **THEN** the cached payload MUST dump `contributionCalendar.totalContributions` and calendar `weeks`

#### Scenario: Widgets select from the dump
- **WHEN** widgets `stats` or `languages` render
- **THEN** they MUST select fields from the cached dump and MUST NOT perform HTTP

## ADDED Requirements

### Requirement: Github cached payload is the fetched REST/GraphQL JSON dump
The github cached typed payload MUST be a dump of already-fetched REST and GraphQL JSON, not a leftover widget slice. Widgets MUST select fields from that dump. Secrets (tokens) MUST NEVER persist in the dump, logs, or cache keys.

From `GET /users/{login}`, the dump MUST include `login`, `id`, `node_id`, `followers`, `following`, `public_repos`, `public_gists`, `name`, `bio`, `avatar_url`, and `created_at`.

From each owner-repo list item after filter-then-cap **500**, the dump MUST include `id`, `node_id`, `name`, `full_name`, `fork`, `archived`, `private`, `stargazers_count`, `forks_count`, `html_url`, `description`, `language`, and `topics`.

From authenticated `GET /repos/{owner}/{repo}` (widget `repo`), the dump MUST include the existing repository object fields (`full_name`, `name`, `description`, `html_url`, `stargazers_count`, `forks_count`, `subscribers_count`, `open_issues_count`, `language`, license, owner login, owner avatar) plus `topics` when GitHub returns them. Language for widget `repo` MUST remain the repository object `language` string and MUST NOT come from REST `/languages` or GraphQL `nodes(ids:)` sizes.

Every GitHub REST or GraphQL request MUST include `Authorization`. Empty / `""` / whitespace `github_token` MUST `fail_job` before any GitHub request. The identity probe (`GET /user` or `viewer { login }`) MUST remain capability-only and MUST NOT replace `GET /users/{login}` as the user dump source. Wave 2 MUST NOT run `author-integration add` for `github`, `wakatime`, `rss`, or `http`. This change MUST NOT add flattened `plugin_<plugin>_<widget>_<option>` Action inputs.

#### Scenario: User dump keeps dropped-today profile fields
- **WHEN** `GET /users/{login}` returns `name`, `bio`, `avatar_url`, and `created_at`
- **THEN** the cached payload MUST include those fields and MUST NOT drop them because widget `stats` does not render them today

#### Scenario: Owner-repo dump keeps html_url description language topics
- **WHEN** the owner-repo crawl returns `html_url`, `description`, `language`, and `topics`
- **THEN** the cached payload MUST include those fields on each remaining repository after filter-then-cap 500

#### Scenario: Empty token fails the job before dump fetch
- **WHEN** `github_token` is empty, `""`, or whitespace
- **THEN** the Action MUST `fail_job` and MUST NOT send any GitHub request

#### Scenario: Probe is not the user dump source
- **WHEN** the github client loads a stats or languages payload
- **THEN** the user dump MUST come from `GET /users/{login}` and MUST NOT treat the identity probe body as that dump

#### Scenario: No flattened Action inputs
- **WHEN** this dump change lands
- **THEN** the system MUST NOT add `plugin_<plugin>_<widget>_<option>` Action inputs

#### Scenario: Wave 2 does not author-integration add live dests
- **WHEN** wave 2 extends github, wakatime, rss, or http
- **THEN** it MUST NOT run `author-integration add` for those ids

### Requirement: Optional extra authenticated GitHub endpoints omit without capability
The github integration MAY add extra authenticated endpoints (pinned items, public events) after the user / owner-repo / repo GET / language / calendar dump. Those requests MUST include `Authorization`. Empty / `""` / whitespace `github_token` MUST still `fail_job` before any request. Missing scopes or capability MUST omit the extra fields and MUST NOT invent `0`. The identity probe MUST remain capability-only and MUST NOT be the dump source for those fields. Extra endpoints MUST NOT call REST `/repos/{owner}/{repo}/languages`. Filter-then-cap **500** MUST still apply to the owner-repo crawl. Extra endpoints MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: Missing scope omits extra fields
- **WHEN** an extra authenticated endpoint requires a scope or capability the token does not have
- **THEN** the dump MUST omit those fields and MUST NOT invent `0`

#### Scenario: Extra endpoints stay authenticated
- **WHEN** pinned items or public events are fetched
- **THEN** every request MUST include `Authorization` and MUST NOT fall back to unauthenticated GitHub

#### Scenario: Extra endpoints never REST languages
- **WHEN** extra github endpoints run
- **THEN** the system MUST NOT call REST `/repos/{owner}/{repo}/languages`
