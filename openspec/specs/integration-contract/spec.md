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

### Requirement: rss integration needs no auth

Integration `rss` MUST use auth `none`. It MUST never send an `Authorization` header, including credentials taken from URL userinfo. It MUST NOT add a new Action token input. One rss client instance MUST be shared per Action, playground, or generate preview run. Playground and docs preview MUST wrap rss fixture XML by default (zero live feeds when no typed live https url). Docs preview MAY serve `/playground/rss` for pack `rss` widget `feed`. Docs preview MUST NOT add `feed` to the github playground widget-id list.

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
- **THEN** it MUST wrap rss fixture XML with zero live feeds, MUST NOT invent a second static JSON pack, MAY serve `/playground/rss`, and MUST NOT add `feed` to the github playground widget-id list

#### Scenario: Playground uses rss fixture XML by default
- **WHEN** the docs playground previews the feed widget without a typed live https url
- **THEN** it MUST wrap rss fixture XML with zero live feeds, MUST NOT invent a second static JSON pack, MAY serve `/playground/rss`, and MUST NOT add `feed` to the github playground widget-id list

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

### Requirement: http integration auth is optional
Integration `http` MUST use auth `optional`. Optional MUST NOT mean “always send Authorization”. Unset or whitespace `http_token_env` MUST send no `Authorization` header. When `http_token_env` names an environment variable whose value is empty or whitespace, the widget MUST fail (`fail_widget`). When the named variable has a value, the client MUST send `Authorization: Bearer ${value}` unless the value already has scheme prefix `Bearer`, `token`, or `Basic` (case-insensitive) — then the client MUST send the raw value. Token values MUST never appear in yaml or logs. One http client instance MUST be shared per Action, playground, or generate preview run. Playground and docs preview MUST use fixtures and MUST NOT fetch live URLs.

#### Scenario: unset http_token_env sends no Authorization
- **WHEN** `http_token_env` is omitted or whitespace
- **THEN** no `Authorization` header MUST be sent

#### Scenario: named env empty fails widget
- **WHEN** `http_token_env` names a variable whose value is empty or whitespace
- **THEN** the widget MUST fail and MUST NOT send a request with an empty Authorization

#### Scenario: Bearer vs raw scheme
- **WHEN** the named env value has no scheme prefix
- **THEN** the client MUST send `Authorization: Bearer ${value}`; when the value already starts with `Bearer`, `token`, or `Basic` (case-insensitive), the client MUST send the raw value

#### Scenario: Shared http client per run
- **WHEN** two callers in one run use integration `http`
- **THEN** they MUST share one client instance for that integration

#### Scenario: Playground uses fixtures not live URLs
- **WHEN** the docs playground at `/playground/http` previews the json widget
- **THEN** it MUST use fixtures with zero live URLs

### Requirement: http request cache and single-flight
The http client MUST cache GET responses with key `(method, url, params, auth, headers)` for the run, where `auth` is `"none"` or `"bearer"` (never the secret) and `headers` are the canonicalized yaml extra headers (sorted, lowercase names). Concurrent callers of the same key MUST share one in-flight GET (single-flight). `params` MUST be sorted URL search params. Yaml headers MUST be forwarded on the GET. Required `Accept: application/json` and `User-Agent: profile-bits-http/0` MUST win over yaml extras with those names (any casing). Other allowed extras MUST still be forwarded. The cache key MUST use the canonicalized yaml extra headers, not the merged wire headers.

#### Scenario: http cache key is method url params auth headers
- **WHEN** an http request is cached
- **THEN** the cache key MUST be `(method, url, params, auth, headers)` with `auth` `"none"` or `"bearer"`, MUST include canonicalized yaml headers, and MUST NOT include the token value

#### Scenario: yaml headers are sent on GET
- **WHEN** `widgets.json.headers` contains allowed extra headers
- **THEN** the GET MUST include those headers and MUST NOT reuse a cached body from the same URL with a different header set

#### Scenario: in-flight single-flight
- **WHEN** two callers request the same url on one http client instance before the GET completes
- **THEN** the client MUST issue one GET and MUST share that result

#### Scenario: required Accept and User-Agent win over yaml extras
- **WHEN** yaml extra headers include `Accept` or `User-Agent` under any casing
- **THEN** the GET MUST send `Accept: application/json` and `User-Agent: profile-bits-http/0`, MUST still forward other allowed extras, and the cache key MUST use the yaml headers not the merged wire headers

### Requirement: http https SSRF protections
Http fetch MUST use https only. Redirects MUST use `redirect: "manual"` semantics: each hop MUST re-validate scheme, host, and resolved IPs; at most 5 hops; https→http MUST fail the widget. A 3xx response body MUST be cancelled or destroyed before the client follows `Location`. DNS lookup MUST return all A/AAAA records. Every address MUST be public unicast after IPv4-mapped conversion; loopback, link-local, private (`192.168.0.0/16` not `/8`), CGNAT, unique-local, multicast, unspecified, reserved, and IPv4-mapped forms of those ranges MUST fail the widget before connect. Mixed public A plus private AAAA MUST fail closed. The validated address set MUST be the addresses used for the TCP/TLS connection (DNS-rebinding pin). TLS server name MUST be the original hostname. When `createHttpClient` is constructed without `fetch`, GET MUST use DNS-pinned `https.request` and MUST NOT call `globalThis.fetch`. Fetch MUST abort after the widget `timeout_ms` (default 10000, max 20000). One abort signal MUST cover DNS lookup, every redirect hop, and body read for that `httpGet` attempt (MUST NOT start a new timer per hop). A `loadJson` retry MAY start a fresh `timeout_ms` deadline after backoff sleep. The client MUST abort if `Content-Length` exceeds 1048576 bytes or if accumulated (decompressed) body bytes exceed 1 MiB. Requests MUST send `User-Agent: profile-bits-http/0` and `Accept: application/json`. Metadata hostnames `metadata.google.internal`, `metadata.internal`, and `169.254.169.254` MUST fail before connect.

#### Scenario: http scheme fails at parse or fetch
- **WHEN** the configured url uses `http://`
- **THEN** yaml parse MUST fail; when a redirect target uses `http://`, fetch MUST fail the widget

#### Scenario: private or loopback address fails widget
- **WHEN** the url host resolves to loopback, link-local, private, CGNAT, unique-local, multicast, unspecified, reserved, or IPv4-mapped forms of those ranges
- **THEN** the widget MUST fail before connect

#### Scenario: mixed A and AAAA fails closed
- **WHEN** lookup returns a public A record and a private AAAA record
- **THEN** the widget MUST fail before connect

#### Scenario: oversize body fails widget
- **WHEN** `Content-Length` is greater than 1048576 or accumulated body bytes exceed 1 MiB
- **THEN** the widget MUST fail

#### Scenario: metadata hostnames fail before connect
- **WHEN** the url host is `metadata.google.internal`, `metadata.internal`, or `169.254.169.254`
- **THEN** the widget MUST fail before connect

#### Scenario: timeout bounds DNS hops and body for one attempt
- **WHEN** http fetch performs DNS lookup, redirect hops, and body read for one `loadJson` attempt
- **THEN** one `timeout_ms` abort signal MUST cover DNS, every hop, and the body, MUST NOT start a new timer per hop, and a retry MAY start a fresh deadline after backoff sleep

#### Scenario: redirect body is cancelled before following Location
- **WHEN** a json request returns HTTP 3xx with a `Location` header
- **THEN** the client MUST cancel or destroy that response body before following the redirect

#### Scenario: cross-origin 302 drops Authorization on hop 1
- **WHEN** a token is present and the GET receives HTTP 302 to another https origin
- **THEN** hop 0 MAY send `Authorization` and hop 1 MUST NOT send `Authorization`

#### Scenario: same-origin 302 keeps Authorization
- **WHEN** a token is present and the GET receives HTTP 302 whose `Location` is a same-origin path or relative URL
- **THEN** the following hop MUST keep `Authorization`

#### Scenario: Authorization drop is sticky across later hops
- **WHEN** a token is present and the GET redirects from origin A to a foreign https origin B and then back to A
- **THEN** `Authorization` MUST be dropped when the current hop origin differs from the `Location` origin, MUST NOT use hop-0 origin equality, and MUST NOT be sent on later hops including the return to A

#### Scenario: chips auth none sends no Authorization on any hop
- **WHEN** chips `auth` is `"none"`
- **THEN** the client MUST NOT send `Authorization` on any hop

#### Scenario: production GET pins DNS without global fetch
- **WHEN** `createHttpClient` is constructed without `fetch`
- **THEN** GET MUST use DNS-pinned `https.request` and MUST NOT call `globalThis.fetch`

### Requirement: http HTTP skip and fail matrix

Http HTTP outcomes MUST follow this matrix. Fail-after-backoff for http MUST retry with backoff then **fail the widget** (not `fail_job` / `fail_run`). A single json 429 or 5xx MUST NOT fail github widgets or the whole job unless json is the only enabled widget (see plugin-contract http-only non-render).

| Outcome | Terminal |
| --- | --- |
| 401 / 404 | `fail_widget` (no retry) |
| 403 / 429 / 5xx | retry then `fail_widget` |
| 2xx non-JSON | `fail_widget` (no retry) |
| timeout / SSRF | `fail_widget` |
| JSON parse throw | `fail_widget` (not skip) |

JMESPath evaluation MUST run in the json widget reader on the cached dump. An invalid or throwing `jmespath` MUST `fail_widget` at the widget, not at fetch, and MUST NOT drop keys from the dump.

Backoff MUST be 3 attempts at 200/400/800ms, honoring `Retry-After` capped at 10s. A `fail_widget` HTTP error message MUST include the hostname and status and MUST NOT include `url.href`, search, or hash. A `fail_widget` timeout message MUST include the hostname and `timeout_ms`. Hop-layer timeout MUST throw `HttpSsrfError("timeout")`; wrapping MAY append hostname and `timeout_ms`. `fail_widget` messages MUST never include token values.

