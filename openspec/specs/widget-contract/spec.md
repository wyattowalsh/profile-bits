# widget-contract Specification

## Purpose

Defines a widget as one Takumi template plus a frozen option schema, including v0 demo/stats/languages fields, skip-without-write, and fail-closed private/contributions behavior.

## Requirements

### Requirement: Widget is one template plus option schema
A widget MUST have an id, title, description, option schema, integrations list, size, formats, defaults, fetch, render, and examples. A widget MUST bind to exactly one Takumi template. Root Takumi node MUST use `width: 100%` and `height: 100%`. Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`.

#### Scenario: Widget declares a single template
- **WHEN** a widget is registered
- **THEN** it MUST expose one option schema and one Takumi template and MUST list the integrations it consumes

### Requirement: Card size and default format
Default card size MUST be 480×160. Default format MUST be `svg`. Required formats MUST include `svg`, `png`, `jpeg`, `webp` (still and animated), `ico`, `gif`, and `apng`. Takumi SVG MUST be a baked still: `renderSvg()` emits outlined glyphs / geometry with no `<style>`, no `@keyframes`, no SMIL, and no `foreignObject`. CSS `@keyframes` are authoring input to `render()` / `renderAnimation()`, not GitHub SVG runtime.

#### Scenario: Default card is 480 by 160 svg
- **WHEN** a widget renders with no size or format override
- **THEN** the output MUST be a 480×160 SVG still

#### Scenario: Takumi SVG is baked still
- **WHEN** default SVG output is produced
- **THEN** the file MUST NOT contain `<style>`, `@keyframes`, SMIL, or `foreignObject`

### Requirement: Frozen demo widget options
Widget `demo` MUST use integration `static` only. Options MUST be: `text` (default `profile-bits`), optional `subtitle`, and `animate` bool default true. Fetch MUST be none. `demo` MUST be opt-in and MUST smoke every Takumi file format including gif, apng, and animated webp.

#### Scenario: Demo defaults
- **WHEN** `demo` is enabled with no option overrides
- **THEN** `text` MUST be `profile-bits`, `animate` MUST be true, and no GitHub HTTP MUST be performed

### Requirement: Frozen stats widget options
Widget `stats` MUST use integration `github`. Options MUST be: `filename` (default `stats`); `include` list of `followers`, `following`, `repos`, `stars`, `forks`, `gists`, `contributions` (default `followers,repos,stars`); `hide_rank` default true; `avatar` default true; `animate` default false; `include_private` default false; `include_forks` default false; `include_archived` default false. `gists` in `include` MUST be a count chip, not gist output. Stars MUST be the sum of `stargazers_count` from the coalesced owner-repo list after forks/archived are filtered by those options.

#### Scenario: Stats defaults
- **WHEN** `stats` is enabled with no option overrides
- **THEN** `include` MUST be `followers,repos,stars`, `hide_rank` MUST be true, `avatar` MUST be true, `animate` MUST be false, and `include_private` / `include_forks` / `include_archived` MUST be false

### Requirement: Frozen languages widget options
Widget `languages` MUST use integration `github`. Options MUST be: `filename` (default `languages`); `limit` 1–16 default 8; `min_pct` default 1; `exclude` list default empty; `animate` default false; `include_private` default false; `include_forks` default false; `include_archived` default false. Language bytes MUST come from GraphQL `nodes(ids:)` sizes (not REST `repo.language` counts). The widget MUST consume the cached payload and MUST NOT perform HTTP itself. Empty language data MUST render a “No language data” card, not crash.

#### Scenario: Languages defaults
- **WHEN** `languages` is enabled with no option overrides
- **THEN** `limit` MUST be 8, `min_pct` MUST be 1, `exclude` MUST be empty, `animate` MUST be false, and private/fork/archived inclusion MUST be false

#### Scenario: Empty language data card
- **WHEN** the cached language payload has no remaining languages after filters
- **THEN** the widget MUST render a “No language data” card and MUST NOT crash

### Requirement: Contributions omitted without capability
`contributions` MUST be included only when `canContributions` is true. Otherwise the widget MUST omit the contributions chip and skipped lists MUST include `github/stats:contributions`. The widget MUST NOT render `0` for skipped contributions.

#### Scenario: Contributions skipped without capability
- **WHEN** stats `include` contains `contributions` and `canContributions` is false
- **THEN** the contributions chip MUST be omitted, skipped MUST list `github/stats:contributions`, and the widget MUST NOT render `0` for contributions

### Requirement: include_private without canPrivate fails the widget
`include_private: true` without `canPrivate` MUST fail that widget. The system MUST NOT silently render a public chart and MUST NOT soft-warn.

#### Scenario: include_private true without canPrivate
- **WHEN** a github widget has `include_private: true` and `canPrivate` is false
- **THEN** that widget MUST fail (not a silent public chart)

### Requirement: Missing user fails the widget
A 404 for the configured user MUST fail the widget. `/users` failure MUST fail the widget. Partial repo pages MUST fail (not a short star total).

#### Scenario: 404 user fails widget
- **WHEN** GitHub returns 404 for the configured user
- **THEN** the widget MUST fail

### Requirement: Valid zeros render only for capable fields
HTTP 200 with zeros for valid empty public stats MUST render those zeros only when capability allows that field. The system MUST NOT invent `0` for skipped contributions or other unavailable fields.

#### Scenario: 200 with zeros for allowed public stats
- **WHEN** public stats return HTTP 200 with zero followers/repos/stars and those fields are included with capability
- **THEN** the widget MUST render those zeros

#### Scenario: Skipped contributions do not invent zero
- **WHEN** contributions are skipped for lack of `canContributions`
- **THEN** the widget MUST NOT render `0` for contributions

### Requirement: Skipped widget does not write files
A skipped widget MUST NOT write files, MUST NOT overwrite existing widget files, and MUST NOT count as `data-changed`.

#### Scenario: skip does not write or overwrite
- **WHEN** a widget is skipped per the auth/skip policy
- **THEN** the Action MUST NOT write or overwrite that widget’s output file and MUST NOT treat it as `data-changed`

### Requirement: Frozen feed widget options
Widget `feed` MUST use integration `rss` only. Options MUST be: `filename` (default `feed`); `url` (required; https only; no username or password); `limit` 1–8 default 5; `animate` bool default false. The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The widget MUST consume the cached rss payload and MUST NOT perform HTTP itself. Empty payload MUST render a “No feed items” card, not crash. `animate` MUST be plumbed; gif/apng motion for `feed` is not required. A skipped `feed` widget MUST NOT write files (inherited skip-without-write). A 404 feed URL MUST fail the widget. Malformed XML MUST fail the widget (not skip). `http://` MUST fail yaml parse. URL userinfo MUST fail yaml parse. Redirect-to-http MUST fail fetch (not parse).

