# widget-contract Specification

## Purpose

Defines a widget as one Takumi template plus a frozen option schema, including v0 demo/stats/languages fields, skip-without-write, and fail-closed private/contributions behavior.

## Requirements

### Requirement: Widget is one template plus option schema
A widget MUST have an id, title, description, option schema, integrations list, size, formats, defaults, fetch, render, and examples. A widget MUST bind to exactly one Takumi template. Root Takumi node MUST use `width: 100%` and `height: 100%`. Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. Those tokens MUST come from a host-resolved `ThemePalette` only. A widget MUST NOT declare a local palette, a per-widget token type, or plugin-owned hex. Author-widget templates MUST accept a named `ThemeId` or a resolved `ThemePalette` and MUST NOT invent `{{WIDGET}}ThemeTokens`.

#### Scenario: Widget declares a single template
- **WHEN** a widget is registered
- **THEN** it MUST expose one option schema and one Takumi template and MUST list the integrations it consumes

#### Scenario: Widget uses resolved palette only
- **WHEN** a widget template reads colors
- **THEN** it MUST use a host-resolved `ThemePalette` and MUST NOT read a plugin-local hex map

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

### Requirement: Frozen json widget options
Widget `json` MUST use integration `http` only. Options MUST be: `filename` (default `json`); `url` (required; https only); `headers` (optional string record; forbidden names `Authorization`, `Cookie`, `Set-Cookie`, `Proxy-Authorization`, and names matching `/token/i`; forbidden values matching `/^(Bearer|token|Basic)\s/i`); `jmespath` (default `@`); `timeout_ms` (integer 1–20000, default 10000); `method` MUST be `GET` only; `animate` bool default false. The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The widget MUST consume the cached http JSON payload and MUST NOT perform HTTP itself. Object keys MUST truncate to 16 characters and values to 48 characters, with at most 3 object rows. The muted hostname label MUST be the URL hostname or `"JSON"` when no hostname is available. `animate` MUST be plumbed; gif/apng motion for `json` is not required. A skipped `json` widget MUST NOT write files (inherited skip-without-write).

#### Scenario: Json defaults
- **WHEN** `json` is enabled with `url` and no other option overrides
- **THEN** `filename` MUST be `json`, `jmespath` MUST be `@`, `timeout_ms` MUST be 10000, `method` MUST be `GET`, `animate` MUST be false, the card MUST be 480×160 svg, and the widget MUST NOT perform HTTP

#### Scenario: http url fails parse
- **WHEN** `widgets.json.url` is an `http://` URL
- **THEN** yaml parse MUST fail

#### Scenario: missing url fails parse
- **WHEN** `plugins.http.widgets.json` is present and `url` is omitted
- **THEN** yaml parse MUST fail

#### Scenario: forbidden yaml headers fail parse
- **WHEN** `widgets.json.headers` includes `Authorization`, `Cookie`, `Set-Cookie`, `Proxy-Authorization`, a name matching `/token/i`, or a value matching `/^(Bearer|token|Basic)\s/i`
- **THEN** yaml parse MUST fail

#### Scenario: allowed yaml headers are forwarded
- **WHEN** `widgets.json.headers` contains allowed extra headers
- **THEN** the widget MUST pass those headers to the http client GET

### Requirement: json empty, zero, and fail outcomes
Empty after a **successful** jmespath search (`null`, `undefined`, `""`, `[]`, or `{}`) MUST render a “No data” card and MUST NOT crash. `0` and `false` MUST render. An invalid jmespath expression MUST fail the widget (not skip). A 404 URL MUST fail the widget. JSON parse errors MUST fail the widget (not skip).

#### Scenario: Empty after successful jmespath renders No data
- **WHEN** jmespath succeeds and the result is `null`, `undefined`, `""`, `[]`, or `{}`
- **THEN** the widget MUST render a “No data” card and MUST NOT crash

#### Scenario: zero and false render
- **WHEN** jmespath succeeds and the result is `0` or `false`
- **THEN** the widget MUST render that value and MUST NOT treat it as empty

#### Scenario: invalid jmespath fails widget
- **WHEN** `jmespath` is not a valid expression
- **THEN** the widget MUST fail and MUST NOT skip

#### Scenario: 404 json url fails widget
- **WHEN** the JSON URL returns HTTP 404
- **THEN** the widget MUST fail and MUST NOT skip or write output

#### Scenario: JSON parse error fails widget
- **WHEN** the fetched body is not valid JSON after BOM strip
- **THEN** the widget MUST fail and MUST NOT skip

