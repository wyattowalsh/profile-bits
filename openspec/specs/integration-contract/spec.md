# integration-contract Specification

## Purpose

Defines reusable integrations, GitHub auth capability (never unauthenticated), the skip/fail matrix, and REST-then-`nodes(ids:)` languages crawl with filter-then-cap 500.

## Requirements

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

### Requirement: rss integration needs no auth
Integration `rss` MUST use auth `none`. It MUST never send an `Authorization` header, including credentials taken from URL userinfo. It MUST NOT add a new Action token input. One rss client instance MUST be shared per Action, playground, or generate preview run. Playground and docs preview MUST wrap rss fixture XML with zero live feeds. Docs preview MUST NOT add `/playground/rss` routes and MUST NOT add `feed` to the github playground widget-id list.

#### Scenario: rss auth none
- **WHEN** a widget uses integration `rss`
- **THEN** no `Authorization` header MUST be sent and no new Action token MUST be required

#### Scenario: url userinfo never becomes Authorization
- **WHEN** a feed URL includes a username or password
- **THEN** the client MUST fail the widget and MUST NOT send an `Authorization` header

#### Scenario: Shared rss client per run
- **WHEN** two callers in one run use integration `rss`
- **THEN** they MUST share one client instance for that integration

#### Scenario: Playground uses rss fixture XML
- **WHEN** the docs playground previews the feed widget
- **THEN** it MUST wrap rss fixture XML with zero live feeds, MUST NOT invent a second static JSON pack, MUST NOT add `/playground/rss` routes, and MUST NOT add `feed` to the github playground widget-id list

### Requirement: rss request cache and single-flight
The rss client MUST cache GET responses with key `(method, url, params)` for the run. Concurrent callers of the same key MUST share one in-flight GET (single-flight).

#### Scenario: rss cache key is method url params
- **WHEN** an rss request is cached
- **THEN** the cache key MUST be `(method, url, params)`

#### Scenario: in-flight single-flight
- **WHEN** two callers request the same url on one rss client instance before the GET completes
- **THEN** the client MUST issue one GET and MUST share that result

### Requirement: rss GitHub-owned hosts fail before connect
The rss client MUST fail the widget before connecting when the hostname is GitHub-owned. The hostname MUST be lowercased and trailing dots stripped, then matched against `github.com`, `*.github.com`, `githubusercontent.com`, and `*.githubusercontent.com`. The same check MUST run on every redirect hop.

#### Scenario: github.com feed url fails widget before connect
- **WHEN** `widgets.feed.url` host is `github.com`, `api.github.com`, `gist.github.com`, or `raw.githubusercontent.com` (any case, optional trailing dot)
- **THEN** the widget MUST fail before connect and MUST NOT send the request

#### Scenario: non-github host is not blocked by the github-host rule
- **WHEN** `widgets.feed.url` host is `gitlab.com` or another non-GitHub host that otherwise passes SSRF
- **THEN** the GitHub-owned host rule MUST NOT fail the widget

### Requirement: rss https SSRF protections
Rss fetch MUST use https only. Redirects MUST use `redirect: "manual"` semantics: each hop MUST re-validate scheme, host, and resolved IPs; at most 5 hops; https→http MUST fail the widget. A 3xx response body MUST be drained or cancelled before the client follows `Location`. DNS lookup MUST return all A/AAAA records. Every address MUST be public unicast after IPv4-mapped conversion; loopback, link-local, private, CGNAT, unique-local, multicast, unspecified, reserved, and literal `https://127.0.0.1/...` MUST fail the widget before connect. The validated address set MUST be the addresses used for the TCP/TLS connection (DNS-rebinding pin). TLS server name MUST be the original hostname. The TLS/HTTP client MUST be invoked with hostname, path, and related options only; it MUST NOT be passed a URL that includes userinfo. Fetch MUST abort after 10 seconds for the entire redirect hop loop (not one timeout per hop). The client MUST abort if `Content-Length` exceeds 1048576 bytes or if accumulated body bytes exceed 1 MiB. Requests MUST send a non-auth `User-Agent` and an `Accept` header that prefers Atom/RSS/XML. The client MUST NOT resolve XML external entities; a feed with `SYSTEM` / `file://` MUST fail the widget or ignore the entity and MUST NEVER read local disk.

#### Scenario: http scheme fails at parse or fetch
- **WHEN** the configured url uses `http://`
- **THEN** yaml parse MUST fail; when a redirect target uses `http://`, fetch MUST fail the widget

#### Scenario: private or loopback address fails widget
- **WHEN** the url host resolves to loopback, link-local, private, CGNAT, unique-local, multicast, unspecified, reserved, or IPv4-mapped forms of those ranges
- **THEN** the widget MUST fail before connect

#### Scenario: oversize body fails widget
- **WHEN** `Content-Length` is greater than 1048576 or accumulated body bytes exceed 1 MiB
- **THEN** the widget MUST fail

#### Scenario: xxe entity does not read disk
- **WHEN** the feed XML contains an external entity with `SYSTEM` or `file://`
- **THEN** the widget MUST fail or ignore the entity and MUST NOT read local disk

#### Scenario: redirect body is drained before follow
- **WHEN** a feed request returns HTTP 3xx with a `Location` header
- **THEN** the client MUST drain or cancel that response body before following the redirect

#### Scenario: hop loop shares one ten-second deadline
- **WHEN** rss fetch follows redirects
- **THEN** the 10 second abort MUST cover the entire hop loop

### Requirement: rss HTTP skip and fail matrix
Rss HTTP outcomes MUST follow this matrix. Fail-after-backoff for rss MUST retry with backoff then **fail the widget** (not `fail_job` / `fail_run`). A single feed 429 or 5xx MUST NOT fail github widgets or the whole job.

| Outcome | Terminal |
| --- | --- |
| 401 / 403 / 404 | `fail_widget` |
| 429 / 5xx | retry then `fail_widget` |
| timeout / SSRF / GitHub-owned host | `fail_widget` |
| malformed XML / unparsable feed | `fail_widget` |

#### Scenario: rss 401 403 404 fail the widget
- **WHEN** the feed URL returns HTTP 401, 403, or 404
- **THEN** that widget MUST fail and the job MUST NOT fail solely because of that status

#### Scenario: rss 429 and 5xx fail widget after backoff
- **WHEN** the feed URL returns HTTP 429 or 5xx
- **THEN** the client MUST retry with backoff and then fail the widget, and MUST NOT fail the run or skip silently

#### Scenario: rss timeout or SSRF fails the widget
- **WHEN** fetch times out or SSRF / GitHub-host checks reject the url
- **THEN** the widget MUST fail

### Requirement: rss payload is a frozen item list
The rss client MUST parse with rss-parser **or equivalent** and MUST NOT use any parser HTTP/fetch helper. The payload MUST be an `Object.freeze`d array of frozen items `{ title: string, url: string, published_at: string | null }`. `published_at` MUST be ISO 8601 or null. `title` MUST collapse whitespace, strip tags, and be empty string if missing. Item `url` MUST be the item’s HTML page link from the parser. The client MUST return the full frozen list; the widget MUST slice to `limit`.

#### Scenario: frozen items expose title url published_at
- **WHEN** a valid Atom or RSS 2.0 feed is parsed
- **THEN** the payload MUST be a frozen array of frozen `{ title, url, published_at }` objects with ISO `published_at` or null

#### Scenario: parser HTTP helper is never used
- **WHEN** the rss client loads a feed
- **THEN** it MUST parse a fetched XML string and MUST NOT call a parser-owned URL/fetch API
