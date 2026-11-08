## MODIFIED Requirements

### Requirement: Playground routes
The docs app MUST serve `/playground` and `/playground/{plugin}` for first-party packs `github`, `wakatime`, `rss`, and `http`. `/playground` MUST redirect to `/playground/github`. The app MUST serve `/playground/{plugin}/[widget]` for that pack’s widgets: github `demo` / `stats` / `languages` / `repo`; wakatime `coding`; rss `feed`; http `json` / `chips`. The landing redirect MUST remain github. Widget ids MUST stay per pack (MUST NOT add `coding`, `feed`, `json`, or `chips` to github widget ids).

#### Scenario: Playground landing redirects to github
- **WHEN** a visitor requests `/playground`
- **THEN** the app MUST redirect to `/playground/github`

#### Scenario: Github pack playground is canonical landing
- **WHEN** a visitor requests `/playground/github`
- **THEN** the app MUST serve the codegen playground for the `github` plugin

#### Scenario: Wakatime playground route
- **WHEN** a visitor requests `/playground/wakatime` or `/playground/wakatime/coding`
- **THEN** the app MUST serve the codegen playground for the `wakatime` pack widget `coding`

#### Scenario: Rss playground route
- **WHEN** a visitor requests `/playground/rss` or `/playground/rss/feed`
- **THEN** the app MUST serve the codegen playground for the `rss` pack widget `feed`

#### Scenario: Http playground route
- **WHEN** a visitor requests `/playground/http`, `/playground/http/chips`, or `/playground/http/json`
- **THEN** the app MUST serve the codegen playground for the `http` pack

#### Scenario: Widget playground route
- **WHEN** a visitor requests `/playground/github/stats` (or `demo`, `languages`, or `repo`)
- **THEN** the app MUST serve the playground scoped to that widget

### Requirement: Three-column codegen layout
The playground MUST present three columns:

- **Left:** plugin selector for all four packs, then that pack’s widget checkboxes, then schema forms, then an integration panel.
- **Center:** Takumi preview, theme controls, pair mode (`output_pair`), and a format picker.
- **Right:** generated thin workflow YAML, generated `.github/profile-bits.yml`, and README markdown the user pastes, each with copy buttons.

Primary CTA MUST be Copy. The playground MUST NOT use Download or Share as the primary CTA. The plugin selector MUST change the pack (MUST NOT be a single disabled `github` option).

#### Scenario: Left column order
- **WHEN** the playground is shown
- **THEN** the left column MUST offer plugin selection, then widget checkboxes, then schema forms, then an integration panel — in that order

#### Scenario: Plugin selector lists four packs
- **WHEN** the playground plugin selector is shown
- **THEN** it MUST offer `github`, `wakatime`, `rss`, and `http`

#### Scenario: Copy is primary CTA
- **WHEN** the playground presents actions
- **THEN** Copy MUST be the primary CTA and Download/Share MUST NOT be the primary CTA

### Requirement: Preview body has no token fields
The preview POST body and permalink object MUST include `scope` (`plugin` | `widget` | `bit`), yaml-shaped `options`, `format`, `theme`, `output_pair`, and `user`. They MUST NOT include token fields. `plugin` MUST be a first-party pack id. Github widgets MUST be `demo` | `stats` | `languages` | `repo`. Wakatime widget MUST be `coding`. Rss widget MUST be `feed`. Http widgets MUST be `json` | `chips`. Response MUST be `{ files: { id, mime, bytesBase64, filename }[], provenance: fixture | live | rate_limited, generatedAt }`.

#### Scenario: POST body omits tokens
- **WHEN** the playground posts a preview body
- **THEN** the body MUST include `scope`, `options`, `format`, `theme`, `output_pair`, and `user` and MUST NOT include token fields

#### Scenario: Preview response lists files and provenance
- **WHEN** `POST /api/preview` succeeds
- **THEN** the response MUST include `files` with `id`, `mime`, `bytesBase64`, and `filename`, plus `provenance` of `fixture` | `live` | `rate_limited` and `generatedAt`

### Requirement: Default preview uses non-empty fixtures
When no live preview credential or typed live URL applies, preview MUST render non-empty fixtures: github static octocat (including `repo` from `repos[0]`), wakatime `last_7_days`, rss Atom XML, http `chipFixture` / json sample. Default fixture SVGs MUST NOT use empty-state copy (`No data`, `No coding data`, `No feed items`, `No repo data`, `No language data`). Empty-state copy MUST remain for empty payloads only. GitHub without an App token MUST send zero outbound GitHub requests.

#### Scenario: Missing App token uses fixtures
- **WHEN** no GitHub App token is configured and a visitor previews github widgets
- **THEN** the server MUST render from static fixtures, MUST send zero outbound GitHub requests, and MUST show fixture provenance

#### Scenario: Default coding preview is non-empty
- **WHEN** a visitor previews wakatime `coding` without a server WakaTime preview token
- **THEN** the SVG MUST render the `last_7_days` fixture and MUST NOT contain `No coding data`

#### Scenario: Default feed preview is non-empty
- **WHEN** a visitor previews rss `feed` without a typed live https url
- **THEN** the SVG MUST render the Atom fixture and MUST NOT contain `No feed items`