#### Scenario: http 401 and 404 fail the widget without retry
- **WHEN** the JSON URL returns HTTP 401 or 404
- **THEN** that widget MUST fail without retry and the job MUST NOT fail solely because of that status unless json is the only enabled widget

#### Scenario: http 403 429 and 5xx fail widget after backoff
- **WHEN** the JSON URL returns HTTP 403, 429, or 5xx
- **THEN** the client MUST retry with backoff and then fail the widget, and MUST NOT fail the run or skip silently

#### Scenario: 2xx non-JSON fails widget without retry
- **WHEN** the response is 2xx and the body is not JSON
- **THEN** the widget MUST fail without retry

#### Scenario: http timeout or SSRF fails the widget
- **WHEN** fetch times out or SSRF checks reject the url
- **THEN** the widget MUST fail

#### Scenario: fail_widget HTTP error message includes hostname and status
- **WHEN** http GET fails with an HTTP error status
- **THEN** the `fail_widget` error message MUST include the hostname and status and MUST NOT include `url.href`, search, or hash

#### Scenario: fail_widget timeout message includes hostname and timeout_ms
- **WHEN** http GET times out
- **THEN** the hop layer MUST throw `HttpSsrfError("timeout")`, wrapping MAY append hostname and `timeout_ms`, and the `fail_widget` message MUST include hostname and `timeout_ms` and MUST NOT include `url.href`, search, or hash

#### Scenario: fail_widget messages never include token values
- **WHEN** http GET fails with `fail_widget`
- **THEN** `HttpClientError.message` MUST NOT include token values

#### Scenario: jmespath throw is widget-side
- **WHEN** the cached JSON is valid and `jmespath` is invalid or throws
- **THEN** fetch MUST have cached the full JSON value and the json widget MUST fail without dropping the dump

### Requirement: Chips reuse integration http with no new integration id

Widget `chips` MUST declare integration `http` only. The system MUST NOT add first-party integration ids `shieldcn` or `shields`. First-party integration ids MAY also include `spotify`, `leetcode`, `chesscom`, `lichess`, and `steam`. Chips MUST GET JSON through the existing shared http client (one instance per Action, playground, or generate preview run). Auth MUST remain `optional` on integration `http`. Chips MUST NOT introduce a second HTTP client, MUST NOT import octokit from the http module, and MUST NOT add a new thin Action token input. N types MUST expand to N https GET JSON requests that share the existing run-scoped cache and single-flight, issued concurrently (`Promise.all`). Those GETs MUST cache the raw parsed JSON dump and MUST NOT normalize to `{ label, message, color? }` at fetch. Widget-side readers MUST map `message = message ?? value` after the cache. Flattened `plugin_<plugin>_<widget>_<option>` Action inputs MUST NOT be added.

#### Scenario: chips uses integration http only
- **WHEN** widget `chips` is registered
- **THEN** its integrations list MUST be `["http"]` and MUST NOT include a new integration id

#### Scenario: chips shares the existing http client
- **WHEN** json and chips run in the same Action run
- **THEN** they MUST share one http client instance and MUST NOT construct a vendor-specific client

#### Scenario: N types issue N cached GETs
- **WHEN** a chips widget has N unique types after dedupe
- **THEN** the client MUST perform at most N GET JSON calls for that widget, MUST share cache/single-flight with other http callers, and MUST issue those GETs concurrently

#### Scenario: chips GETs cache raw JSON not normalized badges
- **WHEN** a chips widget fetches N types
- **THEN** the cached bodies MUST be the parsed JSON dumps and MUST NOT be `{ label, message, color? }` records produced at fetch

### Requirement: Closed chips preset expander and origin allowlist

A preset expander under the existing http integration MUST map `(preset, type, user, repo, package, workflow)` to a single https URL. One chips widget MUST use exactly one preset. The expander MUST emit **only** these origins: `https://shieldcn.dev` and `https://img.shields.io`. The origin allowlist MUST apply **in addition to** existing http SSRF checks (https, DNS pin, no private redirects, 1 MiB cap). The expander MUST reject `http://`, `www` hosts, `shields.io` without the `img` subdomain, and any other host.

`repo` containing `/` MUST split `owner/repo`; otherwise owner MUST be Action `user` and the repo name MUST be the short `repo` value. Missing package or owner after that expand MUST fail the widget (parse MAY omit those fields). `workflow` MUST default to `ci.yml` and MUST be used only for shields `ci`.

Closed type enum: `npm | stars | forks | license | release | issues | prs | ci`.

**shieldcn** origin `https://shieldcn.dev`:

- `npm` → `/npm/{package}.json`
- `stars` → `/github/stars/{owner}/{repo}.json`
- `forks` → `/github/forks/{owner}/{repo}.json`
- `license` → `/github/license/{owner}/{repo}.json`
- `release` → `/github/release/{owner}/{repo}.json`
- `issues` → `/github/issues/{owner}/{repo}.json`
- `prs` → `/github/prs/{owner}/{repo}.json`
- `ci` → `/github/ci/{owner}/{repo}.json`

**shields** origin `https://img.shields.io`:

- `npm` → `/npm/v/{package}.json`
- `stars` → `/github/stars/{owner}/{repo}.json`
- `forks` → `/github/forks/{owner}/{repo}.json`
- `license` → `/github/license/{owner}/{repo}.json`
- `release` → `/github/v/release/{owner}/{repo}.json`
- `issues` → `/github/issues/{owner}/{repo}.json`
- `prs` → `/github/issues-pr/{owner}/{repo}.json`
- `ci` → `/github/actions/workflow/status/{owner}/{repo}/{workflow}.json`

The expander MUST NOT emit `/badge/dynamic/json`, `/https/{hostname}`, `/memo`, discord, reddit, nba, or views paths. The expander MUST NOT accept user-defined URLs, `dynamic`, or `endpoint` query URLs. Generic widget `json` remains the escape hatch for arbitrary SSRF-safe https URLs.

Live JSON shapes the expander MUST accept: shieldcn npm `{ label, value, link }` with no color; shields `{ label, message, color, name, value }`. The cached dump MUST retain `label`, `message`, `color`, `name`, `value`, and `link` when present on those bodies. Fetch MUST NOT drop `link` or `value`. Tests MUST use fixtures and MUST NOT perform live network.

#### Scenario: shieldcn npm expands to allowlisted json url
- **WHEN** preset is `shieldcn`, type is `npm`, and package is `react`
- **THEN** the expander MUST emit `https://shieldcn.dev/npm/react.json` and MUST NOT emit a dynamic or endpoint URL

#### Scenario: shields ci uses workflow default
- **WHEN** preset is `shields`, type is `ci`, owner/repo are present, and workflow is omitted
- **THEN** the expander MUST emit `https://img.shields.io/github/actions/workflow/status/{owner}/{repo}/ci.yml.json`

#### Scenario: repo without slash uses Action user as owner
- **WHEN** `repo` is `next.js` with no `/` and Action `user` is `vercel`
- **THEN** github types MUST expand with owner `vercel` and repo `next.js`

#### Scenario: repo with slash splits owner and repo
- **WHEN** `repo` is `vercel/next.js`
- **THEN** github types MUST expand with owner `vercel` and repo `next.js`

#### Scenario: disallowed origin fails closed
- **WHEN** expansion would target a host other than `shieldcn.dev` or `img.shields.io`, including `www` or `shields.io` without `img`
- **THEN** the widget MUST fail and MUST NOT fetch that host

#### Scenario: forbidden vendor paths are not emitted
- **WHEN** a chips widget is expanded
- **THEN** the URLs MUST NOT include `/badge/dynamic/json`, `/https/{hostname}`, `/memo`, discord, reddit, nba, or views

#### Scenario: shieldcn value maps to message
- **WHEN** the JSON body is `{ "label": "npm", "value": "19.0.0", "link": "https://example.com" }` with no color
- **THEN** the cached dump MUST retain `label`, `value`, and `link`; widget-side normalize MUST yield message `19.0.0`, MUST ignore `link` as chrome, and MUST omit color so render uses theme accent

#### Scenario: shieldcn cache keeps value and link
- **WHEN** the JSON body is `{ "label": "npm", "value": "19.0.0", "link": "https://example.com" }` with no color
- **THEN** the cached dump MUST retain `label`, `value`, and `link` and MUST NOT drop `link` at fetch

### Requirement: Chips expander uses exact path identity
The closed chips preset expander MUST reject whole-segment `""`, `.`, and `..` on package, owner, and repo name. Workflow MUST reject values that are exactly `.` or `..`. Scoped npm `@scope/name` MUST remain valid: one path segment, or two segments whose first matches `@[^/]+`. Names that contain dots other than a whole-segment `.` or `..`, including `next.js` and `ci.yml`, MUST remain valid.

After constructing the path string `pathname` and `new URL(pathname, origin)`, the expander MUST require `url.pathname === pathname` (exact equality with the pre-resolution constructed path, not a prefix match), empty search, and empty hash. Origin allowlist (`shieldcn.dev`, `img.shields.io`) MUST still apply. Deny-prefix checks (`/badge`, `/endpoint`, `/https/`, `/memo`, `/discord`, `/reddit`, `/nba`, `/views`, `/watchers`) MUST remain belt-only and MUST NOT be the only path check.

These path failures MUST use error code `forbidden_path` and MUST NOT reuse `forbidden_origin`. Existing http SSRF checks MUST still run on fetch in addition to expander identity and MUST NOT be rewritten.

#### Scenario: parent-segment package does not silently fetch bar
- **WHEN** chips npm package is `foo/../bar` or equivalent `..` traversal
- **THEN** expand MUST fail with `forbidden_path` and MUST NOT emit a URL that fetches `bar`

#### Scenario: nested parent segments toward dynamic badge fail
- **WHEN** package, owner, or repo contains `../badge/dynamic/json`, `../../badge/dynamic/json`, or `@scope/../../badge/dynamic/json`
- **THEN** expand MUST fail with `forbidden_path` and MUST NOT emit `/badge/dynamic/json`