#### Scenario: skipped json does not write
- **WHEN** the json widget is skipped per inherited skip-without-write policy
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

### Requirement: Frozen chips widget options
Widget `chips` MUST use integration `http` only. Options MUST be: `filename` (default `chips`); `preset` (`shieldcn` or `shields`; required; one preset per widget); `types` (list of `npm`, `stars`, `forks`, `license`, `release`, `issues`, `prs`, `ci`; min 1, max 8; duplicates MUST be removed while preserving first-seen order); optional `package`; optional `repo`; optional `workflow` (default `ci.yml`, used for shields `ci` only); `timeout_ms` (integer 1–20000, default 10000); `animate` bool default false. Yaml MUST NOT accept `url`, `headers`, `method`, or `bits` on chips. Parse MUST allow omitting `package`, `repo`, and `workflow`. Missing package or owner after expand (Action `user` as owner when `repo` has no `/`) MUST fail the widget, not parse. Unknown preset or type MUST fail parse. Empty `types` MUST fail parse. Extra keys MUST fail parse.

The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The template MUST render a wrapping row of horizontal split Chips (`label` + `message` + `messageColor`). The widget MUST NOT wrap `Stat` for this chrome. Children-only Chip MUST remain valid for github stats. The widget MUST consume normalized `{ label, message, color? }` payloads and MUST NOT perform HTTP itself. A load helper in the widget folder MUST call the injected http client; the template MUST have fetch none. `animate` MUST be plumbed; gif/apng motion for `chips` is not required. A skipped `chips` widget MUST NOT write files (inherited skip-without-write).

#### Scenario: Chips defaults
- **WHEN** `chips` is enabled with `preset` and `types` and no other option overrides
- **THEN** `filename` MUST be `chips`, `timeout_ms` MUST be 10000, `animate` MUST be false, `workflow` MUST default to `ci.yml`, the card MUST be 480×160 svg, and the widget MUST NOT perform HTTP

#### Scenario: one preset per chips widget
- **WHEN** yaml `widgets.chips.preset` is `shieldcn` or `shields`
- **THEN** every type on that widget MUST expand with that preset only

#### Scenario: types min max and dedupe
- **WHEN** yaml `types` is empty, contains an unknown token, contains duplicates, or has more than 8 entries after first-seen dedupe
- **THEN** empty or unknown MUST fail parse; duplicates MUST be dropped preserving first-seen order; more than 8 unique types MUST fail parse

#### Scenario: missing package and repo parse
- **WHEN** yaml omits `package` and/or `repo` on chips
- **THEN** parse MUST succeed

#### Scenario: chips url headers method bits fail parse
- **WHEN** yaml `widgets.chips` includes `url`, `headers`, `method`, or `bits`
- **THEN** parse MUST fail

#### Scenario: unknown preset fails parse
- **WHEN** yaml `preset` is not `shieldcn` or `shields`
- **THEN** parse MUST fail

### Requirement: chips Chip row, color, and empty card
Each successful chip MUST render as a horizontal split Chip: muted label half plus message half. Message color MUST come from a closed named map `brightgreen`, `green`, `yellowgreen`, `yellow`, `orange`, `red`, `blue`, `lightgrey`, `success`, `important`, `critical`, `informational`, `inactive`, or from `#rgb` / `#rrggbb`. Any other color string, and a missing color, MUST use theme `accent`. Color MUST be applied with inline style only. The widget MUST ignore `link` and `href`. Empty after a successful fetch/normalize list (zero chips) MUST render a “No data” card and MUST NOT crash.

#### Scenario: split Chip uses label and message
- **WHEN** a normalized chip has `label` and `message`
- **THEN** the card MUST show a horizontal split Chip with that label and message and MUST NOT wrap `Stat`

#### Scenario: missing color uses theme accent
- **WHEN** a normalized chip has no color (including shieldcn payloads that omit color)
- **THEN** the message half MUST use theme `accent`

#### Scenario: named and hex colors apply inline
- **WHEN** color is a named map token or `#rgb` / `#rrggbb`
- **THEN** the message half MUST use that color via inline style and MUST NOT emit `<style>`, SMIL, `foreignObject`, or `url()`

#### Scenario: unknown color falls back to accent
- **WHEN** color is a string outside the named map and not `#rgb` or `#rrggbb`
- **THEN** the message half MUST use theme `accent`

