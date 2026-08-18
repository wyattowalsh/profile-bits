## ADDED Requirements

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