#### Scenario: owner repo and workflow dot segments fail
- **WHEN** owner is `..`, repo is `../hello` or `..`, or workflow is `.` or `..`
- **THEN** expand MUST fail with `forbidden_path`

#### Scenario: encoded dot-dot stays encoded
- **WHEN** a segment is `%2e%2e`
- **THEN** expand MUST keep that segment encoded and MUST NOT resolve it to `/badge`

#### Scenario: happy names still expand
- **WHEN** package is `react` or `@scope/name`, repo is `vercel/next.js`, or workflow is `ci.yml` / `release.yml`
- **THEN** expand MUST succeed with empty search and hash and hostname `shieldcn.dev` or `img.shields.io`

#### Scenario: resolved pathname equals constructed pathname
- **WHEN** expand succeeds
- **THEN** the URL pathname MUST equal the constructed `pathname` exactly (not a prefix) and search and hash MUST be empty

#### Scenario: origin allowlist does not replace SSRF
- **WHEN** an expanded chips URL is fetched
- **THEN** existing http SSRF checks MUST still run in addition to path identity and MUST NOT be changed by this requirement

### Requirement: Chips JSON fetches use per-request auth none
Chips JSON GETs MUST set per-request auth to `none`. When a request sets auth `none`, the http client MUST skip the missing-token throw, MUST send no `Authorization` header on hop 0 and hop 1, and MUST key the run cache as `none` (never the secret). Chips MUST pass no extra headers on those GETs.

Json callers that omit the auth field MUST keep existing optional-auth behavior: missing / empty token MUST fail the json widget and MUST NOT GET; a present token MUST still send `Bearer` (or the existing raw scheme). Integration `http` pack auth MUST remain `optional`. Client-secret redact on errors MUST still hold.

#### Scenario: chips GET omits Authorization when the client has a token
- **WHEN** chips loads expanded CDN URLs and the shared http client was constructed with a token
- **THEN** each chips GET MUST omit `Authorization` and MUST use cache auth `none`

#### Scenario: chips GET still runs when the named token is empty
- **WHEN** chips sets per-request auth `none` and the client token is missing or empty
- **THEN** chips MUST still GET and MUST NOT fail for a missing http token

#### Scenario: json omit auth still requires a token
- **WHEN** json omits the auth field and the client token is missing or empty
- **THEN** the json widget MUST fail and MUST NOT GET

#### Scenario: json with a token still sends Bearer
- **WHEN** json omits the auth field and the client has a token
- **THEN** the json GET MUST still send `Authorization` with the existing Bearer or raw scheme

#### Scenario: auth none and default auth are distinct cache keys
- **WHEN** the same URL is fetched once with omitted auth and once with auth `none`
- **THEN** the client MUST use two cache keys and MUST issue two GETs

#### Scenario: pack http auth stays optional
- **WHEN** chips uses per-request auth `none`
- **THEN** integration `http` pack auth MUST remain `optional` and MUST NOT be changed to `none`

### Requirement: wakatime integration requires auth
Integration `wakatime` MUST use auth `required`. Empty / `""` / whitespace `wakatime_token` MUST be treated as missing. When the wakatime pack is on and the token is missing, the Action MUST fail the job (`fail_job`). When the pack is absent, the token MUST NOT be required. Every wakatime request MUST include `Authorization`. The client MUST NEVER send a request without `Authorization`. The system MUST NEVER scrape a public unauthenticated WakaTime profile as a fallback. Playground and docs preview MUST use fixtures or skip live WakaTime and MUST NEVER call WakaTime unauthenticated.

#### Scenario: missing token with pack on fails the job
- **WHEN** yaml `plugins.wakatime` is present and `wakatime_token` is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send unauthenticated requests

#### Scenario: pack absent does not require token
- **WHEN** yaml omits `plugins.wakatime`
- **THEN** a missing `wakatime_token` MUST NOT fail the job

#### Scenario: wakatime request always has Authorization
- **WHEN** the wakatime integration performs HTTP
- **THEN** every request MUST include `Authorization` and MUST NOT fall back to public unauthenticated scrape

#### Scenario: Playground never unauthenticated wakatime
- **WHEN** the docs playground previews the coding widget
- **THEN** it MUST use fixtures or skip live WakaTime and MUST NOT send unauthenticated WakaTime requests

### Requirement: Shared wakatime client, path split, and REST cache
One wakatime client instance MUST be shared per Action or playground run. Stats URLs MUST use a client-constructed path split: hostname `wakatime.com` (exact, lowercase) MUST use `https://wakatime.com/api/v1/users/current/stats/{range}`; any other allowed hostname MUST use `https://{api_domain}/api/compat/wakatime/v1/users/current/stats/{range}`. Range MUST appear in the path only and MUST be one of `last_7_days | last_30_days | last_6_months | last_year`. The client MUST NOT send `?range=`, `?is_including_today=`, or `?api_key=`. REST cache key MUST be `(method, url, params)`. Same-run cache hits MUST skip fetch.

#### Scenario: Shared wakatime client per run
- **WHEN** two callers in one run use integration `wakatime`
- **THEN** they MUST share one client instance for that integration

#### Scenario: Cloud hostname uses official path
- **WHEN** `api_domain` is `wakatime.com`
- **THEN** the request URL MUST be `https://wakatime.com/api/v1/users/current/stats/{range}`

#### Scenario: Non-cloud hostname uses Wakapi compat path
- **WHEN** `api_domain` is an allowed hostname other than `wakatime.com`
- **THEN** the request URL MUST be `https://{api_domain}/api/compat/wakatime/v1/users/current/stats/{range}`

#### Scenario: wakatime REST cache key is method url params
- **WHEN** a wakatime REST request is cached
- **THEN** the cache key MUST be `(method, url, params)` and MUST NOT be keyed as `POST /graphql`

### Requirement: wakatime HTTP skip and fail matrix
WakaTime HTTP outcomes MUST follow this matrix. The client MUST set `redirect: "error"`. Fail-after-backoff MUST retry with bounded backoff (max 3) then fail. The system MUST NOT reuse the GitHub HTTP classifier for WakaTime.

| Outcome | Terminal |
| --- | --- |
| 401 | `fail_run` |
| 403 / 429 / 302 / 202 / 5xx | `fail_after_backoff` |
| 404 / 400 | `fail_widget` |
| 200 with `is_up_to_date` false | `fail_after_backoff` |

#### Scenario: wakatime 401 fails the run
- **WHEN** WakaTime returns HTTP 401
- **THEN** the run MUST fail

#### Scenario: wakatime 403 429 302 202 and 5xx fail after backoff
- **WHEN** WakaTime returns HTTP 403, 429, 302, 202, or 5xx
- **THEN** the client MUST retry with backoff and then fail (not skip the widget)

#### Scenario: wakatime 404 and 400 fail the widget
- **WHEN** WakaTime returns HTTP 404 or 400
- **THEN** that widget MUST fail and MUST NOT write output

#### Scenario: 200 with is_up_to_date false fails after backoff
- **WHEN** WakaTime returns HTTP 200 with `is_up_to_date` false
- **THEN** the client MUST fail-after-backoff

### Requirement: wakatime api_domain SSRF protections
`api_domain` MUST be a hostname only. The client MUST construct https URLs itself and MUST NEVER interpolate a user path, scheme, port, or userinfo into the request URL. Literal IPs, `localhost`, `.local` labels, metadata hosts, and private/link-local resolved addresses MUST fail closed. DNS lookup MUST reject private IPs before fetch. Fetch MUST use `redirect: "error"`.

#### Scenario: localhost http and path injection fail closed
- **WHEN** `api_domain` is `localhost`, uses `http://`, contains a path, userinfo, port, literal IP, or metadata host
- **THEN** parse and/or the client MUST fail closed and MUST NOT send the request

#### Scenario: DNS private IP fails before fetch
- **WHEN** an otherwise allowed hostname resolves to a private, loopback, link-local, or metadata IP
- **THEN** the client MUST fail before fetch

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

### Requirement: query-key scheme sends the secret as ?key=
Auth scheme `query-key` MUST authenticate by setting the URL query parameter `key` to the trimmed token. Catalog auth for a query-key source MUST be `required`. Every request MUST include `key` in the query string. The client MUST NEVER send `Authorization` (not Bearer, not Basic, not a raw scheme prefix). The client MUST NEVER put the secret in a header. `http-optional` Bearer MUST NOT be used to transmit a query-key secret. Empty / `""` / whitespace tokens MUST be treated as missing. When a query-key pack is on and the token is missing, the Action MUST fail the job (`fail_job`) and MUST NOT send. When the pack is absent, the token MUST NOT be required. Playground and docs preview MUST use fixtures or skip live query-key fetches. `POST /api/preview` remains layout preview, not a public embed API.

#### Scenario: query-key request uses ?key= and no Authorization
- **WHEN** a query-key integration performs HTTP with a non-empty token
- **THEN** the request URL MUST include query parameter `key` set to the trimmed token and MUST NOT include an `Authorization` header

#### Scenario: Bearer is not used for query-key secrets
- **WHEN** a query-key integration is given a token that would be valid as an http-optional Bearer value
- **THEN** the client MUST still send that value only as `?key=` and MUST NOT send `Authorization: Bearer`

#### Scenario: missing token with pack on fails the job
- **WHEN** a query-key pack is enabled and the token is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send a request

#### Scenario: pack absent does not require token
- **WHEN** yaml omits the query-key pack
- **THEN** a missing token MUST NOT fail the job

#### Scenario: existing query params keep key last-write from the scheme
- **WHEN** the request URL already has query parameters, including an existing `key`
- **THEN** the client MUST set `key` to the trimmed token (overwriting any caller-supplied `key`) and MUST preserve other query parameters

#### Scenario: Playground never live query-key by default
- **WHEN** the docs playground previews a query-key widget
- **THEN** it MUST use fixtures or skip live fetches and MUST NOT treat `POST /api/preview` as a public embed API

