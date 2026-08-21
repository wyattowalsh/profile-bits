## ADDED Requirements

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