#### Scenario: Feed defaults
- **WHEN** `feed` is enabled with `url` and no other option overrides
- **THEN** `filename` MUST be `feed`, `limit` MUST be 5, `animate` MUST be false, the card MUST be 480×160 svg, and the widget MUST NOT perform HTTP

#### Scenario: Empty feed items card
- **WHEN** the cached rss payload has no items
- **THEN** the widget MUST render a “No feed items” card and MUST NOT crash

#### Scenario: http url fails parse
- **WHEN** `widgets.feed.url` is an `http://` URL
- **THEN** yaml parse MUST fail

#### Scenario: userinfo url fails parse
- **WHEN** `widgets.feed.url` is an https URL that includes a username or password
- **THEN** yaml parse MUST fail

#### Scenario: missing url fails parse
- **WHEN** `plugins.rss` is present and `widgets.feed.url` is omitted
- **THEN** yaml parse MUST fail

#### Scenario: 404 feed url fails widget
- **WHEN** the feed URL returns HTTP 404
- **THEN** the widget MUST fail and MUST NOT skip or write output

#### Scenario: malformed feed xml fails widget
- **WHEN** the fetched body is malformed XML that cannot be parsed as a feed
- **THEN** the widget MUST fail and MUST NOT skip

#### Scenario: skipped feed does not write
- **WHEN** the feed widget is skipped per inherited skip-without-write policy
- **THEN** the Action MUST NOT write or overwrite that widget’s output file and MUST NOT treat it as `data-changed`

### Requirement: Action http adapter renders chips
The Action http adapter MUST render widget `chips` when the request id is `chips` and the options include `preset`. The chips branch MUST run before json option parsing. The adapter MUST call chips render with Action `user` (empty string when absent) and MUST forward the request theme. The adapter MUST write exactly one file path `filename` plus the run format extension (for example `chips.svg`) and MUST NOT append `-dark`.

A chips widget error MUST map to `fail_widget` for the **entire** chips widget. One type expand, GET, or normalize failure MUST fail the whole chips widget and MUST NOT write a partial card. Json error mapping MUST stay json-widget or http-client errors → `fail_widget`. Unknown ids handled by the http adapter MUST remain unhandled http widget errors. Github widget `stats` MUST NOT be rendered by the http adapter.

#### Scenario: chips 200 writes filename.format
- **WHEN** chips yaml renders successfully as svg with filename `chips`
- **THEN** the adapter MUST write `chips.svg` at 480×160 and MUST NOT write a `-dark` path from the adapter

#### Scenario: chips 404 is fail_widget
- **WHEN** an expanded chips JSON URL returns HTTP 404
- **THEN** the adapter MUST return `fail_widget` and MUST NOT throw

#### Scenario: one type failure fails the whole widget
- **WHEN** any one chips type expand, GET, or normalize fails and other types would succeed
- **THEN** the chips widget MUST fail entirely and MUST NOT write a partial card

#### Scenario: request theme is forwarded
- **WHEN** the Action http adapter renders chips with request theme `light`
- **THEN** chips render MUST receive that theme and MUST NOT substitute a resolved widget theme in its place

#### Scenario: stats remains unhandled by the http adapter
- **WHEN** the http adapter is invoked with widget id `stats`
- **THEN** it MUST fail as an unhandled http widget and MUST NOT treat stats as chips

### Requirement: chips client render forwards optional theme
Chips render from the injected http client MUST accept an optional theme on the call context and MUST apply that theme to the SVG. Omitting theme and passing only `user` MUST remain valid. Light and dark themes MUST produce distinct SVG output when theme is forwarded.

#### Scenario: omitted theme remains valid
- **WHEN** chips render is called with `{ user: "vercel" }` and no theme
- **THEN** render MUST succeed or fail_widget per load outcome and MUST NOT reject the context for a missing theme

#### Scenario: light and dark SVG differ
- **WHEN** chips render is called twice with the same payloads and themes `light` and `dark`
- **THEN** the two SVG strings MUST differ