### Requirement: query-key cache and logs never store the secret
A query-key REST cache key MUST be `(method, url, params, auth)` where `auth` is `"query-key"` (never the token). The URL and params in the cache key MUST omit query parameter `key`. Same-run cache hits MUST skip fetch. Logs MUST pass the token to the existing secret redactor and MUST NOT print the raw key. Callers MUST NOT put `key` in yaml headers.

#### Scenario: cache auth is query-key never the secret
- **WHEN** a query-key REST request is cached
- **THEN** the cache key MUST include `auth` `"query-key"` and MUST NOT include the token value

#### Scenario: cache url and params omit key
- **WHEN** a request is sent with `?key=` and other query parameters
- **THEN** the cached URL and params MUST omit `key` and MUST still distinguish other params

#### Scenario: logs redact the query-key token
- **WHEN** a query-key client logs a URL, error, or header dump
- **THEN** the log MUST NOT contain the raw token

### Requirement: oauth-refresh exchanges a refresh token for a Bearer access token
Scheme `oauth-refresh` MUST exchange a refresh token plus client credentials for an access token, then send `Authorization: Bearer ${access_token}` on resource requests. The consumer integration OpenSpec MUST name the token endpoint. The token request MUST use `grant_type=refresh_token`. The refresh token MUST NOT be sent as `Authorization`. The refresh token MUST NOT be sent as `?key=` or `?api_key=`. `oauth-refresh` MUST NOT reuse `http-optional` (http-optional sends the secret as Bearer or raw on the resource request). Catalog auth for an `oauth-refresh` consumer MUST be `required`. `decideActionToken` MUST remain GitHub-only. Shared export names MUST match the other schemes: `{{ID}}_AUTH`, `is{{Id}}TokenMissing`, `assert{{Id}}ActionToken`, `{{id}}AuthorizationHeader`, `{{id}}RequiresAuthorization`. `{{id}}AuthorizationHeader` MUST take the access token, not the refresh token. `{{id}}RequiresAuthorization()` MUST be true.

#### Scenario: Resource request uses access-token Bearer
- **WHEN** an oauth-refresh client calls a resource API after a successful token refresh
- **THEN** the request MUST include `Authorization: Bearer ${access_token}` and MUST NOT send the refresh token in that header

#### Scenario: Refresh token is not a query key
- **WHEN** an oauth-refresh client refreshes or fetches
- **THEN** it MUST NOT put the refresh token, client secret, or access token in `?key=` or `?api_key=`

#### Scenario: http-optional is not reused
- **WHEN** OpenSpec names scheme `oauth-refresh`
- **THEN** the client MUST exchange the refresh token at the named token endpoint with `grant_type=refresh_token` and MUST NOT send the refresh token as http-optional Bearer on the resource request

#### Scenario: decideActionToken stays GitHub-only
- **WHEN** oauth-refresh auth helpers run
- **THEN** they MUST NOT call `decideActionToken`

### Requirement: oauth-refresh secrets never persist or log
Refresh token, access token, and client secret MUST NEVER appear in logs, widget payloads, typed dumps, or cache keys. Client id is a public env name and MUST NOT be written into yaml or widget payloads. Access tokens MUST NOT persist across Action runs. In-run memory is allowed to hold the access token. Secrets MUST NEVER persist on disk. Cache keys MUST NOT include secret values.

#### Scenario: Secrets stay out of logs and dumps
- **WHEN** an oauth-refresh client refreshes or fetches
- **THEN** logs, widget payloads, typed dumps, and cache keys MUST NOT contain the refresh token, access token, or client secret

#### Scenario: Access token does not persist across runs
- **WHEN** an Action run ends
- **THEN** the access token MUST NOT be written to disk or reused on the next run

### Requirement: oauth-refresh missing credentials fail the job when the pack is on
Empty / `""` / whitespace refresh token MUST be missing. Empty / `""` / whitespace client id or client secret MUST be missing. When a pack that uses `oauth-refresh` is on and the refresh token or client credentials are missing, the Action MUST `fail_job` and MUST NOT send the token request or resource requests. When that pack is absent, missing credentials MUST NOT fail the job. Playground and docs preview MUST use fixtures or skip live oauth-refresh and MUST NOT treat `POST /api/preview` as a public embed API. Header helpers that omit Authorization MUST return `{}` and MUST NOT return `{ Authorization: "" }`.

#### Scenario: Missing token with pack on fails the job
- **WHEN** yaml enables a pack that uses `oauth-refresh` and the refresh token is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send unauthenticated or refresh-less requests

#### Scenario: Pack absent does not require token
- **WHEN** yaml omits the pack that would use `oauth-refresh`
- **THEN** a missing refresh token MUST NOT fail the job

#### Scenario: Missing client credentials fail the job when pack is on
- **WHEN** yaml enables a pack that uses `oauth-refresh` and the client id or client secret env is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send the token request

#### Scenario: Playground is not an embed API
- **WHEN** the docs playground previews an oauth-refresh widget
- **THEN** it MUST use fixtures or skip live and MUST NOT treat `POST /api/preview` as a public embed API

### Requirement: oauth-refresh client credentials are named env not yaml
Client id and client secret MUST come from named environment variables declared by the consumer integration OpenSpec. They MUST NOT appear in yaml. They MUST NOT become flattened `plugin_<plugin>_<widget>_<option>` Action inputs or extra Marketplace Action inputs. This change MUST NOT add a first-party pack, widget, or integration id.

#### Scenario: Client credentials are not yaml
- **WHEN** an oauth-refresh consumer is configured
- **THEN** client id and client secret MUST NOT be yaml keys

#### Scenario: No flattened Action inputs
- **WHEN** oauth-refresh is specified
- **THEN** the system MUST NOT add `plugin_<plugin>_<widget>_<option>` inputs and MUST NOT add extra Marketplace flatten names for client id or client secret

#### Scenario: No first-party id in this change
- **WHEN** this change lands
- **THEN** `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, and `FIRST_PARTY_INTEGRATION_IDS` MUST NOT gain a new id from this change

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

### Requirement: wakatime cache is the full stats data dump
The wakatime run cache MUST store the unsliced stats `data` object from
the allowed stats GET. The dump MUST keep, when the source returns them:
`total_seconds`, `human_readable_total`, daily averages, `best_day`,
`categories`, `machines`, `dependencies`, range metadata, `languages`,
`editors`, `projects`, `operating_systems`, and per-slice `percent`,
`text`, and `digital`. Fetch MUST NOT apply yaml `include` or `limit`.
Fetch MUST NOT omit unrequested slices. Fetch MUST NOT invent `0` for
missing keys. The dump MUST keep API key `operating_systems` (yaml token
`os` maps in the widget reader). Widgets MUST only read this cache.
Secrets MUST NEVER persist. This change MUST NOT add a first-party
plugin, widget, or integration id. Wave 2 MUST extend live
`packages/integrations/src/wakatime/client.ts` and MUST NOT run
`author-integration add` for `wakatime`.

#### Scenario: Fixture percent and text survive parse
- **WHEN** a stats fixture or live 200 body includes per-slice `percent`
  and `text` plus `best_day`, `categories`, and `machines`
- **THEN** the cached dump MUST keep those fields after parse and MUST
  NOT drop them because `include` omitted a sibling slice

#### Scenario: Include does not slice the cache
- **WHEN** yaml `include` is `[languages]` and the stats body also
  contains `editors`, `projects`, and `operating_systems`
- **THEN** the cached dump MUST still contain `editors`, `projects`, and
  `operating_systems` and MUST NOT invent `0` for omitted include tokens

#### Scenario: Fetch does not apply limit
- **WHEN** yaml `limit` is `1` and a slice has more than one row
- **THEN** the cached dump MUST keep the unsliced rows for that field

#### Scenario: No new first-party ids
- **WHEN** this change lands
- **THEN** `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, and
  `FIRST_PARTY_INTEGRATION_IDS` MUST NOT gain a new id from this change

#### Scenario: Wave 2 extends live client.ts
- **WHEN** wave 2 widens integration `wakatime`
- **THEN** it MUST extend live `packages/integrations/src/wakatime/client.ts`
  and MUST NOT run `author-integration add` for `github`, `wakatime`,
  `rss`, or `http`

### Requirement: wakatime extra authenticated endpoints
When `api_domain` is `wakatime.com` (exact, lowercase), the shared
wakatime client MUST fetch these extra authenticated endpoints into the
same typed dump, using the same RFC Basic header and REST cache key
`(method, url, params)`: `all_time_since_today`, bounded `summaries`,
`statusbar/today`, and `goals`. Those URLs MUST be client-constructed
under `https://wakatime.com/api/v1/users/current/`. Summaries `start`/`end`
MUST be bounded to the requested stats `range` and MUST NOT request
unbounded history. Extra endpoints are Cloud-first: when `api_domain` is
not `wakatime.com`, a missing extra path MUST omit that field and MUST
NOT `fail_job` (Wakapi stats path stays). HTTP 404 on an extra endpoint
MUST omit that field and MUST NOT `fail_job`. Insights, if requested,
MUST omit on HTTP 402 or 403 and MUST NOT `fail_job`. The client MUST
NOT fetch heartbeats or durations. Stats HTTP 404 remains `fail_widget`
per the existing WakaTime HTTP matrix. Extra HTTP 401 remains `fail_run`.
The system MUST NOT send `?api_key=` or `?key=` on extra URLs.

#### Scenario: Cloud extra endpoints are fetched
- **WHEN** `api_domain` is `wakatime.com`
- **THEN** the client MUST GET `all_time_since_today`, bounded
  `summaries`, `statusbar/today`, and `goals` under
  `https://wakatime.com/api/v1/users/current/` with RFC Basic

#### Scenario: Summaries are bounded to range
- **WHEN** extra `summaries` are fetched for coding `range` `last_7_days`
- **THEN** `start`/`end` MUST be bounded to that seven-day window and
  MUST NOT request unbounded history

