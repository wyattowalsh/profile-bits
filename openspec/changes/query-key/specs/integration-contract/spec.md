## ADDED Requirements

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
