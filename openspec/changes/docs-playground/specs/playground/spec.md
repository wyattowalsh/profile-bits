## Purpose

Defines the docs codegen playground: Fumadocs routes and three-column UI, `POST /api/preview` as a layout/time-axis preview (not a stable embed or Camo oracle), fixture-or-App GitHub access, README-mode baked bytes, permalink query strings, and schema-derived `llms.txt`.

## ADDED Requirements

### Requirement: Fumadocs shadcn Tailwind chrome
The docs playground MUST be a Fumadocs application using shadcn and Tailwind for docs chrome. Docs chrome MUST NOT be the README widget runtime. Widgets MUST render through Takumi (`renderSvg` / `render` / `renderAnimation`), not through docs DOM primitives.

#### Scenario: Playground chrome is Fumadocs
- **WHEN** a visitor opens the docs playground
- **THEN** the page MUST be served by the Fumadocs docs app with shadcn and Tailwind chrome

#### Scenario: Docs chrome is not widget runtime
- **WHEN** a widget is previewed
- **THEN** the widget MUST be Takumi output and MUST NOT be rendered as a docs-chrome React tree in place of `renderSvg` / `renderAnimation` bytes

### Requirement: Playground routes
The docs app MUST serve `/playground` and `/playground/github`. `/playground` MUST redirect to `/playground/github`. The app MUST also serve `/playground/github/[widget]` for a v0 widget id (`demo`, `stats`, or `languages`). v0 pack id MUST be `github` only.

#### Scenario: Playground landing redirects to github pack
- **WHEN** a visitor requests `/playground`
- **THEN** the app MUST redirect to `/playground/github`

#### Scenario: Github pack playground is canonical
- **WHEN** a visitor requests `/playground/github`
- **THEN** the app MUST serve the codegen playground for the `github` plugin

#### Scenario: Widget playground route
- **WHEN** a visitor requests `/playground/github/stats` (or `demo` or `languages`)
- **THEN** the app MUST serve the playground scoped to that widget

### Requirement: Three-column codegen layout
The playground MUST present three columns:

- **Left:** plugin selector, then widget checkboxes, then schema forms, then an integration panel.
- **Center:** Takumi preview, theme toggle (`light` | `dark`), pair mode (`output_pair`), and a format picker.
- **Right:** generated thin workflow YAML, generated `.github/profile-bits.yml`, and README markdown the user pastes, each with copy buttons.

Primary CTA MUST be Copy. The playground MUST NOT use Download or Share as the primary CTA.

#### Scenario: Left column order
- **WHEN** the playground is shown
- **THEN** the left column MUST offer plugin selection, then widget checkboxes, then schema forms, then an integration panel — in that order

#### Scenario: Center preview controls
- **WHEN** the playground is shown
- **THEN** the center column MUST show a Takumi preview plus a theme toggle, pair mode, and a format picker

#### Scenario: Right column export targets
- **WHEN** the playground is shown
- **THEN** the right column MUST show thin workflow YAML, `.github/profile-bits.yml`, and README markdown, each with a copy button

#### Scenario: Copy is primary CTA
- **WHEN** the playground presents actions
- **THEN** Copy MUST be the primary CTA and Download/Share MUST NOT be the primary CTA

### Requirement: Format picker includes motion formats
The format picker MUST include `gif`, `apng`, and animated `webp` in addition to still formats. Motion previews MUST use real `renderAnimation` bytes. The playground MUST NOT fake motion with a CSS loop on a still PNG. `apng` MUST be served/named as PNG (`Content-Type: image/png`).

#### Scenario: Motion formats are selectable
- **WHEN** the visitor opens the format picker
- **THEN** it MUST include `gif`, `apng`, and animated `webp`

#### Scenario: Motion preview is renderAnimation bytes
- **WHEN** the visitor selects `gif`, `apng`, or animated `webp`
- **THEN** the preview MUST display bytes produced by `renderAnimation` and MUST NOT animate a still PNG with CSS

### Requirement: Preview POST is not a stable embed API
Widget preview MUST be `POST /api/preview`. The playground MUST NOT be a public embed API, CDN, or zip downloader. `GET /api/preview` MUST be rejected. Responses MUST send `Cache-Control: no-store` and `X-Robots-Tag: noindex`. The playground MUST NOT expose GET image URLs or OG image hosts for widgets.

#### Scenario: POST preview is accepted
- **WHEN** the playground requests a preview via `POST /api/preview`
- **THEN** the server MUST accept the POST and MUST NOT treat the route as a stable public embed API

#### Scenario: GET preview is rejected
- **WHEN** a client sends `GET /api/preview`
- **THEN** the server MUST reject the request

#### Scenario: Preview is not cacheable as embed
- **WHEN** `POST /api/preview` responds
- **THEN** the response MUST include `Cache-Control: no-store` and `X-Robots-Tag: noindex`

### Requirement: Preview body has no token fields
The preview POST body and permalink object MUST include `scope` (`plugin` | `widget` | `bit`), yaml-shaped `options`, `format`, `theme`, `output_pair`, and `user`. They MUST NOT include token fields. v0 `plugin` MUST be `github`; widget MUST be `demo` | `stats` | `languages`. Response MUST be `{ files: { id, mime, bytesBase64, filename }[], provenance: fixture | live | rate_limited, generatedAt }`.

#### Scenario: POST body omits tokens
- **WHEN** the playground posts a preview body
- **THEN** the body MUST include `scope`, `options`, `format`, `theme`, `output_pair`, and `user` and MUST NOT include token fields