#### Scenario: Wakapi extra 404 omits not fail_job
- **WHEN** `api_domain` is an allowed hostname other than `wakatime.com`
  and an extra endpoint returns HTTP 404
- **THEN** the dump MUST omit that extra field, MUST NOT `fail_job`, and
  the stats request MUST still use the Wakapi compat stats path

#### Scenario: Insights 402 or 403 omit
- **WHEN** an insights request returns HTTP 402 or 403
- **THEN** the dump MUST omit insights and MUST NOT `fail_job`

#### Scenario: Heartbeats and durations are skipped
- **WHEN** the wakatime dump is fetched
- **THEN** the client MUST NOT request heartbeats or durations

### Requirement: wakatime Authorization is RFC Basic
Every wakatime request MUST send `Authorization: Basic` with RFC 7617
credentials: API key as username, empty password
(`base64(api_key + ":")`). The client MUST NOT send the API key as
Bearer, as `?api_key=`, or as `?key=`. The Basic username MUST be the
API key and MUST NOT be an account email. Empty / `""` / whitespace
`wakatime_token` with the wakatime pack on MUST still `fail_job` and
MUST NOT send unauthenticated requests. The system MUST NEVER scrape a
public unauthenticated WakaTime profile. Playground and docs preview
MUST use fixtures or skip live WakaTime and MUST NOT treat
`POST /api/preview` as a public embed API. The system MUST NOT add
flattened `plugin_<plugin>_<widget>_<option>` Action inputs.

#### Scenario: Authorization is Basic not Bearer
- **WHEN** the wakatime integration performs HTTP
- **THEN** every request MUST include `Authorization: Basic` with
  `base64(api_key + ":")` and MUST NOT send Bearer for the API key

#### Scenario: Query key is forbidden
- **WHEN** the wakatime integration performs HTTP
- **THEN** it MUST NOT send `?api_key=` or `?key=`

#### Scenario: Basic username is the API key not email
- **WHEN** RFC Basic credentials are encoded
- **THEN** the username MUST be the API key and MUST NOT be an email
  address

#### Scenario: Pack-on empty token still fail_job
- **WHEN** yaml `plugins.wakatime` is present and `wakatime_token` is
  empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send unauthenticated requests

#### Scenario: Playground is not an embed API
- **WHEN** the docs playground previews the coding widget
- **THEN** it MUST use fixtures or skip live WakaTime and MUST NOT treat
  `POST /api/preview` as a public embed API

### Requirement: wakatime dump never includes email or API keys
Typed dumps, widget payloads, logs, and cache keys MUST NOT contain the
WakaTime API key, the Basic header value, or account email. Secrets MUST
NEVER persist on disk. Cache keys MUST stay `(method, url, params)` and
MUST NOT include the secret.

#### Scenario: Secrets stay out of dumps and logs
- **WHEN** a wakatime client fetches stats or extra endpoints
- **THEN** logs, typed dumps, widget payloads, and cache keys MUST NOT
  contain the API key, Basic header, or account email

### Requirement: rss payload is a feed and item dump
The rss client MUST parse with rss-parser **or equivalent** and MUST NOT use any parser HTTP/fetch helper. The cached payload MUST be an `Object.freeze`d dump `{ feed, items }`, not a leftover array of `{ title, url, published_at }`. `feed` MUST be a frozen object with `title` (string; collapse whitespace, strip tags; empty string if missing), `link` (string; the feed’s HTML page URL; empty string if missing), `description` (string; empty string if missing), `updated` (ISO 8601 string or null), `authors` (frozen array of frozen `{ name, email, url }` with each field string or null), `categories` (frozen array of frozen `{ term, label, url }` with `term` string and `label`/`url` string or null), and `image` (`{ title, url }` with `url` string and `title` string or null, or null). `items` MUST be a frozen array of frozen items. Each item MUST include `id` (string; Atom id or RSS guid; empty string if missing), `title` (string; collapse whitespace, strip tags; empty string if missing), `url` (string; the item’s HTML page link from the parser; empty string if missing), `published_at` (ISO 8601 string or null; map `published ?? updated`), `updated` (ISO 8601 string or null; the item’s updated timestamp, not collapsed away), `content` (string or null; full content when the feed provides it), `summary` (string or null; description/summary when the feed provides it), `authors` (same shape as feed authors), `categories` (same shape as feed categories), and `enclosures` (frozen array of frozen `{ url, type, length }` with `url` string, `type` string or null, `length` number or null). The client MUST return the full frozen dump; the widget MUST slice `items` to `limit`. Extra dump fields MUST remain in cache even when the feed widget does not render them. Secrets MUST NEVER appear in the dump. This change MUST NOT add a first-party plugin, widget, or integration id (`latest` is Wave 3). Wave 2 MUST extend live `packages/integrations/src/rss/client.ts` and MUST NOT run `author-integration add` for `rss`. The Action MUST NOT expose flattened `plugin_<plugin>_<widget>_<option>` inputs such as `plugin_rss_feed_url`.

#### Scenario: dump exposes feed metadata and item fields the leftover triple dropped
- **WHEN** a valid Atom or RSS 2.0 feed is parsed
- **THEN** the payload MUST be a frozen `{ feed, items }` dump that includes feed `title`, `link`, `description`, `updated`, `authors`, `categories`, and `image`, and items MUST include `id`, `content` or `summary` when present in the XML, `authors`, `categories`, `updated`, and `enclosures` rather than only `{ title, url, published_at }`

#### Scenario: Atom content and id survive parse
- **WHEN** an Atom feed item has an `id` and a content body
- **THEN** the cached item MUST expose that `id` and `content` (or `summary` when only a summary is present) and MUST NOT drop them to fit `{ title, url, published_at }`

#### Scenario: leftover triple remains on each dump item
- **WHEN** a valid feed item is parsed
- **THEN** that item MUST still include `{ title, url, published_at }` with ISO `published_at` or null so the feed widget can read the leftover triple

#### Scenario: client returns the unsliced dump
- **WHEN** the rss client loads a feed with more items than a widget `limit`
- **THEN** the cached `items` array MUST contain the full parsed list and MUST NOT be sliced to `limit` inside the client

#### Scenario: parser HTTP helper is never used
- **WHEN** the rss client loads a feed
- **THEN** it MUST parse a fetched XML string and MUST NOT call a parser-owned URL/fetch API

#### Scenario: empty channel is a dump with no items
- **WHEN** a valid feed parses with zero items
- **THEN** the payload MUST be a frozen dump whose `items` array is empty and frozen, and MUST NOT crash

#### Scenario: no author-integration add for live rss dest
- **WHEN** wave 2 widens rss
- **THEN** the system MUST extend live `packages/integrations/src/rss/client.ts` and MUST NOT run `author-integration add` for `rss`

#### Scenario: no new first-party id in this change
- **WHEN** this change lands
- **THEN** `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, and `FIRST_PARTY_INTEGRATION_IDS` MUST NOT gain a new id from this change

### Requirement: http json cache is the full JSON value
The http json cache MUST store the parsed JSON value from a successful GET as-is. An optional typed schema for that dump MUST NOT drop keys. Fetch MUST NOT apply `jmespath` and MUST NOT remove fields so a widget can display a subset. The json widget MUST apply `jmespath` as a reader on that cached dump. Secrets MUST NEVER persist in the dump, logs, or cache keys. Cache keys MUST remain `(method, url, params, auth, headers)` with `auth` `"none"` or `"bearer"` (never the secret).

#### Scenario: json dump keeps keys the card does not show
- **WHEN** a JSON object body has more keys than the json card renders
- **THEN** the cached payload MUST still include every key from the parsed body

#### Scenario: jmespath does not run at fetch
- **WHEN** yaml `widgets.json.jmespath` is not `@`
- **THEN** the http client MUST cache the full parsed JSON value and MUST NOT evaluate that expression

#### Scenario: optional json schema does not strip keys
- **WHEN** the json dump is typed
- **THEN** that schema MUST accept the full JSON value and MUST NOT drop object keys at fetch

### Requirement: chips cache is raw badge JSON
The chips cache MUST store the parsed badge JSON dump, not the render record `{ label, message, color? }`. The dump MUST retain `label`, `message`, `color`, `name`, `value`, and `link` when those keys are present on the body. Fetch MUST NOT map `value` to `message` and MUST NOT drop `name`, `value`, or `link`. Widget-side readers MUST map `message = message ?? value` for render. Chips JSON GETs MUST stay per-request `auth: none` (no `Authorization` on any hop; cache auth `"none"`). Origins MUST stay `shieldcn.dev` and `img.shields.io` in addition to existing SSRF. Shieldcn fixtures MUST keep `link` and `value` in the cached dump. Chips render MUST still use `label`, `message`, and `color`. The system MUST NOT add first-party integration ids `shieldcn` or `shields`. Http modules MUST NOT import octokit. Wave 2 MUST NOT run `author-integration add` for `github`, `wakatime`, `rss`, or `http`.

#### Scenario: shieldcn dump keeps value and link
- **WHEN** the JSON body is `{ "label": "npm", "value": "19.0.0", "link": "https://example.com" }` with no color
- **THEN** the cached dump MUST retain `label`, `value`, and `link` and MUST NOT drop `link` at fetch

#### Scenario: shields dump keeps name and value
- **WHEN** the JSON body is `{ "label": "npm", "message": "v19.0.0", "color": "blue", "name": "npm", "value": "v19.0.0" }`
- **THEN** the cached dump MUST retain `name` and `value` in addition to `label`, `message`, and `color`

#### Scenario: chips GET auth remains none
- **WHEN** chips loads expanded CDN URLs
- **THEN** each GET MUST set per-request auth `none`, MUST send no `Authorization` on any hop, and MUST key the cache as `"none"`

#### Scenario: no extra vendor integration
- **WHEN** chips and json run
- **THEN** they MUST share integration `http` and MUST NOT add ids `shieldcn` or `shields`

### Requirement: Elbow integration ids and auth
`FIRST_PARTY_INTEGRATION_IDS` MUST include `spotify`, `leetcode`, `chesscom`, `lichess`, and `steam` in addition to `static`, `github`, `wakatime`, `rss`, and `http`. `INTEGRATION_AUTH` MUST be `required` for `spotify` and `steam`, and `none` for `leetcode`, `chesscom`, and `lichess`. There MUST NOT be an integration id `chess`. Catalog auth MUST NOT add `plugin_*_*_*` inputs. Empty GitHub tokens MUST still fail the job. REST `/languages` MUST stay forbidden. Playwright MUST NOT enter the Action runtime.

#### Scenario: Integration catalog includes elbow ids
- **WHEN** live `FIRST_PARTY_INTEGRATION_IDS` is read
- **THEN** it MUST contain `spotify`, `leetcode`, `chesscom`, `lichess`, and `steam` and MUST NOT contain `chess`

#### Scenario: Auth requirements
- **WHEN** `INTEGRATION_AUTH` is read
- **THEN** `spotify` and `steam` MUST be `required` and `leetcode`, `chesscom`, and `lichess` MUST be `none`

#### Scenario: Locks stay
- **WHEN** elbow integrations are catalogued
- **THEN** the system MUST NOT call GitHub unauthenticated, MUST NOT call REST `/languages`, MUST NOT add `plugin_<plugin>_<widget>_<option>` inputs, and MUST NOT put Playwright in the Action

### Requirement: Required-auth elbow tokens stay thin
Spotify MUST use Action `spotify_token` (refresh, no default) plus yaml `token_env` (http pattern) and named env client id/secret (not yaml). Steam MUST use Action `steam_token` (no default) plus yaml `token_env` and query-key `?key=` (not Bearer). Missing token with that pack on MUST `fail_job`. Pack absent MUST NOT require the token. Secrets MUST NOT persist in dumps, logs, or cache keys.

#### Scenario: Missing spotify token with pack on fails the job
- **WHEN** yaml enables pack `spotify` and `spotify_token` is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send unauthenticated Spotify requests

#### Scenario: Missing steam token with pack on fails the job
- **WHEN** yaml enables pack `steam` and `steam_token` is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send a request

#### Scenario: Pack absent does not require elbow tokens
- **WHEN** yaml omits `plugins.spotify` and `plugins.steam`
- **THEN** missing `spotify_token` or `steam_token` MUST NOT fail the job

### Requirement: Spotify uses oauth-refresh at the named token URL
Spotify MUST use scheme `oauth-refresh` (not `oauth2`, not `http-optional`). The token endpoint MUST be `https://accounts.spotify.com/api/token`. The token request MUST use `grant_type=refresh_token` and MUST send client id/secret as HTTP Basic (not as yaml, not as `?key=` / `?api_key=`). The refresh token MUST NOT be sent as `Authorization`. After a successful refresh, resource requests MUST send `Authorization: Bearer ${access_token}`. `spotifyAuthorizationHeader` MUST take the access token, not the refresh token. `spotifyRequiresAuthorization()` MUST be true. Catalog auth MUST remain `required`. `decideActionToken` MUST remain GitHub-only. Dest `packages/integrations/src/spotify/client.ts` MAY be created only when it is absent.