#### Scenario: link and href are ignored
- **WHEN** the JSON payload includes `link` or `href`
- **THEN** the widget MUST still render the chip and MUST NOT treat those fields as required or as per-chip links

#### Scenario: empty successful list renders No data
- **WHEN** every type GET and normalize succeeds and the resulting chip list is empty
- **THEN** the widget MUST render a “No data” card and MUST NOT crash

### Requirement: chips fail_widget matrix and fetch none
Missing `message` after `message = message ?? value` MUST fail the widget. One type GET failure or normalize failure MUST fail the **entire** chips widget (`fail_widget`) with no partial card. Missing package or owner after expand MUST fail the widget. HTTP outcomes for each expanded URL MUST follow the existing http matrix (`fail_widget`, never github `fail_run`). The template MUST NOT call `fetch`. Tests MUST assert zero live network and MUST spy `globalThis.fetch` unused on the template.

#### Scenario: missing message fails widget
- **WHEN** a type payload has neither `message` nor `value`, or both are empty
- **THEN** the chips widget MUST fail and MUST NOT write a partial card

#### Scenario: one type failure fails the whole widget
- **WHEN** any one type GET or normalize fails and other types would succeed
- **THEN** the chips widget MUST fail and MUST NOT render a partial card

#### Scenario: missing package or owner after expand fails widget
- **WHEN** types include `npm` without a package, or a github type without owner after applying Action `user` to a repo that has no `/`
- **THEN** the chips widget MUST fail

#### Scenario: 404 expanded url fails widget
- **WHEN** an expanded JSON URL returns HTTP 404
- **THEN** the chips widget MUST fail and MUST NOT skip or write output

#### Scenario: template performs no HTTP
- **WHEN** the chips template renders
- **THEN** it MUST NOT call `fetch` and MUST consume already-normalized chip records

#### Scenario: skipped chips does not write
- **WHEN** the chips widget is skipped per inherited skip-without-write policy
- **THEN** the Action MUST NOT write or overwrite that widget’s output file and MUST NOT treat it as `data-changed`

### Requirement: Frozen coding widget options
Widget id MUST be `coding`. The widget MUST NOT reuse ids `stats` or `languages`. Widget `coding` MUST use integration `wakatime` only. The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. Options MUST be: `filename` (default `wakatime`); `range` enum `last_7_days | last_30_days | last_6_months | last_year` (default `last_7_days`); `include` list of `languages`, `editors`, `projects`, `os` with min length 1 (default `[languages, editors]`; unknown tokens fail parse; duplicates deduped preserving order); `limit` 1–16 default 8; `api_domain` hostname only default `wakatime.com`; `animate` bool default false. The widget MUST consume the cached wakatime payload and MUST NOT perform HTTP itself. Empty payload after filters MUST render a “No coding data” card (write the card; this is `render`, not skip). The widget MUST NOT invent `0` for omitted include tokens. Unrequested include keys MUST be omitted entirely. A skipped `coding` widget MUST NOT write files (inherited skip-without-write). A 404 stats response MUST fail the widget (no write).

#### Scenario: Coding defaults
- **WHEN** `coding` is enabled with no option overrides
- **THEN** `filename` MUST be `wakatime`, `range` MUST be `last_7_days`, `include` MUST be `[languages, editors]`, `limit` MUST be 8, `api_domain` MUST be `wakatime.com`, `animate` MUST be false, the card MUST be 480×160 svg, and the widget MUST NOT perform HTTP

#### Scenario: Widget id is coding not stats or languages
- **WHEN** the wakatime pack registers its default widget
- **THEN** the widget id MUST be `coding` and MUST NOT be `stats` or `languages`

#### Scenario: Empty coding data card
- **WHEN** the cached coding payload has no remaining rows after filters
- **THEN** the widget MUST render a “No coding data” card, MUST write the card, and MUST NOT crash

#### Scenario: Omitted include keys do not invent zeros
- **WHEN** `include` is `[languages, editors]` and the payload also contains projects and operating_systems
- **THEN** the widget MUST expose languages and editors only and MUST NOT invent `0` for omitted `projects` or `os` keys

#### Scenario: Unknown include token fails parse
- **WHEN** coding `include` contains a token other than `languages`, `editors`, `projects`, or `os`
- **THEN** yaml parse MUST fail

#### Scenario: api_domain injection fails parse
- **WHEN** `api_domain` is `localhost`, an IP, a URL with scheme, a host with path, userinfo, or port, or a metadata host
- **THEN** yaml parse MUST fail

