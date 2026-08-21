## MODIFIED Requirements

### Requirement: REST crawl then GraphQL nodes ids
Languages and stats MUST share one run-scoped request cache. REST cache key MUST be `(method, url, params)`. GraphQL cache key MUST be `(query, variables)` — not `POST /graphql` alone.

The user crawl MUST run for widgets `stats` and `languages` only. The crawl MUST be: REST `GET /users/{login}` plus paginated `GET /users/{login}/repos?type=owner&per_page=100`. The system MUST filter forks and archived first (unless the widget options include them), then cap **500** remaining repositories. Stars and language bytes MUST use that same ordered id list.

Widgets `demo` and `repo` MUST skip that user crawl. Widget `demo` MUST NOT call `GET /users/{login}` or paginated owner-repo listing in order to render. Widget `repo` MUST NOT call that user crawl and MUST use the single-repo GET requirement instead.

GraphQL MUST load language bytes via `nodes(ids:)` in batches of 100 with `languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }`. The system MUST NEVER call REST `/languages` (`GET /repos/{owner}/{repo}/languages`). Widget `repo` language MUST NOT use GraphQL `nodes(ids:)` sizes. The system MUST NEVER issue 500 per-repo GraphQL calls. The system MUST NOT paginate `repositories(first:100)` as a second independent 500.

A separate 1-point `contributionsCollection` query MUST run if and only if `canContributions` is true. Mid-pagination REST failure MUST fail stats and languages together. Mid-pagination REST failure MUST NOT be required to fail widget `repo` (repo does not use that listing).

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

#### Scenario: crawl is stats and languages only
- **WHEN** a run enables only `stats` and/or `languages` among github data widgets
- **THEN** the system MUST perform the user crawl for those widgets

#### Scenario: demo skips user crawl
- **WHEN** widget `demo` loads a payload
- **THEN** the system MUST NOT call `GET /users/{login}` or paginated `GET /users/{login}/repos` for that widget

#### Scenario: repo skips user crawl
- **WHEN** widget `repo` loads a payload
- **THEN** the system MUST NOT call `GET /users/{login}` or paginated `GET /users/{login}/repos` for that widget and MUST NOT crawl the owner list to render `repo`

## ADDED Requirements

### Requirement: Single-repo authenticated GET for widget repo
Widget `repo` MUST fetch exactly one authenticated REST `GET /repos/{owner}/{repo}` for the yaml `repo: owner/name` value. Every request MUST include `Authorization`. The system MUST NOT send that request unauthenticated. The GET MUST reuse the existing github client and run-scoped REST cache keyed `(method, url, params)`. The system MUST NOT call REST `/languages` (`GET /repos/{owner}/{repo}/languages`) for this widget. Language MUST be the REST repository object `language` string only. Watchers MUST be REST `subscribers_count`. Stars MUST be `stargazers_count`. Forks MUST be `forks_count`. Issues MUST be `open_issues_count`. License MUST be `license.spdx_id` when present, else `license.name`.

HTTP 401 on that GET MUST `fail_run`. HTTP 404 MUST `fail_widget`. Empty or unusable 200 body (missing `full_name`) MUST be rendered by the widget as “No repo data” (not a crash, not a silent skip). Playground and docs preview MUST wrap github repo fixtures with zero live GitHub when no App token is present.

The identity probe (`GET /user`) MAY still run once per github client for capability. That probe MUST NOT replace the single-repo GET and MUST NOT restore the user crawl for `repo`.

#### Scenario: repo fetches GET repos owner name
- **WHEN** yaml `repo` is `wyattowalsh/profile-bits` and widget `repo` is enabled
- **THEN** the github integration MUST issue authenticated `GET /repos/wyattowalsh/profile-bits` and MUST NOT list owner repositories to populate that card

#### Scenario: repo GET always has Authorization
- **WHEN** the github integration performs the single-repo GET
- **THEN** the request MUST include `Authorization` and MUST NOT fall back to unauthenticated access

#### Scenario: 401 repo GET fails the run
- **WHEN** `GET /repos/{owner}/{repo}` returns HTTP 401
- **THEN** the run MUST fail

#### Scenario: 404 repo GET fails the widget
- **WHEN** `GET /repos/{owner}/{repo}` returns HTTP 404
- **THEN** that widget MUST fail and MUST NOT write output

#### Scenario: repo language is the REST language string
- **WHEN** `include` contains `language`
- **THEN** the payload language MUST be the repository object `language` string and MUST NOT come from REST `/languages` or GraphQL `nodes(ids:)` sizes

#### Scenario: repo does not call REST languages
- **WHEN** widget `repo` fetches
- **THEN** the system MUST NOT call `GET /repos/{owner}/{repo}/languages`

#### Scenario: shared cache for the repo GET
- **WHEN** two callers in one run request the same `owner/name`
- **THEN** they MUST share the cached REST GET keyed `(method, url, params)`

#### Scenario: playground uses repo fixtures
- **WHEN** the docs playground previews widget `repo` without an App token
- **THEN** it MUST wrap github repo fixtures with zero live GitHub requests
