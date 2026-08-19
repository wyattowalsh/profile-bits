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
