## Purpose

Defines the fixtures-only `/playground/http` chips explorer: preset and type tuners, baked Takumi SVG from `chipFixture`, yaml and README copy targets, and an appended `http` preview plugin id without changing the github catalog or landing redirect.

## ADDED Requirements

### Requirement: Http playground route is fixtures-only chips explorer
The docs app MUST serve `/playground/http` as a chips explorer for pack `http` widget `chips`. The explorer MUST offer a preset switcher (`shieldcn` | `shields`), type checkboxes (`npm` | `stars` | `forks` | `license` | `release` | `issues` | `prs` | `ci`), and package, repo, and workflow fields. Preview MUST render baked Takumi SVG from chip fixture JSON. The explorer MUST NOT fetch `shieldcn.dev`, `img.shields.io`, or any other live URL. The explorer MUST NOT proxy vendor images or embed live vendor URLs.

#### Scenario: Visitor opens http playground
- **WHEN** a visitor requests `/playground/http`
- **THEN** the app MUST serve the chips explorer for pack `http` with preset, types, package, repo, and workflow controls

#### Scenario: Preview uses chip fixtures only
- **WHEN** the explorer renders a chips preview
- **THEN** it MUST use chip fixture JSON for the selected preset and types and MUST NOT perform an outbound HTTP request

#### Scenario: Vendor hosts are not fetch targets
- **WHEN** the explorer source and runtime are inspected
- **THEN** they MUST NOT use `shieldcn.dev` or `img.shields.io` as fetch targets and MUST NOT embed live vendor image URLs

### Requirement: Dual pane baked SVG and copy rail
The http playground MUST show dual-pane baked SVG produced by chips render from fixture payloads (`renderChipsFromPayloads` / `renderChipsSvg` or equivalent baked bytes). The codegen rail MUST include yaml under `plugins.http.widgets.chips` and README markdown `![](./profile-bits/chips.svg)`. Primary CTA MUST be Copy. The rail MUST NOT emit live vendor URLs or token fields.

#### Scenario: Dual pane shows baked SVG
- **WHEN** the explorer has at least one selected type
- **THEN** both preview panes MUST display baked SVG bytes from chip fixtures and MUST NOT display a live vendor image

#### Scenario: Yaml rail names chips widget
- **WHEN** the explorer emits config yaml
- **THEN** the yaml MUST include `plugins.http.widgets.chips` with the selected preset and types

#### Scenario: README rail is relative chips embed
- **WHEN** the explorer emits README markdown
- **THEN** the markdown MUST include `![](./profile-bits/chips.svg)` and MUST NOT include a remote image URL

### Requirement: Preview plugin ids append http without changing github catalog
Docs `PREVIEW_PLUGIN_IDS` MUST be `["github", "http"]` (append, not replace). `CATALOG_PLUGIN_ID` MUST remain `github` (`PREVIEW_PLUGIN_IDS[0]`). Github-only `PREVIEW_WIDGET_IDS` MUST remain `demo`, `stats`, and `languages`. Http playground widget ids MUST stay local to `/playground/http` (`json` and/or `chips`) and MUST NOT be added to `PREVIEW_WIDGET_IDS`. `http_token_env` and `http_token` MUST remain in `PREVIEW_TOKEN_QUERY_KEYS`. `PLAYGROUND_PLUGIN` MUST remain `github`.

#### Scenario: Preview plugin ids include github then http
- **WHEN** docs preview plugin ids are read
- **THEN** they MUST equal `["github", "http"]`

#### Scenario: Catalog stays github pack
- **WHEN** `/generate/catalog` is shown
- **THEN** the catalog plugin MUST be `github` and catalog widgets MUST remain `demo`, `stats`, and `languages`

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
