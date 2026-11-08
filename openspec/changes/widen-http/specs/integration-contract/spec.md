## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Chips reuse integration http with no new integration id
Widget `chips` MUST declare integration `http` only. The system MUST NOT add first-party integration ids `shieldcn`, `shields`, or any id beyond `static`, `github`, `wakatime`, `rss`, and `http`. Chips MUST GET JSON through the existing shared http client (one instance per Action, playground, or generate preview run). Auth MUST remain `optional` on integration `http`. Chips MUST NOT introduce a second HTTP client, MUST NOT import octokit from the http module, and MUST NOT add a new thin Action token input. N types MUST expand to N https GET JSON requests that share the existing run-scoped cache and single-flight, issued concurrently (`Promise.all`). Those GETs MUST cache the raw parsed JSON dump and MUST NOT normalize to `{ label, message, color? }` at fetch. Widget-side readers MUST map `message = message ?? value` after the cache. Flattened `plugin_<plugin>_<widget>_<option>` Action inputs MUST NOT be added.

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

#### Scenario: shieldcn cache keeps value and link
- **WHEN** the JSON body is `{ "label": "npm", "value": "19.0.0", "link": "https://example.com" }` with no color
- **THEN** the cached dump MUST retain `label`, `value`, and `link` and MUST NOT drop `link` at fetch

#### Scenario: shieldcn value maps to message
- **WHEN** the JSON body is `{ "label": "npm", "value": "19.0.0", "link": "https://example.com" }` with no color
- **THEN** the cached dump MUST retain `label`, `value`, and `link`; widget-side normalize MUST yield message `19.0.0`, MUST ignore `link` as chrome, and MUST omit color so render uses theme accent

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