#### Scenario: Token request uses refresh_token grant
- **WHEN** the Spotify client exchanges credentials for an access token
- **THEN** it MUST POST `https://accounts.spotify.com/api/token` with `grant_type=refresh_token` and MUST NOT send the refresh token as Bearer on that request

#### Scenario: Resource request uses access-token Bearer
- **WHEN** the Spotify client calls currently-playing, recently-played, or top tracks after a successful refresh
- **THEN** the request MUST include `Authorization: Bearer ${access_token}` and MUST NOT send the refresh token in that header

#### Scenario: oauth2 and http-optional are not used
- **WHEN** Spotify auth is applied
- **THEN** `{{scheme}}` MUST be `oauth-refresh` and the client MUST NOT reuse `http-optional` or invent `auth.oauth2.ts.template`

### Requirement: Spotify complete dump of player and top tracks
The Spotify cache MUST be a complete dump of allowed JSON from `GET /v1/me/player/currently-playing`, `GET /v1/me/player/recently-played`, and `GET /v1/me/top/tracks`. Widgets MUST NOT HTTP. Include/limit MUST run in the widget. Album art URLs MUST remain in the dump. Extra keys MUST NOT fail dump parse. Secrets MUST NOT appear in the dump. REST `/languages` MUST stay forbidden. Playwright MUST NOT enter the Action runtime.

#### Scenario: Dump keeps currently-playing, recently-played, and top tracks
- **WHEN** the Spotify client fetches
- **THEN** the typed dump MUST include currently-playing, recently-played, and top-tracks JSON (204 currently-playing MAY be `null`)

#### Scenario: Album art URLs stay in the dump
- **WHEN** a track object in the dump has `album.images`
- **THEN** those image URLs MUST remain in the cached dump for the Image bit to read

#### Scenario: Extra dump keys do not fail parse
- **WHEN** the dump includes unexpected keys
- **THEN** parse MUST succeed and widgets MUST still read known fields

### Requirement: Spotify secrets never persist or log
Refresh token, access token, and client secret MUST NEVER appear in logs, widget payloads, typed dumps, or cache keys. Client id MUST NOT be written into yaml or widget payloads. Access tokens MUST NOT persist across Action runs. In-run memory MAY hold the access token. Cache keys MUST use `auth` `"bearer"` (never the secret). Header helpers that omit Authorization MUST return `{}` and MUST NOT return `{ Authorization: "" }`.

#### Scenario: Logs omit the refresh token
- **WHEN** the Spotify client refreshes or fetches and an error is thrown or logged
- **THEN** the message MUST NOT contain the refresh token, access token, or client secret

#### Scenario: Cache key omits secrets
- **WHEN** a Spotify resource GET is cached
- **THEN** the cache key MUST NOT include the refresh token, access token, or client secret

### Requirement: Missing Spotify credentials fail the job when the pack is on
Empty / `""` / whitespace `spotify_token` MUST be missing. Empty / `""` / whitespace `SPOTIFY_CLIENT_ID` or `SPOTIFY_CLIENT_SECRET` MUST be missing. When yaml enables pack `spotify` and the refresh token or client credentials are missing, the Action MUST `fail_job` and MUST NOT send the token request or resource requests. When pack `spotify` is absent, missing credentials MUST NOT fail the job. Playground and docs preview MUST use fixtures or skip live oauth-refresh and MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: Missing spotify_token with pack on fails the job
- **WHEN** yaml enables pack `spotify` and `spotify_token` is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send unauthenticated Spotify requests

#### Scenario: Missing client credentials fail the job when pack on
- **WHEN** yaml enables pack `spotify` and `SPOTIFY_CLIENT_ID` or `SPOTIFY_CLIENT_SECRET` is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send the token request

#### Scenario: Pack absent does not require Spotify credentials
- **WHEN** yaml omits `plugins.spotify`
- **THEN** missing `spotify_token` or client credentials MUST NOT fail the job

#### Scenario: Playground is not an embed API
- **WHEN** the docs playground previews a Spotify widget
- **THEN** it MUST use fixtures or skip live oauth-refresh and MUST NOT treat `POST /api/preview` as a public embed API

### Requirement: Spotify client credentials are named env not yaml
Client id MUST come from named env `SPOTIFY_CLIENT_ID`. Client secret MUST come from named env `SPOTIFY_CLIENT_SECRET`. They MUST NOT appear in yaml. They MUST NOT become flattened `plugin_<plugin>_<widget>_<option>` Action inputs or extra Marketplace Action inputs. Action `spotify_token` MUST remain optional with **no default**. Yaml `plugins.spotify.token_env` MUST remain an env **name** (http pattern), not a token value, and MUST NOT be `INPUT_*`.

#### Scenario: Client credentials are not yaml
- **WHEN** Spotify is configured
- **THEN** yaml MUST NOT contain client id, client secret, or a refresh token value

#### Scenario: No flattened Action inputs
- **WHEN** Spotify is specified
- **THEN** the system MUST NOT add `plugin_spotify` or `plugin_<plugin>_<widget>_<option>` inputs

### Requirement: LeetCode fetch is GraphQL POST with auth none
Integration `leetcode` MUST fetch by `POST https://leetcode.com/graphql` with a JSON body `{ query, variables }`. Catalog auth MUST be `none`. Every GraphQL request MUST omit `Authorization` and MUST NOT send `{ Authorization: "" }`. The client MUST NOT send Bearer, Basic, or a query-key secret. There MUST NOT be a `leetcode_token` Action input. Username MUST travel in GraphQL `variables` (not interpolated into the URL). GraphQL cache key MUST be `(query, variables)` and MUST NOT be `POST /graphql` alone. Secrets MUST NEVER persist in the dump, logs, or cache keys. Wave 2 MUST NOT run `author-integration add` for `github`, `wakatime`, `rss`, or `http`. This change MUST NOT add flattened `plugin_<plugin>_<widget>_<option>` Action inputs. Pack agents MUST NOT edit `packages/core/src/types.ts`.

#### Scenario: GraphQL POST to leetcode.com
- **WHEN** the leetcode integration loads a payload
- **THEN** it MUST `POST https://leetcode.com/graphql` with JSON `{ query, variables }` and MUST NOT use integration `http` or GitHub GraphQL

#### Scenario: Auth none sends no Authorization
- **WHEN** a leetcode GraphQL request is sent
- **THEN** the request MUST NOT include an `Authorization` header and MUST NOT send `{ Authorization: "" }`

#### Scenario: Username is a GraphQL variable
- **WHEN** yaml `plugins.leetcode.user` or Action `user` names a LeetCode username
- **THEN** that value MUST be a GraphQL variable and MUST NOT be interpolated into the GraphQL URL

#### Scenario: GraphQL cache key is query and variables
- **WHEN** a leetcode GraphQL request is cached
- **THEN** the cache key MUST be `(query, variables)` and MUST NOT be `POST /graphql` alone