#### Scenario: Preview response lists files and provenance
- **WHEN** `POST /api/preview` succeeds
- **THEN** the response MUST include `files` with `id`, `mime`, `bytesBase64`, and `filename`, plus `provenance` of `fixture` | `live` | `rate_limited` and `generatedAt`

### Requirement: No App token uses fixtures with zero outbound GitHub
When no GitHub App token is configured, preview MUST use static fixtures and MUST send **zero outbound GitHub** requests. The playground MUST NEVER call GitHub unauthenticated (60 requests/hour per IP). Fixture provenance MUST be visible (fixture pill). Fixtures MUST wrap the `static` integration pack and MUST NOT introduce a second JSON fixture pack.

#### Scenario: Missing App token uses fixtures
- **WHEN** no GitHub App token is configured and a visitor previews github widgets
- **THEN** the server MUST render from static fixtures, MUST send zero outbound GitHub requests, and MUST show fixture provenance

#### Scenario: Unauthenticated GitHub is forbidden
- **WHEN** preview needs github widget data
- **THEN** the server MUST NOT send an unauthenticated GitHub request

### Requirement: App token caches GitHub by login with TTL
When a GitHub App token exists, preview MAY fetch GitHub for the requested login and MUST cache that payload by login with a TTL. On GitHub 403 / rate-limit, the server MUST fall back to fixtures and show rate-limited provenance rather than sending unauthenticated requests. One github client MUST be used per preview request. `include_private` without capability MUST fail that widget.

#### Scenario: Live fetch is cached by login
- **WHEN** an App token exists and preview fetches GitHub for a login
- **THEN** the server MUST cache the GitHub payload by that login with a TTL

#### Scenario: Rate limit shows fixtures
- **WHEN** GitHub returns 403 or rate-limit while an App token exists
- **THEN** the preview MUST fall back to fixtures and MUST report `rate_limited` provenance

### Requirement: Visitor tokens stay in sessionStorage and are never logged
Visitor-pasted tokens MUST be stored in `sessionStorage` only. The playground MUST NEVER put tokens in the permalink query string, POST body, generated YAML, generated README, or server logs. Cross-links that swap `/playground` with `/generate` MUST keep the same query and MUST strip tokens.

#### Scenario: Pasted token is sessionStorage only
- **WHEN** a visitor pastes a token in the playground
- **THEN** the token MUST be stored in `sessionStorage` only and MUST NOT appear in the URL, preview POST body, generated YAML, or generated README

#### Scenario: Tokens are never logged
- **WHEN** preview or playground code handles a visitor token
- **THEN** the system MUST NOT log the token

#### Scenario: Cross-link strips tokens
- **WHEN** the visitor follows a cross-link between `/playground` and `/generate`
- **THEN** the link MUST reuse the permalink query, MUST swap only the path prefix, and MUST NOT include tokens

### Requirement: Dual pane WASM layout and README mode
The center preview MUST offer two panes: (a) WASM layout preview and (b) README mode. README mode MUST show the actual `renderSvg` and/or `renderAnimation` bytes plus a constraint checklist. The playground MUST be a layout and time-axis preview. It MUST NOT claim to be a Camo, `?sanitize=true`, or README HTML-sanitizer oracle.

#### Scenario: WASM layout pane
- **WHEN** the visitor selects the layout pane
- **THEN** the center MUST show a WASM Takumi layout preview

#### Scenario: README mode shows baked bytes
- **WHEN** the visitor selects README mode
- **THEN** the center MUST show actual `renderSvg` and/or `renderAnimation` bytes and a constraint checklist

#### Scenario: Playground is not a Camo oracle
- **WHEN** README mode explains GitHub README constraints
- **THEN** it MUST present a checklist of baked-output constraints and MUST NOT claim the playground predicts Camo or sanitize rewriting

### Requirement: ImageResponse is docs-only stills
`ImageResponse` MUST be used only on the docs preview path for still frames. Animated formats MUST use `renderAnimation` and return those file bytes. The Action MUST NOT depend on `ImageResponse`.

#### Scenario: Still docs preview may use ImageResponse
- **WHEN** the docs preview renders a still frame
- **THEN** it MAY use `ImageResponse` for that still and MUST NOT use `ImageResponse` as the animation pipeline

#### Scenario: Animation preview returns renderAnimation file
- **WHEN** the docs preview renders `gif`, `apng`, or animated `webp`
- **THEN** it MUST return `renderAnimation` file bytes

### Requirement: Permalink is query string only
Playground state MUST be shareable as a permalink `URLSearchParams` query string (scope, plugin/widget/bit, options, format, theme, `output_pair`, user). Tokens MUST NEVER appear in the query string. The playground MUST NOT use GET image URLs as permalinks.

#### Scenario: Permalink round-trips tuners
- **WHEN** a visitor copies the playground permalink and opens it
- **THEN** plugin, widget, options, format, theme, pair mode, and user MUST restore from the query string

#### Scenario: Permalink has no tokens
- **WHEN** a permalink is generated
- **THEN** the query string MUST NOT contain token fields

### Requirement: llms.txt from schemas
Docs MUST publish `llms.txt` derived from plugin/widget option schemas (not hand-copied option lists).

#### Scenario: llms.txt reflects schemas
- **WHEN** docs are generated
- **THEN** `llms.txt` MUST be produced from plugin and widget schemas
