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