#### Scenario: No leetcode_token or flatten
- **WHEN** this change lands
- **THEN** the system MUST NOT add `leetcode_token`, MUST NOT add a `plugin_leetcode` bool, and MUST NOT add `plugin_<plugin>_<widget>_<option>` Action inputs

#### Scenario: Wave 2 does not author-integration add live dests
- **WHEN** wave 2 extends github, wakatime, rss, or http
- **THEN** it MUST NOT run `author-integration add` for those ids

#### Scenario: Pack agents do not edit types.ts
- **WHEN** a Wave 3 leetcode pack agent runs
- **THEN** it MUST NOT edit `packages/core/src/types.ts`

### Requirement: LeetCode cached payload is the complete public GraphQL dump
The leetcode cached typed payload MUST be a dump of public GraphQL JSON, not a leftover widget slice. Widgets MUST select fields from that dump. Include/limit filters MUST stay widget-side and MUST NOT drop dump fields at fetch.

The dump MUST include complete fields from these public operations when the GraphQL JSON returns them:

- public profile (`matchedUser` / `userPublicProfile`): `username`; profile `ranking`, `userAvatar`, `realName`, `aboutMe`, `school`, `websites`, `countryName`, `company`, `jobTitle`, `skillTags`, `reputation`, `solutionCount`; `allQuestionsCount` `{ difficulty, count }`; `submitStatsGlobal.acSubmissionNum` `{ difficulty, count, submissions }`; `problemsSolvedBeatsStats` `{ difficulty, percentage }`
- contest ranking (`userContestRanking` / `userContestRankingHistory`): `attendedContestsCount`, `rating`, `globalRanking`, `totalParticipants`, `topPercentage`, `badge.name`; history `attended`, `problemsSolved`, `rating`, `ranking`, `contest.title`, `contest.startTime`
- submission calendar (`userProfileCalendar` / `userCalendar`): `activeYears`, `streak`, `totalActiveDays`, `submissionCalendar`
- recent AC (`recentAcSubmissionList`): `id`, `title`, `titleSlug`, `timestamp`

Missing GraphQL fields MUST be omitted and MUST NOT be invented as `0`. Docs and playground MUST default to fixtures.

#### Scenario: Dump keeps public profile fields
- **WHEN** GraphQL returns `matchedUser` profile, `allQuestionsCount`, and `submitStatsGlobal`
- **THEN** the cached payload MUST include those complete fields and MUST NOT drop them because widget `solved` renders a slice

#### Scenario: Dump keeps contest ranking
- **WHEN** GraphQL returns `userContestRanking` and `userContestRankingHistory`
- **THEN** the cached payload MUST include those complete fields

#### Scenario: Dump keeps submission calendar
- **WHEN** GraphQL returns `userCalendar.submissionCalendar`
- **THEN** the cached payload MUST include `activeYears`, `streak`, `totalActiveDays`, and `submissionCalendar`

#### Scenario: Dump keeps recent AC
- **WHEN** GraphQL returns `recentAcSubmissionList`
- **THEN** the cached payload MUST include `id`, `title`, `titleSlug`, and `timestamp` for each item

#### Scenario: Missing fields are omitted not invented
- **WHEN** a public GraphQL field is absent
- **THEN** the dump MUST omit it and MUST NOT invent `0`

### Requirement: LeetCode Cloudflare 403 is fail_widget not fail_job
HTTP 403 or a Cloudflare challenge on the leetcode GraphQL POST MUST `fail_widget` and MUST NOT `fail_job`. That outcome MUST NOT use GitHub `fail_after_backoff`. Other enabled widgets in the same run MUST still render. HTTP 404 or GraphQL HTTP 200 with a missing `matchedUser` MUST `fail_widget`. Empty / `""` / whitespace username when pack `leetcode` is on MUST `fail_widget` and MUST NOT send. When pack `leetcode` is absent, a missing username MUST NOT fail the job. Playground and docs preview MUST use fixtures or skip live leetcode fetches and MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: GraphQL 403 fails the widget not the job
- **WHEN** `POST https://leetcode.com/graphql` returns HTTP 403 or a Cloudflare challenge
- **THEN** the outcome MUST be `fail_widget` and MUST NOT be `fail_job`

#### Scenario: Cloudflare 403 is not GitHub fail_after_backoff
- **WHEN** leetcode GraphQL is blocked with HTTP 403
- **THEN** the client MUST NOT classify that as GitHub `fail_after_backoff`

#### Scenario: Unknown user fails the widget
- **WHEN** GraphQL returns HTTP 404 or HTTP 200 with a missing `matchedUser`
- **THEN** the outcome MUST be `fail_widget`

#### Scenario: Missing username with pack on fails the widget
- **WHEN** yaml enables pack `leetcode` and the username is empty, `""`, or whitespace
- **THEN** the outcome MUST be `fail_widget` and the client MUST NOT send

#### Scenario: Pack absent does not require a username
- **WHEN** yaml omits `plugins.leetcode`
- **THEN** a missing LeetCode username MUST NOT fail the job

#### Scenario: Playground is not an embed API
- **WHEN** the docs playground previews a leetcode widget
- **THEN** it MUST use fixtures or skip live and MUST NOT treat `POST /api/preview` as a public embed API

### Requirement: HTML scrape is SSRF fallback only
HTML scrape of a LeetCode public profile MUST run only after GraphQL is blocked (HTTP 403 / Cloudflare). The fallback MUST be `https` GET through the existing html-scrape SSRF gates (manual redirects, DNS pin, 1 MiB, no private IPs, no GitHub-owned hosts). Extracted fields MUST map into the same typed dump. HTML scrape MUST NOT be the primary fetch when GraphQL succeeds. Login walls, ToS-hostile/challenge pages, and scrape failures MUST `fail_widget`. Path segments MUST use `encodeURIComponent` on the username. The fallback MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: Scrape is not the primary path
- **WHEN** GraphQL POST succeeds
- **THEN** the client MUST NOT HTML-scrape the profile for that dump

#### Scenario: Scrape runs only after GraphQL is blocked
- **WHEN** leetcode GraphQL returns HTTP 403 or a Cloudflare challenge
- **THEN** the client MAY GET the public profile HTML through html-scrape SSRF and MUST NOT fetch HTML first

#### Scenario: Scrape uses existing SSRF gates
- **WHEN** the HTML fallback runs
- **THEN** it MUST use the existing html-scrape SSRF gates and MUST be `https` GET

#### Scenario: Scrape maps into the same dump
- **WHEN** HTML scrape succeeds after GraphQL is blocked
- **THEN** extracted fields MUST map into the same typed leetcode dump

#### Scenario: Scrape failure still fails the widget
- **WHEN** the HTML fallback hits a login wall, ToS-hostile page, or SSRF denial
- **THEN** the outcome MUST be `fail_widget` and MUST NOT be `fail_job`

### Requirement: LeetCode must not use community proxies or Playwright
The leetcode integration MUST call `leetcode.com` directly. It MUST NOT use a community proxy, third-party LeetCode API, or CORS relay. Playwright MUST NOT enter the Action runtime or the leetcode fetch path. Node HTML parsing through html-scrape is the only allowed scrape implementation.

#### Scenario: No community proxy
- **WHEN** leetcode data is fetched
- **THEN** the client MUST NOT call a community proxy and MUST POST GraphQL to `leetcode.com` (HTML scrape SSRF fallback only)

#### Scenario: No Playwright in the Action
- **WHEN** leetcode fetch or HTML fallback runs
- **THEN** it MUST NOT use Playwright and Playwright MUST NOT enter the Action runtime

### Requirement: chesscom integration is auth-none JSON with User-Agent
Integration `chesscom` MUST use auth `none`. It MUST GET JSON from
`https://api.chess.com` only. Every chess.com request MUST send identifying
header `User-Agent: profile-bits-chesscom/0 (+https://github.com/wyattowalsh/profile-bits)`
and MUST NOT send `Authorization` (including `Authorization: ""`). Yaml MUST
NOT add a chess token or `plugin_*_*_*` inputs. Empty GitHub tokens MUST
still fail the job. REST `/languages` MUST stay forbidden. Playwright MUST
NOT enter the Action runtime. Dest `packages/integrations/src/chesscom/client.ts`
MAY be created only when that file is absent. Wave 2/3 MUST NOT run
`author-integration add` for `github`, `wakatime`, `rss`, or `http`.

#### Scenario: chesscom sends User-Agent and no Authorization
- **WHEN** the chesscom client GETs player, stats, or games JSON
- **THEN** each request MUST include the identifying Chess.com User-Agent and
  MUST omit the Authorization header

#### Scenario: chesscom does not call GitHub
- **WHEN** chesscom loads a dump
- **THEN** it MUST NOT call GitHub, MUST NOT call REST `/languages`, and MUST
  NOT send unauthenticated GitHub requests

### Requirement: chesscom dump is player plus stats plus games
The chesscom cache MUST store the parsed JSON from player, stats, current
games, archives, and recent games as-is. An optional typed schema MUST NOT
drop keys. Widgets MUST read that dump and MUST NOT HTTP. Secrets MUST NEVER
persist in the dump, logs, or cache keys. REST cache keys MUST be
`(method, url, params, auth, headers)` with `auth` `"none"` (never a secret).

#### Scenario: dump keeps extra player and stats keys
- **WHEN** player or stats JSON includes keys the ratings card does not render
- **THEN** the cached dump MUST still include those keys

#### Scenario: dump includes current or recent game fields
- **WHEN** chess.com returns current and/or recent games with `fen` and `pgn`
- **THEN** the cached dump MUST retain `fen` and `pgn` for the game widget

### Requirement: chesscom username is not a fetch URL
Chess.com requests MUST interpolate a validated username into pinned paths
`/pub/player/{username}` (and stats/games suffixes). Usernames MUST match
`^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$` after trim. Path segments MUST use
`encodeURIComponent`. Archive URLs discovered in dump JSON MUST be
`https://api.chess.com` with no userinfo and a `/pub/` path; any other host
MUST `fail_widget` without fetching. The system MUST NOT accept a
user-controlled chess fetch URL in yaml.

