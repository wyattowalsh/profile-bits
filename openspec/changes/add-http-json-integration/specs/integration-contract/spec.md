## ADDED Requirements

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
- **WHEN** the docs playground previews the json widget
- **THEN** it MUST use fixtures with zero live URLs and MUST NOT add a `/playground/http` UI in this change

### Requirement: http request cache and single-flight
The http client MUST cache GET responses with key `(method, url, params, auth, headers)` for the run, where `auth` is `"none"` or `"bearer"` (never the secret) and `headers` are the canonicalized yaml extra headers (sorted, lowercase names). Concurrent callers of the same key MUST share one in-flight GET (single-flight). `params` MUST be sorted URL search params. Yaml headers MUST be forwarded on the GET.

#### Scenario: http cache key is method url params auth headers
- **WHEN** an http request is cached
- **THEN** the cache key MUST be `(method, url, params, auth, headers)` with `auth` `"none"` or `"bearer"`, MUST include canonicalized yaml headers, and MUST NOT include the token value

#### Scenario: yaml headers are sent on GET
- **WHEN** `widgets.json.headers` contains allowed extra headers
- **THEN** the GET MUST include those headers and MUST NOT reuse a cached body from the same URL with a different header set

#### Scenario: in-flight single-flight
- **WHEN** two callers request the same url on one http client instance before the GET completes
- **THEN** the client MUST issue one GET and MUST share that result

### Requirement: http https SSRF protections
Http fetch MUST use https only. Redirects MUST use `redirect: "manual"` semantics: each hop MUST re-validate scheme, host, and resolved IPs; at most 5 hops; https→http MUST fail the widget. DNS lookup MUST return all A/AAAA records. Every address MUST be public unicast after IPv4-mapped conversion; loopback, link-local, private (`192.168.0.0/16` not `/8`), CGNAT, unique-local, multicast, unspecified, reserved, and IPv4-mapped forms of those ranges MUST fail the widget before connect. Mixed public A plus private AAAA MUST fail closed. The validated address set MUST be the addresses used for the TCP/TLS connection (DNS-rebinding pin). TLS server name MUST be the original hostname. Fetch MUST abort after the widget `timeout_ms` (default 10000, max 20000). The client MUST abort if `Content-Length` exceeds 1048576 bytes or if accumulated (decompressed) body bytes exceed 1 MiB. Requests MUST send `User-Agent: profile-bits-http/0` and `Accept: application/json`. Metadata hostnames `metadata.google.internal`, `metadata.internal`, and `169.254.169.254` MUST fail before connect.

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

### Requirement: http HTTP skip and fail matrix
Http HTTP outcomes MUST follow this matrix. Fail-after-backoff for http MUST retry with backoff then **fail the widget** (not `fail_job` / `fail_run`). A single json 429 or 5xx MUST NOT fail github widgets or the whole job unless json is the only enabled widget (see plugin-contract http-only non-render).

| Outcome | Terminal |
| --- | --- |
| 401 / 404 | `fail_widget` (no retry) |
| 403 / 429 / 5xx | retry then `fail_widget` |
| 2xx non-JSON | `fail_widget` (no retry) |
| timeout / SSRF | `fail_widget` |
| JSON / jmespath throw | `fail_widget` (not skip) |

Backoff MUST be 3 attempts at 200/400/800ms, honoring `Retry-After` capped at 10s.

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