#### Scenario: skipped coding does not write
- **WHEN** the coding widget is skipped per inherited skip-without-write policy
- **THEN** the Action MUST NOT write or overwrite that widget’s output file and MUST NOT treat it as `data-changed`

#### Scenario: 404 stats fails widget without write
- **WHEN** the wakatime stats endpoint returns HTTP 404
- **THEN** the widget MUST fail and MUST NOT write output

### Requirement: Action writes coding files under output_dir
When widget `coding` renders successfully, the Action MUST write the card under yaml `output_dir` using yaml `filename` (default `wakatime`) plus the format extension (`svg` → `wakatime.svg`). `output_pair: true` MUST still write `filename` plus `filename-dark` under `output_dir`. The coding widget MUST stay HTTP-free: the Action fetches via the shared wakatime client (`fetchStats`) and then calls `renderCodingSvg`. The Action MUST NOT add a widget-package `renderCodingFromClient` helper.

Empty payload after filters MUST write a “No coding data” card (this is `render`, not skip). A 404 stats response MUST be `fail_widget` and MUST NOT write files. A 401 MUST be `fail_run` and MUST NOT write files. A skipped coding widget MUST NOT write or overwrite files (inherited skip-without-write). Card size MUST remain 480×160.

`dry_run` MUST list the would-be coding files and MUST set `did_commit` false. `dry_run` MUST NOT call commit or gist ports.

#### Scenario: coding render writes under output_dir filename
- **WHEN** the wakatime pack is on, a token is present, and stats fetch succeeds
- **THEN** the Action MUST write the coding card under `output_dir` using `filename` (default `wakatime.svg` for svg) and the opening SVG MUST be 480×160

#### Scenario: empty coding payload still writes
- **WHEN** stats fetch succeeds and the payload has no remaining rows after filters
- **THEN** the Action MUST write a “No coding data” card under `output_dir` and MUST NOT skip the widget

#### Scenario: coding 404 writes no files
- **WHEN** the wakatime stats endpoint returns HTTP 404
- **THEN** the widget MUST fail (`fail_widget`) and the Action MUST NOT write that widget’s output file

#### Scenario: coding 401 fails the run without write
- **WHEN** the wakatime stats endpoint returns HTTP 401
- **THEN** the run MUST fail (`fail_run`) and the Action MUST NOT write coding output

#### Scenario: dry_run lists coding files and does not commit
- **WHEN** coding would write files and `dry_run` is true
- **THEN** the Action MUST list those files, MUST set `did_commit` false, and MUST NOT call commit or gist ports

### Requirement: Bits consume theme context only
Bits MUST read colors from the host theme context (`useBitTheme()` / `<Theme>`). `<Theme>` MUST accept a named `ThemeId` or a resolved `ThemePalette`. Bits MUST NOT import flavor hex from the catalog or from plugins.

#### Scenario: Bit reads context only
- **WHEN** a bit renders
- **THEN** it MUST read the current `ThemePalette` from theme context and MUST NOT import named-flavor hex

#### Scenario: Theme wrapper accepts id or palette
- **WHEN** `<Theme>` is given a named id or a resolved palette
- **THEN** descendant bits MUST see the same resolved 7-token palette

### Requirement: All packs inherit one resolved palette
Changing the run-global theme MUST change github, wakatime, rss, http, and bit samples together. A widget MUST NOT keep a private dark/light hex table that can drift from the host catalog. Baked SVG MUST still contain no `<style>`, `@keyframes`, SMIL, or `foreignObject`.

#### Scenario: Named theme applies across packs
- **WHEN** the run theme is `catppuccin-mocha`
- **THEN** github, wakatime, rss, http, and bit renders MUST use mocha `bg` hex and MUST NOT use Primer `#0d1117` unless that hex is mocha `bg`

#### Scenario: Baked SVG stays still
- **WHEN** a themed widget is rendered as default SVG
- **THEN** the file MUST NOT contain `<style>`, `@keyframes`, SMIL, or `foreignObject`

### Requirement: Frozen repo widget options
Widget `repo` MUST use integration `github` only. Options MUST be: `filename` (default `repo`); required `repo` (`owner/name`); `include` list of `stars`, `forks`, `watchers`, `issues`, `license`, `language` (default `stars`, `forks`, `issues`, `license`; min 1 unique token; duplicates MUST be removed while preserving first-seen order); `avatar` bool default true; `animate` bool default false. Yaml MUST NOT accept `url`, `headers`, `bits`, `include_private`, `include_forks`, or `include_archived` on `repo`. Missing `repo` or a value that is not `owner/name` MUST fail parse. Unknown include tokens MUST fail parse. Empty `include` MUST fail parse. Extra keys MUST fail parse.

