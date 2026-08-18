## ADDED Requirements

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

#### Scenario: origin allowlist does not replace SSRF
- **WHEN** an expanded URL is fetched
- **THEN** the existing http SSRF checks MUST still run in addition to the origin allowlist

#### Scenario: shieldcn value maps to message
- **WHEN** the JSON body is `{ "label": "npm", "value": "19.0.0", "link": "https://example.com" }` with no color
- **THEN** normalize MUST yield message `19.0.0`, MUST ignore `link`, and MUST omit color so render uses theme accent
