## REMOVED Requirements

### Requirement: wakatime payload is totals plus requested include slices

**Reason**: The leftover sliced payload dropped dump fields at fetch
(`include`/`limit` ran in the client). The cache could not keep
`percent`, `best_day`, `categories`, `machines`, `dependencies`, range
metadata, or unrequested slices for later widgets.

**Migration**: Replace this requirement with `wakatime cache is the full
stats data dump`. Cache the unsliced stats `data` object. Move
include/limit to the coding widget reader (`widget-contract`). Downstream
W2-WK-02+ implement payload types, extra endpoints, fixtures, and the
reader. Do not archive from this node.

## ADDED Requirements

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
