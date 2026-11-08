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
| JSON / jmespath throw | `fail_widget` (not skip) |

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

### Requirement: Chips reuse integration http with no new integration id
Widget `chips` MUST declare integration `http` only. The system MUST NOT add first-party integration ids `shieldcn`, `shields`, or any id beyond `static`, `github`, `wakatime`, `rss`, and `http`. Chips MUST GET JSON through the existing shared http client (one instance per Action, playground, or generate preview run). Auth MUST remain `optional` on integration `http`. Chips MUST NOT introduce a second HTTP client, MUST NOT import octokit from the http module, and MUST NOT add a new thin Action token input. N types MUST expand to N https GET JSON requests that share the existing run-scoped cache and single-flight, issued concurrently (`Promise.all`), then normalized to `{ label, message, color? }` with `message = message ?? value`.

#### Scenario: chips uses integration http only
- **WHEN** widget `chips` is registered
- **THEN** its integrations list MUST be `["http"]` and MUST NOT include a new integration id

#### Scenario: chips shares the existing http client
- **WHEN** json and chips run in the same Action run
- **THEN** they MUST share one http client instance and MUST NOT construct a vendor-specific client

#### Scenario: N types issue N cached GETs
- **WHEN** a chips widget has N unique types after dedupe
- **THEN** the client MUST perform at most N GET JSON calls for that widget, MUST share cache/single-flight with other http callers, and MUST issue those GETs concurrently

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

Live JSON shapes the expander MUST accept: shieldcn npm `{ label, value, link }` with no color; shields `{ label, message, color, name, value }`. Tests MUST use fixtures and MUST NOT perform live network.

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
- **THEN** normalize MUST yield message `19.0.0`, MUST ignore `link`, and MUST omit color so render uses theme accent

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

### Requirement: wakatime payload is totals plus requested include slices
The client MUST consume `data.total_seconds`, `data.human_readable_total`, plus named slices for requested include keys only. `os` MUST map from `operating_systems`. Each slice MUST be sorted by `total_seconds` descending and capped at `limit`. Unrequested keys MUST be omitted entirely. The client MUST NOT invent `0` for omitted include tokens.

#### Scenario: requested include slices only
- **WHEN** `include` is `[languages, editors]` and the API body also contains `projects` and `operating_systems`
- **THEN** the payload MUST expose totals plus languages and editors only and MUST NOT invent `0` for omitted keys

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
