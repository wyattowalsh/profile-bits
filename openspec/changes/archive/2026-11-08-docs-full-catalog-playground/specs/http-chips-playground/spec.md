## MODIFIED Requirements

### Requirement: Http playground route is a first-class pack
The docs app MUST serve `/playground/http` as the codegen playground for pack `http` (widgets `json` and `chips`) using the shared PlaygroundShell. Fixtures MUST remain the no-network default (`chipFixture` for chips; a committed json sample for `json`). Live vendor fetch MUST use the http client origin allowlist / SSRF path only (env `PREVIEW_HTTP_LIVE` for chips; typed https `url` for json). The explorer MUST NOT proxy arbitrary vendor images or embed live vendor image URLs in the README rail.

#### Scenario: Visitor opens http playground
- **WHEN** a visitor requests `/playground/http`
- **THEN** the app MUST serve the codegen playground for pack `http` with json and chips widget tuners

#### Scenario: Preview uses chip fixtures by default
- **WHEN** chips preview runs without `PREVIEW_HTTP_LIVE`
- **THEN** it MUST use chip fixture JSON for the selected preset and types and MUST NOT perform an outbound HTTP request

#### Scenario: Vendor hosts are not GET embed targets
- **WHEN** the explorer README rail is inspected
- **THEN** it MUST NOT embed live `shieldcn.dev` or `img.shields.io` image URLs

### Requirement: Dual pane baked SVG and copy rail
The http playground MUST show dual-pane baked SVG produced by chips/json render. The codegen rail MUST include yaml under `plugins.http.widgets` and README markdown with relative `profile-bits/` embeds. Primary CTA MUST be Copy.

#### Scenario: Yaml rail names http widgets
- **WHEN** the explorer emits config yaml for chips
- **THEN** the yaml MUST include `plugins.http.widgets.chips` with the selected preset and types

### Requirement: Preview plugin ids are all first-party packs
Docs `PREVIEW_PLUGIN_IDS` MUST be `["github", "wakatime", "rss", "http"]`. Catalog MUST list all four packs and eight widgets. Github-only widget ids MUST remain `demo`, `stats`, `languages`, and `repo`. Http widgets MUST stay off the github preview widget list. `http_token_env` and `http_token` MUST remain in `PREVIEW_TOKEN_QUERY_KEYS`.

#### Scenario: Preview plugin ids include four packs
- **WHEN** docs preview plugin ids are read
- **THEN** they MUST equal `["github", "wakatime", "rss", "http"]`

#### Scenario: Catalog lists all packs
- **WHEN** `/generate/catalog` is shown
- **THEN** it MUST list packs `github`, `wakatime`, `rss`, and `http` and widgets `demo`, `stats`, `languages`, `repo`, `coding`, `feed`, `json`, and `chips`

#### Scenario: Http widgets stay off the github preview union
- **WHEN** github preview widget ids are read
- **THEN** they MUST NOT include `json` or `chips`

#### Scenario: Http secret query keys remain denied
- **WHEN** a permalink is built from query keys
- **THEN** `http_token_env` and `http_token` MUST be treated as secret keys and MUST NOT round-trip
