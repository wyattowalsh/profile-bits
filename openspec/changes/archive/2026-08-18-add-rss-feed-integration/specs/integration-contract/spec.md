## ADDED Requirements

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