The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The template MUST render a Primer GitHub REST card (owner/name header, optional avatar, Chip wrapping Stat for included counts/strings). The widget MUST NOT use http `chips` split-Chip chrome, MUST NOT expand shieldcn or shields URLs, and MUST NOT wrap http badge payloads. The widget MUST consume a cached single-repo payload and MUST NOT perform HTTP itself. A load helper in the widget folder MAY map the cached payload; the template MUST have fetch none. `animate` MUST be plumbed; gif/apng motion for `repo` is not required. A skipped `repo` widget MUST NOT write files (inherited skip-without-write).

Playground preview for `repo` MUST use fixtures (or an App token) and MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: Repo defaults
- **WHEN** `repo` is enabled with `repo: owner/name` and no other option overrides
- **THEN** `filename` MUST be `repo`, `include` MUST be `stars`, `forks`, `issues`, `license`, `avatar` MUST be true, `animate` MUST be false, the card MUST be 480×160 svg, and the widget MUST NOT perform HTTP

#### Scenario: required repo owner/name
- **WHEN** yaml omits `repo` or sets a value without `/`
- **THEN** parse MUST fail

#### Scenario: include min and unknown tokens
- **WHEN** yaml `include` is empty, contains an unknown token, or contains duplicates
- **THEN** empty or unknown MUST fail parse and duplicates MUST be dropped preserving first-seen order

#### Scenario: repo url headers bits fail parse
- **WHEN** yaml `widgets.repo` includes `url`, `headers`, `bits`, `include_private`, `include_forks`, or `include_archived`
- **THEN** parse MUST fail

#### Scenario: repo is distinct from chips
- **WHEN** widget `repo` renders
- **THEN** the card MUST be a Primer 480×160 GitHub REST card and MUST NOT be an http pack badge row

#### Scenario: playground preview is not an embed API
- **WHEN** the docs playground previews widget `repo`
- **THEN** it MUST use fixtures or an App token, MUST go through `POST /api/preview`, and MUST NOT document or cache that route as a public embed API

### Requirement: repo empty card and fetch none
Empty or unusable payload after a successful fetch (missing `full_name`) MUST render a “No repo data” card and MUST NOT crash. HTTP 200 with zero `stars`, `forks`, `watchers`, or `issues` MUST render those zeros when those tokens are included. Null `license` MUST omit the license chip. Null `language` MUST omit the language chip. `watchers` MUST use REST `subscribers_count` (actual watchers), not `watchers_count` (stargazers alias). `language` MUST be the REST repo object `language` string only. The template MUST NOT call `fetch`. Tests MUST assert zero live network and MUST spy `globalThis.fetch` unused on the template. A 404 for the configured repository MUST fail the widget and MUST NOT write files. A skipped `repo` widget MUST NOT write files.

#### Scenario: empty payload renders No repo data
- **WHEN** the single-repo GET succeeds and the payload has no usable `full_name`
- **THEN** the widget MUST render a “No repo data” card and MUST NOT crash

#### Scenario: zeros render for included counts
- **WHEN** the payload has zero stars, forks, watchers, or open issues and those tokens are included
- **THEN** the widget MUST render those zeros

#### Scenario: null license omits that chip
- **WHEN** `include` contains `license` and the payload `license` is null
- **THEN** the widget MUST omit the license chip and MUST NOT invent a license string

#### Scenario: null language omits that chip
- **WHEN** `include` contains `language` and the payload `language` is null
- **THEN** the widget MUST omit the language chip and MUST NOT call REST `/languages`

#### Scenario: template performs no HTTP
- **WHEN** the repo template renders
- **THEN** it MUST NOT call `fetch` and MUST consume an already-fetched repo record

#### Scenario: 404 repo fails widget without write
- **WHEN** GitHub returns HTTP 404 for `GET /repos/{owner}/{repo}`
- **THEN** the widget MUST fail and MUST NOT skip or write output

#### Scenario: skipped repo does not write
- **WHEN** the repo widget is skipped per inherited skip-without-write policy
- **THEN** the Action MUST NOT write or overwrite that widget’s output file and MUST NOT treat it as `data-changed`