#### Scenario: evil username does not leave api.chess.com
- **WHEN** yaml `user` is `https://evil.example/pwn` or contains `/`, `@`, or `:`
- **THEN** the client MUST fail the widget and MUST NOT send HTTP

#### Scenario: foreign archive URL is refused
- **WHEN** an archives list entry is `https://evil.example/games`
- **THEN** the client MUST fail the widget and MUST NOT fetch that URL

### Requirement: lichess integration is auth-none JSON
Integration `lichess` MUST use auth `none`. It MUST GET JSON from
`https://lichess.org` only (`/api/user/{username}`, current game, recent
games). It MUST send a non-empty User-Agent and MUST NOT send
`Authorization`. The dump MUST keep the parsed user object (including
`perfs`) plus current/recent game JSON without dropping extra keys. Missing
current-game (HTTP 404) MUST store an empty current object and MUST NOT fail
the whole dump. Unknown user (HTTP 404 on `/api/user/{username}`) MUST
`fail_widget`. Usernames MUST use the same identifier gate as chesscom.
Playwright MUST NOT enter the Action. REST `/languages` MUST stay forbidden.

#### Scenario: lichess dump keeps perfs extra keys
- **WHEN** the user JSON includes `perfs` plus keys the card does not render
- **THEN** the cached dump MUST still include those keys

#### Scenario: lichess current-game 404 is optional
- **WHEN** Lichess returns 404 for the current-game path and 200 for the user
- **THEN** the dump MUST keep the user object and MUST NOT fail the widget
  solely because no live game exists

#### Scenario: lichess username cannot target another host
- **WHEN** yaml `user` contains `/`, `@`, `:`, or a URL
- **THEN** the client MUST fail the widget and MUST NOT send HTTP

### Requirement: steam client authenticates with query-key ?key=
Integration `steam` MUST use auth scheme `query-key`. Catalog auth MUST
be `required`. Every Steam Web API request MUST set URL query parameter
`key` to the trimmed Action `steam_token` (yaml `token_env` names the
process env that may supply that secret). The client MUST NEVER send
`Authorization` (not Bearer, not Basic, not a raw scheme prefix). The
client MUST NEVER put the secret in a header. `http-optional` Bearer
MUST NOT transmit a Steam key. The client MUST NOT fold Steam into
integration `http`. Empty / `""` / whitespace `steam_token` MUST be
treated as missing. When yaml enables pack `steam` and the token is
missing, the Action MUST fail the job (`fail_job`) and MUST NOT send.
When the pack is absent, the token MUST NOT be required. Requests MUST
use `https://api.steampowered.com` only. The system MUST NEVER call
GitHub unauthenticated and MUST NEVER call REST
`/repos/{owner}/{repo}/languages` on this path. Playground and docs
preview MUST use fixtures or skip live Steam fetches. `POST /api/preview`
remains layout preview, not a public embed API.

#### Scenario: steam request uses ?key= and no Authorization
- **WHEN** the steam integration performs HTTP with a non-empty
  `steam_token`
- **THEN** the request URL MUST include query parameter `key` set to the
  trimmed token and MUST NOT include an `Authorization` header

#### Scenario: Bearer is not used for steam keys
- **WHEN** the steam integration is given a token that would be valid as
  an http-optional Bearer value
- **THEN** the client MUST still send that value only as `?key=` and
  MUST NOT send `Authorization: Bearer`

#### Scenario: missing steam_token with pack on fails the job
- **WHEN** yaml enables pack `steam` and `steam_token` is empty, `""`,
  or whitespace
- **THEN** the job MUST fail and MUST NOT send a request

#### Scenario: pack absent does not require steam_token
- **WHEN** yaml omits `plugins.steam`
- **THEN** a missing `steam_token` MUST NOT fail the job

#### Scenario: steam host is api.steampowered.com
- **WHEN** the steam client constructs a Web API URL
- **THEN** the origin MUST be `https://api.steampowered.com` and MUST
  NOT call GitHub or REST `/repos/{owner}/{repo}/languages`

#### Scenario: Playground never live steam by default
- **WHEN** the docs playground previews a steam widget
- **THEN** it MUST use fixtures or skip live fetches and MUST NOT treat
  `POST /api/preview` as a public embed API

### Requirement: steam cache and logs never store the Web API key
A steam REST cache key MUST be `(method, url, params, auth)` where
`auth` is `"query-key"` (never the token). The URL and params in the
cache key MUST omit query parameter `key`. Same-run cache hits MUST skip
fetch. Logs MUST pass the token to the existing secret redactor and MUST
NOT print the raw key. Typed dumps, widget payloads, and fixtures MUST
NOT contain `steam_token`. Callers MUST NOT put `key` in yaml headers.
Yaml `token_env` MUST be a process environment variable name, not a
token value, and MUST NOT be `INPUT_*`.

#### Scenario: cache auth is query-key never the secret
- **WHEN** a steam REST request is cached
- **THEN** the cache key MUST include `auth` `"query-key"` and MUST NOT
  include the token value

#### Scenario: cache url and params omit key
- **WHEN** a steam request is sent with `?key=` and other query
  parameters
- **THEN** the cached URL and params MUST omit `key` and MUST still
  distinguish other params

#### Scenario: logs redact the steam token
- **WHEN** a steam client logs a URL, error, or header dump
- **THEN** the log MUST NOT contain the raw `steam_token`

#### Scenario: dumps omit the key
- **WHEN** the steam dump is written to cache or fixtures
- **THEN** it MUST NOT contain `steam_token` or query parameter `key`

### Requirement: steam cached payload is the Steam Web API dump
The steam cached typed payload MUST be a complete dump of allowed Steam
Web API JSON, not a leftover widget slice. Widgets MUST select fields
from that dump and MUST NOT perform HTTP. Include/limit MUST stay
widget-side and MUST NOT drop dump fields at fetch. Secrets MUST NEVER
persist. Extra keys the API returns MUST NOT fail parse.

The shared client MUST GET these methods on
`https://api.steampowered.com` with query-key `?key=`:

- `ISteamUser/ResolveVanityURL/v1` when yaml `plugins.steam.user` is
  present and is not a 17-digit steamid64 (request keeps `vanityurl`;
  dump keeps `success`, `steamid`, and `message` when returned)
- `ISteamUser/GetPlayerSummaries/v2` (request keeps `steamids`; dump
  keeps each `players[]` object including `steamid`, `personaname`,
  `profileurl`, `avatar`, `avatarmedium`, `avatarfull`, `avatarhash`,
  `personastate`, `communityvisibilitystate`, `profilestate`,
  `lastlogoff`, `timecreated`, `realname`, `primaryclanid`,
  `loccountrycode`, `gameid`, and `gameextrainfo` when returned)
- `IPlayerService/GetRecentlyPlayedGames/v1` (request keeps `steamid`;
  dump keeps `total_count` and each `games[]` object including `appid`,
  `name`, `playtime_2weeks`, `playtime_forever`, `img_icon_url`, and
  `img_logo_url` when returned)

Yaml `plugins.steam.user` is the Steam vanity or steamid64. Action
`user` is the GitHub login and MUST NOT be used as a Steam identity.
When yaml `user` is already a 17-digit steamid64, ResolveVanityURL MUST
be skipped. One steam client instance MUST be shared per Action or
playground run. Wave 3 MAY run `author-integration add steam` only when
dest `packages/integrations/src/steam/client.ts` is absent. Wave 2 MUST
NOT run `author-integration add` for `github`, `wakatime`, `rss`, or
`http`. This change MUST NOT add flattened
`plugin_<plugin>_<widget>_<option>` Action inputs.

#### Scenario: GetPlayerSummaries dump keeps profile fields
- **WHEN** `ISteamUser/GetPlayerSummaries/v2` returns `personaname`,
  `avatarfull`, `profileurl`, and `personastate`
- **THEN** the cached payload MUST include those fields and MUST NOT
  drop them because widget `player` does not render every key

#### Scenario: GetRecentlyPlayedGames dump keeps games
- **WHEN** `IPlayerService/GetRecentlyPlayedGames/v1` returns
  `total_count` and `games[]` with `appid`, `name`, `playtime_2weeks`,
  and `img_icon_url`
- **THEN** the cached payload MUST include those fields

#### Scenario: ResolveVanityURL dump when user is vanity
- **WHEN** yaml `plugins.steam.user` is a vanity name rather than a
  17-digit steamid64
- **THEN** the client MUST GET `ISteamUser/ResolveVanityURL/v1` and the
  dump MUST keep `success`, `steamid`, and `message` when returned

#### Scenario: steamid64 skips ResolveVanityURL
- **WHEN** yaml `plugins.steam.user` is a 17-digit steamid64
- **THEN** the client MUST NOT call ResolveVanityURL for that run

#### Scenario: Action user is not a Steam id
- **WHEN** Action `user` is set and yaml `plugins.steam.user` is unset
- **THEN** the steam client MUST NOT treat the GitHub login as a Steam
  vanity or steamid64

#### Scenario: Fetch does not apply recent limit
- **WHEN** yaml `plugins.steam.widgets.recent.limit` is `1` and
  GetRecentlyPlayedGames returns more than one game
- **THEN** the cached dump MUST keep the unsliced `games[]` list

#### Scenario: Widgets select from the steam dump
- **WHEN** widgets `player` or `recent` render
- **THEN** they MUST select fields from the cached dump and MUST NOT
  perform HTTP

#### Scenario: Wave 3 adds steam only when dest client.ts is absent
- **WHEN** dest `packages/integrations/src/steam/client.ts` is absent
- **THEN** Wave 3 MAY run `author-integration add steam` with scheme
  `query-key` and MUST NOT run `author-integration add` for `github`,
  `wakatime`, `rss`, or `http`
