# http-chips-playground Specification

## Purpose
Defines the fixtures-only `/playground/http` chips explorer: preset and type tuners, baked Takumi SVG from `chipFixture`, yaml and README copy targets, and an appended `http` preview plugin id without changing the github catalog or landing redirect.

## Requirements

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

#### Scenario: Dual pane shows baked SVG
- **WHEN** the explorer has at least one selected type
- **THEN** both preview panes MUST display baked SVG bytes from chip fixtures and MUST NOT display a live vendor image

#### Scenario: Yaml rail names chips widget
- **WHEN** the explorer emits config yaml
- **THEN** the yaml MUST include `plugins.http.widgets.chips` with the selected preset and types

#### Scenario: README rail is relative chips embed
- **WHEN** the explorer emits README markdown
- **THEN** the markdown MUST include `![](./profile-bits/chips.svg)` and MUST NOT include a remote image URL

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

### Requirement: Playground landing still redirects to github
`/playground` MUST continue to redirect to `/playground/github`. The landing page source MUST NOT contain the string `/playground/http`. Visitors reach the http explorer only via `/playground/http`.

#### Scenario: Landing redirect is unchanged
- **WHEN** a visitor requests `/playground`
- **THEN** the app MUST redirect to `/playground/github`

#### Scenario: Landing source omits http playground path
- **WHEN** the `/playground` landing page source is inspected
- **THEN** it MUST NOT contain the string `/playground/http`
