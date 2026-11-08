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

Widget `feed` MUST use integration `rss` only. Options MUST be: `filename` (default `feed`); `url` (required; https only; no username or password); `limit` 1–8 default 5; `animate` bool default false. The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The widget MUST consume the cached rss **feed+item dump** and MUST NOT perform HTTP itself. The leftover frozen triple `{ title, url, published_at }` MUST be the feed widget reader (not the cache schema). Extra dump fields (`id`, `content`, `summary`, `authors`, `categories`, `updated`, `enclosures`, feed metadata) MUST remain available on the dump and MUST NOT be required for `feed` to render. The widget MUST slice dump `items` to `limit`. The widget MAY still render title, url, and date. Empty dump `items` MUST render a “No feed items” card, not crash. `animate` MUST be plumbed; gif/apng motion for `feed` is not required. A skipped `feed` widget MUST NOT write files (inherited skip-without-write). A 404 feed URL MUST fail the widget. Malformed XML MUST fail the widget (not skip). `http://` MUST fail yaml parse. URL userinfo MUST fail yaml parse. Redirect-to-http MUST fail fetch (not parse). The system MUST NOT add flattened `plugin_<plugin>_<widget>_<option>` Action inputs such as `plugin_rss_feed_url`. This change MUST NOT add a new first-party widget id.

#### Scenario: Feed defaults
- **WHEN** `feed` is enabled with `url` and no other option overrides
- **THEN** `filename` MUST be `feed`, `limit` MUST be 5, `animate` MUST be false, the card MUST be 480×160 svg, and the widget MUST NOT perform HTTP

#### Scenario: Empty feed items card
- **WHEN** the cached rss dump has no items
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

#### Scenario: leftover triple is the feed widget reader
- **WHEN** the cached dump includes id, content, summary, authors, categories, updated, enclosures, and feed metadata in addition to title, url, and published_at
- **THEN** the feed widget MUST read `{ title, url, published_at }` from dump items, MAY still render title / url / date, and MUST NOT require the extra dump fields to render

#### Scenario: feed widget slices dump items to limit
- **WHEN** dump `items` length exceeds `limit`
- **THEN** the widget MUST slice `items` to `limit` and MUST NOT ask the rss client to drop dump fields

#### Scenario: No flattened feed Action inputs
- **WHEN** this change lands
- **THEN** the Action MUST NOT declare `plugin_rss_feed_url` or any `plugin_rss_feed_*` input

### Requirement: Frozen json widget options

Widget `json` MUST use integration `http` only. Options MUST be: `filename` (default `json`); `url` (required; https only); `headers` (optional string record; forbidden names `Authorization`, `Cookie`, `Set-Cookie`, `Proxy-Authorization`, and names matching `/token/i`; forbidden values matching `/^(Bearer|token|Basic)\s/i`); `jmespath` (default `@`); `timeout_ms` (integer 1–20000, default 10000); `method` MUST be `GET` only; `animate` bool default false. The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The widget MUST consume the cached http JSON payload (the full parsed JSON value) and MUST NOT perform HTTP itself. `jmespath` MUST run in the widget as a reader on that dump and MUST NOT drop keys at fetch. Object keys MUST truncate to 16 characters and values to 48 characters, with at most 3 object rows, at render only. The muted hostname label MUST be the URL hostname or `"JSON"` when no hostname is available. `animate` MUST be plumbed; gif/apng motion for `json` is not required. A skipped `json` widget MUST NOT write files (inherited skip-without-write).

#### Scenario: Json defaults
- **WHEN** `json` is enabled with `url` and no other option overrides
- **THEN** `filename` MUST be `json`, `jmespath` MUST be `@`, `timeout_ms` MUST be `10000`, `method` MUST be `GET`, `animate` MUST be false, the card MUST be 480×160 svg, and the widget MUST NOT perform HTTP

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

#### Scenario: jmespath is widget-side
- **WHEN** yaml `jmespath` is not `@`
- **THEN** the cached dump MUST still be the full JSON value and the widget MUST apply that expression as a reader

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

The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The template MUST render a wrapping row of horizontal split Chips (`label` + `message` + `messageColor`). The widget MUST NOT wrap `Stat` for this chrome. Children-only Chip MUST remain valid for github stats. The widget MUST consume the cached raw badge JSON dump (`label`, `message`, `color`, `name`, `value`, `link` when present) and MUST NOT perform HTTP itself. A widget-side reader MUST map `message = message ?? value` to `{ label, message, color? }` for the template. A load helper in the widget folder MUST call the injected http client with per-request auth `none`; the template MUST have fetch none. `animate` MUST be plumbed; gif/apng motion for `chips` is not required. A skipped `chips` widget MUST NOT write files (inherited skip-without-write).

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

#### Scenario: cache keeps link and value
- **WHEN** shieldcn JSON is `{ "label": "npm", "value": "19.0.0", "link": "https://example.com" }`
- **THEN** the cached dump MUST retain `value` and `link`; the widget reader MUST yield message `19.0.0` for render and MUST NOT treat `link` as a per-chip URL

### Requirement: chips Chip row, color, and empty card

Each successful chip MUST render as a horizontal split Chip: muted label half plus message half. Message color MUST come from a closed named map `brightgreen`, `green`, `yellowgreen`, `yellow`, `orange`, `red`, `blue`, `lightgrey`, `success`, `important`, `critical`, `informational`, `inactive`, or from `#rgb` / `#rrggbb`. Any other color string, and a missing color, MUST use theme `accent`. Color MUST be applied with inline style only. The widget MUST ignore `link` and `href` at render. Those keys MUST remain on the cached dump when present. Empty after a successful fetch/normalize list (zero chips) MUST render a “No data” card and MUST NOT crash.

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

#### Scenario: cache retains link while render ignores it
- **WHEN** the cached dump includes `link` or `href`
- **THEN** those keys MUST remain on the cached dump and the rendered chip MUST still ignore them as per-chip links

### Requirement: chips fail_widget matrix and fetch none

Missing `message` after widget-side `message = message ?? value` MUST fail the widget. One type GET failure or normalize failure MUST fail the **entire** chips widget (`fail_widget`) with no partial card. Missing package or owner after expand MUST fail the widget. HTTP outcomes for each expanded URL MUST follow the existing http matrix (`fail_widget`, never github `fail_run`). Normalize MUST be a widget reader and MUST NOT run inside http fetch. The template MUST NOT call `fetch`. Tests MUST assert zero live network and MUST spy `globalThis.fetch` unused on the template.

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

### Requirement: GitHub widgets select from the cached dump
Widgets `stats`, `languages`, and `repo` MUST consume the github cached dump and MUST NOT perform HTTP. `include`, `limit`, `min_pct`, and `exclude` MUST remain widget-side filters and MUST NOT drop fields at fetch. Extra dump keys MUST NOT fail widget parse. Frozen option schemas for those widgets MUST stay. Widget `demo` MUST keep integration `static` and MUST NOT call GitHub. Playground and docs preview MUST use fixtures or an App token and MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: Stats selects from the dump
- **WHEN** widget `stats` renders
- **THEN** it MUST read the cached github dump and MUST NOT perform HTTP

#### Scenario: Languages selects from the dump
- **WHEN** widget `languages` applies `limit`, `min_pct`, or `exclude`
- **THEN** those filters MUST run in the widget against the cached dump and MUST NOT drop language nodes at fetch

#### Scenario: Extra dump keys do not fail parse
- **WHEN** the cached dump includes fields the current card does not render
- **THEN** widgets `stats`, `languages`, and `repo` MUST still parse and MUST NOT fail because extra keys are present

#### Scenario: Preview is not an embed API
- **WHEN** the docs playground previews a github widget
- **THEN** it MUST use fixtures or an App token and MUST NOT treat `POST /api/preview` as a public embed API

### Requirement: Coding include/limit is the widget reader
Widget `coding` MUST apply yaml `include` and `limit` when reading the
cached wakatime dump. Include/limit MUST NOT drop fields at fetch. When
`include` is `[languages]`, render MUST omit editors (and other
unrequested slices) and the cache MUST still contain those slices when
the source returned them. `limit` MUST cap rendered rows per included
slice and MUST NOT truncate the cached dump. Yaml token `os` MUST map
from dump field `operating_systems` in the widget reader. The widget
MUST NOT invent `0` for omitted include tokens. The widget MUST stay
HTTP-free. Empty rows after filters MUST still render a “No coding data”
card (write the card; this is `render`, not skip). Frozen coding yaml
defaults MUST stay `include: [languages, editors]` and `limit: 8`.
Widget id MUST remain `coding` and MUST NOT become `stats`. This change
MUST NOT add a new first-party widget id. The system MUST NOT add
flattened `plugin_<plugin>_<widget>_<option>` Action inputs such as
`plugin_wakatime_coding_range`.

#### Scenario: Include languages omits editors in render not cache
- **WHEN** `include` is `[languages]` and the cached dump still contains
  `editors`
- **THEN** the coding widget MUST omit editors in render and MUST NOT
  drop `editors` from the cache

#### Scenario: Limit caps render not cache
- **WHEN** `limit` is `1` and the cached `languages` slice has more than
  one row
- **THEN** render MUST show at most one language row and the cache MUST
  still contain the unsliced rows

#### Scenario: os maps from operating_systems at the widget
- **WHEN** `include` contains `os` and the dump has `operating_systems`
- **THEN** the widget reader MUST map that field to yaml token `os` and
  MUST NOT invent `0` when the field is absent

#### Scenario: Widget stays HTTP-free
- **WHEN** widget `coding` renders
- **THEN** it MUST consume the cached dump and MUST NOT perform HTTP

#### Scenario: Empty after filters still writes No coding data
- **WHEN** the dump has no remaining rows after include/limit
- **THEN** the widget MUST render a “No coding data” card, MUST write
  the card, and MUST NOT skip

#### Scenario: No flattened coding Action inputs
- **WHEN** this change lands
- **THEN** the Action MUST NOT declare `plugin_wakatime_coding_range` or
  any `plugin_wakatime_coding_*` input

### Requirement: json jmespath is a widget reader
Widget `json` MUST apply `jmespath` to the cached full JSON dump and MUST NOT ask the http client to filter or drop keys. Truncation (object keys to 16 characters, values to 48, at most 3 object rows) MUST apply at render only. Empty after a successful search (`null`, `undefined`, `""`, `[]`, or `{}`) MUST still render a “No data” card. `0` and `false` MUST still render. An invalid `jmespath` MUST `fail_widget`. The widget MUST NOT perform HTTP itself.

#### Scenario: jmespath runs on the cached dump
- **WHEN** yaml `jmespath` is not `@`
- **THEN** the widget MUST apply that expression to the cached full JSON value and MUST NOT ask the client to filter the dump

#### Scenario: render truncation does not strip the dump
- **WHEN** a JSON object has more than 3 keys
- **THEN** the cached dump MUST keep every key and the card MUST truncate rows at render

### Requirement: chips normalize is a widget reader
Widget `chips` MUST read the cached raw badge JSON dump and MUST map `message = message ?? value` to `{ label, message, color? }` in a widget-side reader before the template. That reader MUST NOT run inside the http client fetch. Missing `message` after that map MUST `fail_widget`. Render MUST still use `label`, `message`, and `color` (theme `accent` when color is missing). `link` and `href` MUST remain on the cached dump when present and MUST be ignored as chrome (not per-chip URLs). A load helper in the widget folder MUST call the injected http client with per-request auth `none`; the template MUST have fetch none.

#### Scenario: widget reader maps value to message
- **WHEN** the cached dump is `{ "label": "npm", "value": "19.0.0", "link": "https://example.com" }` with no color
- **THEN** the widget reader MUST yield message `19.0.0`, MUST omit color so render uses theme accent, and MUST leave `value` and `link` on the cached dump

#### Scenario: template consumes normalized records
- **WHEN** the chips template renders
- **THEN** it MUST consume `{ label, message, color? }` records from the widget reader and MUST NOT call `fetch`

### Requirement: Frozen latest widget options
Widget `latest` MUST use integration `rss` only. Options MUST be: `filename` (default `latest`); `url` (required; https only; no username or password); `limit` 1–8 default 1; `animate` bool default false. The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The widget MUST consume the cached rss **feed+item dump** and MUST NOT perform HTTP itself. The widget MUST compose the Time bit for item dates. Time `value` MUST be dump item `updated` when that field is a non-empty string, otherwise `published_at`. The widget MUST order dump `items` by that date descending (stable; missing dates last) and MUST slice to `limit`. Extra dump fields (`id`, `content`, `summary`, `authors`, `categories`, `enclosures`, feed metadata) MUST remain available on the dump and MUST NOT be required for `latest` to render. Empty dump `items` MUST render a “No latest item” card, not crash. `animate` MUST be plumbed; gif/apng motion for `latest` is not required. A skipped `latest` widget MUST NOT write files (inherited skip-without-write). A 404 feed URL MUST fail the widget. Malformed XML MUST fail the widget (not skip). `http://` MUST fail yaml parse. URL userinfo MUST fail yaml parse. The widget MUST share the run-scoped rss client with `feed` (same `fetchFeed`; no second client). The system MUST NOT add flattened `plugin_<plugin>_<widget>_<option>` Action inputs such as `plugin_rss_latest_url`. This change MUST NOT mint a new first-party widget id (`latest` is already in `FIRST_PARTY_WIDGET_IDS`). Pack agents MUST NOT edit `packages/core/src/types.ts`.

#### Scenario: Latest defaults
- **WHEN** `latest` is enabled with `url` and no other option overrides
- **THEN** `filename` MUST be `latest`, `limit` MUST be 1, `animate` MUST be false, the card MUST be 480×160 svg, and the widget MUST NOT perform HTTP

#### Scenario: Empty latest items card
- **WHEN** the cached rss dump has no items
- **THEN** the widget MUST render a “No latest item” card and MUST NOT crash

#### Scenario: Time bit reads updated then published_at
- **WHEN** a dump item has both `updated` and `published_at`
- **THEN** the widget MUST pass `updated` to the Time bit and MUST NOT require `content` or feed metadata to render

#### Scenario: Time bit falls back to published_at
- **WHEN** a dump item has `published_at` and `updated` is null
- **THEN** the widget MUST pass `published_at` to the Time bit

#### Scenario: latest orders by recency then slices to limit
- **WHEN** dump `items` length exceeds `limit` and dates are not already newest-first
- **THEN** the widget MUST order by `updated ?? published_at` descending, MUST slice to `limit`, and MUST NOT ask the rss client to drop dump fields

#### Scenario: latest shares the rss client with feed
- **WHEN** `feed` and `latest` render in one run against the same feed URL
- **THEN** both widgets MUST use the same run-scoped rss client and MUST NOT each construct a new client

#### Scenario: http url fails parse
- **WHEN** `widgets.latest.url` is an `http://` URL
- **THEN** yaml parse MUST fail

#### Scenario: userinfo url fails parse
- **WHEN** `widgets.latest.url` is an https URL that includes a username or password
- **THEN** yaml parse MUST fail

#### Scenario: 404 feed url fails widget
- **WHEN** the feed URL returns HTTP 404
- **THEN** the widget MUST fail and MUST NOT skip or write output

#### Scenario: malformed feed xml fails widget
- **WHEN** the fetched body is malformed XML that cannot be parsed as a feed
- **THEN** the widget MUST fail and MUST NOT skip

#### Scenario: skipped latest does not write
- **WHEN** the latest widget is skipped per inherited skip-without-write policy
- **THEN** the Action MUST NOT write or overwrite that widget’s output file and MUST NOT treat it as `data-changed`

#### Scenario: No flattened latest Action inputs
- **WHEN** this change lands
- **THEN** the Action MUST NOT declare `plugin_rss_latest_url` or any `plugin_rss_latest_*` input

#### Scenario: latest declares rss only
- **WHEN** widget `latest` is registered
- **THEN** it MUST declare integration `rss` only

### Requirement: Frozen top-repos widget options
Widget `top-repos` MUST use integration `github` only. Options MUST be:
`filename` (default `top-repos`); `limit` integer 1–16 default 8;
`animate` bool default false. Yaml MUST NOT accept `url`, `headers`,
`bits`, `include_private`, `include_forks`, `include_archived`, or `repo`
on `top-repos`. Unknown keys MUST fail parse. Empty `limit` below 1 or
above 16 MUST fail parse.

The widget MUST bind to exactly one Takumi template. Card size MUST be
480×160. Default format MUST be svg (baked still: no `<style>`,
`@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to
`bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The
template MUST render a ranked owner-crawl list (name plus stars meta)
using pack bits, including `List`. The widget MUST NOT use http `chips`
split-Chip chrome and MUST NOT wrap http badge payloads. The widget MUST
consume the cached github owner-crawl dump and MUST NOT perform HTTP
itself. A load helper in the widget folder MAY map the cached payload;
the template MUST have fetch none. `animate` MUST be plumbed; gif/apng
motion for `top-repos` is not required. A skipped `top-repos` widget
MUST NOT write files (inherited skip-without-write).

`top-repos` MUST be opt-in on pack `github` like `demo` and `repo` and
MUST NOT become a pack default. Playground preview for `top-repos` MUST
use fixtures (or an App token) and MUST NOT treat `POST /api/preview` as
a public embed API.

#### Scenario: Top-repos defaults
- **WHEN** `top-repos` is enabled with no option overrides
- **THEN** `filename` MUST be `top-repos`, `limit` MUST be 8, `animate`
  MUST be false, the card MUST be 480×160 svg, and the widget MUST NOT
  perform HTTP

#### Scenario: limit bounds
- **WHEN** yaml `limit` is 0, 17, or a non-integer
- **THEN** parse MUST fail

#### Scenario: top-repos url headers bits fail parse
- **WHEN** yaml `widgets.top-repos` includes `url`, `headers`, `bits`,
  `include_private`, `include_forks`, `include_archived`, or `repo`
- **THEN** parse MUST fail

#### Scenario: widget declares github only
- **WHEN** widget `top-repos` is registered
- **THEN** it MUST declare integration `github` only and MUST NOT be a
  new plugin id

#### Scenario: pack defaults omit top-repos
- **WHEN** the github plugin is enabled with no widget list
- **THEN** the enabled widgets MUST be `stats` and `languages` and
  `top-repos` MUST remain disabled until explicitly enabled

#### Scenario: playground preview is not an embed API
- **WHEN** the docs playground previews widget `top-repos`
- **THEN** it MUST use fixtures or an App token, MUST go through
  `POST /api/preview`, and MUST NOT document or cache that route as a
  public embed API

### Requirement: top-repos ranks the owner-crawl dump
Widget `top-repos` MUST select from the cached github dump
`repositories` list (owner crawl stars/forks already fetched). It MUST
rank rows by stars descending, then forks descending, then title, and
MUST apply `limit` widget-side. Ranking and `limit` MUST NOT drop
repository fields at fetch. The widget MUST NOT call GitHub, MUST NOT
call REST `/repos/{owner}/{repo}/languages`, and MUST NOT invent a
second crawl. Extra dump keys MUST NOT fail widget parse. HTTP 200 with
zero stars or forks MUST still rank and render those zeros when the row
is included.

#### Scenario: Ranks owner crawl by stars then forks
- **WHEN** the cached dump includes owner repositories with stars and
  forks
- **THEN** the card MUST list them by stars descending, then forks
  descending, then title, sliced to `limit`

#### Scenario: limit stays widget-side
- **WHEN** yaml `limit` is 1 and the dump has more than one repository
- **THEN** the widget MUST render one row and MUST NOT refetch or shrink
  the cached crawl

#### Scenario: Extra dump keys do not fail parse
- **WHEN** the cached dump includes fields the current card does not
  render
- **THEN** widget `top-repos` MUST still parse and MUST NOT fail because
  extra keys are present

#### Scenario: zeros render for included counts
- **WHEN** a dump repository has zero stars
- **THEN** the widget MUST still include that row when it ranks inside
  `limit` and MUST render `0`

#### Scenario: template performs no HTTP
- **WHEN** the top-repos template renders
- **THEN** it MUST NOT call `fetch` and MUST consume the already-fetched
  owner-crawl dump

### Requirement: top-repos empty card and fetch none
Empty or unusable owner-crawl payload after a successful fetch (no
named repositories) MUST render a “No repositories” card and MUST NOT
crash. The template MUST NOT call `fetch`. Tests MUST assert zero live
network and MUST spy `globalThis.fetch` unused on the template. A
skipped `top-repos` widget MUST NOT write files.

#### Scenario: empty payload renders No repositories
- **WHEN** the owner-crawl dump has no usable repository names
- **THEN** the widget MUST render a “No repositories” card and MUST NOT
  crash

#### Scenario: skipped top-repos does not write
- **WHEN** the top-repos widget is skipped per inherited
  skip-without-write policy
- **THEN** the Action MUST NOT write or overwrite that widget’s output
  file and MUST NOT treat it as `data-changed`

### Requirement: Wave 3 widget ids are globally unique
Widget ids MUST be globally unique across packs. Wave 3 MUST append these ids to `FIRST_PARTY_WIDGET_IDS` and `WIDGET_INTEGRATIONS`:

- github reuse: `top-repos` → `github`; `contributions` → `github`
- wakatime slices: `editors`, `projects`, `os`, `langs` → `wakatime`
- rss: `latest` → `rss`
- spotify: `now-playing`, `top` → `spotify`
- leetcode: `solved`, `heatmap` → `leetcode`
- chess: `ratings`, `game` → `chesscom` and `lichess`
- steam: `player`, `recent` → `steam`

Existing ids `demo`, `stats`, `languages`, `repo`, `coding`, `feed`, `json`, and `chips` MUST remain. Widget id `languages` MUST stay the github languages card. The WakaTime languages slice MUST use `langs`. Widget id `heatmap` MUST stay the leetcode submission heatmap. The github contribution heatmap MUST use `contributions`. Chess MUST NOT use widget id `stats`. Pack agents MUST NOT append `FIRST_PARTY_WIDGET_IDS`.

#### Scenario: Catalog lists Wave 3 widget ids
- **WHEN** live `FIRST_PARTY_WIDGET_IDS` is read
- **THEN** it MUST contain `top-repos`, `contributions`, `editors`, `projects`, `os`, `langs`, `latest`, `now-playing`, `top`, `solved`, `heatmap`, `ratings`, `game`, `player`, and `recent` in addition to the eight shipped ids

#### Scenario: languages stays github
- **WHEN** widget `languages` is resolved
- **THEN** `WIDGET_INTEGRATIONS.languages` MUST be `["github"]` and MUST NOT be wakatime

#### Scenario: langs is the wakatime languages slice
- **WHEN** widget `langs` is resolved
- **THEN** `WIDGET_INTEGRATIONS.langs` MUST be `["wakatime"]`

#### Scenario: heatmap stays leetcode
- **WHEN** widget `heatmap` is resolved
- **THEN** `WIDGET_INTEGRATIONS.heatmap` MUST be `["leetcode"]` and MUST NOT be github

#### Scenario: contributions is the github heatmap widget
- **WHEN** widget `contributions` is resolved
- **THEN** `WIDGET_INTEGRATIONS.contributions` MUST be `["github"]`

#### Scenario: chess does not reuse stats
- **WHEN** chess widgets are registered
- **THEN** their ids MUST be `ratings` and `game` and MUST NOT be `stats`

### Requirement: Reuse widgets stay on existing packs
Widgets `top-repos` and `contributions` MUST live on pack `github`. Widgets `editors`, `projects`, `os`, and `langs` MUST live on pack `wakatime`. Widget `latest` MUST live on pack `rss`. Those widgets MUST consume the existing integration dump and MUST NOT introduce a new integration id. Include/limit for wakatime slices MUST stay widget-side. Widgets MUST NOT perform HTTP.

#### Scenario: github reuse widgets declare github only
- **WHEN** widgets `top-repos` or `contributions` are registered
- **THEN** they MUST declare integration `github` only

#### Scenario: wakatime slice widgets declare wakatime only
- **WHEN** widgets `editors`, `projects`, `os`, or `langs` are registered
- **THEN** they MUST declare integration `wakatime` only and MUST NOT be id `stats`

#### Scenario: rss latest declares rss only
- **WHEN** widget `latest` is registered
- **THEN** it MUST declare integration `rss` only

### Requirement: Elbow pack widgets bind named integrations
Widgets `now-playing` and `top` MUST declare integration `spotify` only. Widgets `solved` and `heatmap` MUST declare integration `leetcode` only. Widgets `ratings` and `game` MUST declare integrations `chesscom` and `lichess`. Widgets `player` and `recent` MUST declare integration `steam` only.

#### Scenario: spotify widgets
- **WHEN** widgets `now-playing` or `top` are resolved
- **THEN** `WIDGET_INTEGRATIONS` MUST map them to `["spotify"]`

#### Scenario: leetcode widgets
- **WHEN** widgets `solved` or `heatmap` are resolved
- **THEN** `WIDGET_INTEGRATIONS` MUST map them to `["leetcode"]`

#### Scenario: chess widgets use both hosts
- **WHEN** widgets `ratings` or `game` are resolved
- **THEN** `WIDGET_INTEGRATIONS` MUST map them to `["chesscom", "lichess"]`

#### Scenario: steam widgets
- **WHEN** widgets `player` or `recent` are resolved
- **THEN** `WIDGET_INTEGRATIONS` MUST map them to `["steam"]`

### Requirement: now-playing and top read the Spotify dump
Widgets `now-playing` and `top` MUST declare integration `spotify` only. They MUST consume the cached Spotify dump and MUST NOT perform HTTP. `now-playing` MUST prefer currently-playing and MUST fall back to recently-played when currently-playing is empty or `204`. `top` MUST apply `limit` in the widget (not by dropping dump fields at fetch). Empty now-playing MUST render “No now playing”. Empty top MUST render “No top tracks”. Extra dump keys MUST NOT fail the readers. Album art URLs in the dump MUST be readable for the Image bit. Card size MUST remain 480×160.

#### Scenario: now-playing fallback
- **WHEN** currently-playing is `null` or has no item and recently-played has a track
- **THEN** `now-playing` MUST render that recently-played track and MUST NOT fetch

#### Scenario: top limit is widget-side
- **WHEN** the dump has more top tracks than yaml `limit`
- **THEN** the widget MUST slice the dump and MUST NOT have caused the client to drop the extra tracks

#### Scenario: Widgets never HTTP
- **WHEN** `now-playing` or `top` render from a dump
- **THEN** they MUST NOT call `fetch(` or construct an HTTP client

#### Scenario: Cover art stays in the view-model
- **WHEN** a dumped track has album image URLs
- **THEN** the widget view-model MUST expose a cover URL for the Image bit

### Requirement: LeetCode widgets select from the cached dump
Widgets `solved` and `heatmap` MUST consume the leetcode cached dump and MUST NOT perform HTTP. They MUST declare integration `leetcode` only. Include/limit filters MUST stay widget-side and MUST NOT drop dump fields at fetch. Extra dump keys MUST NOT fail widget parse. Frozen option schemas (`filename`, `animate`) MUST stay. Widget id `heatmap` MUST stay the leetcode submission heatmap. The github contribution heatmap MUST remain widget id `contributions`. Playground and docs preview MUST use fixtures or skip live and MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: Solved selects from the dump
- **WHEN** widget `solved` renders
- **THEN** it MUST read the cached leetcode dump and MUST NOT perform HTTP

#### Scenario: Heatmap selects from the dump
- **WHEN** widget `heatmap` renders
- **THEN** it MUST read `submissionCalendar` from the cached dump and MUST NOT perform HTTP

#### Scenario: Extra dump keys do not fail parse
- **WHEN** the cached dump includes fields the current card does not render
- **THEN** widgets `solved` and `heatmap` MUST still parse and MUST NOT fail because extra keys are present

#### Scenario: heatmap stays leetcode
- **WHEN** widget `heatmap` is resolved
- **THEN** it MUST declare integration `leetcode` only and MUST NOT be the github contribution heatmap

#### Scenario: Preview is not an embed API
- **WHEN** the docs playground previews a leetcode widget
- **THEN** it MUST use fixtures or skip live and MUST NOT treat `POST /api/preview` as a public embed API

### Requirement: Heatmap widget uses the Heatmap bit
Widget `heatmap` MUST render LeetCode solved days with the shared `Heatmap` bit (day grid of intensity cells). It MUST NOT use `Board`. Widget `solved` MUST NOT invent a new bit for counts already covered by Frozen 11 `Stat`. This change MUST NOT enumerate bits in `packages/core/src/types.ts`.

#### Scenario: LeetCode solved days use Heatmap not Board
- **WHEN** widget `heatmap` shows LeetCode solved days
- **THEN** it MUST use `Heatmap` and MUST NOT use `Board`

#### Scenario: Solved does not mint a new bit
- **WHEN** widget `solved` renders solved counts
- **THEN** it MUST NOT add a new bit name beyond Frozen 11 plus the OpenSpec-approved README-card primitives

### Requirement: ratings widget reads chess dumps with Stat
Widget `ratings` MUST declare integrations `chesscom` and `lichess`. It MUST
consume the cached dump and MUST NOT perform HTTP. It MUST render Stat chips
for available time-class ratings (bullet, blitz, rapid, daily or classical,
puzzle when present) and MUST NOT invent `0` for missing classes. Empty
rating data MUST render a “No ratings data” card, not crash. Default card
size MUST remain 480×160 SVG still. Widget id MUST be `ratings` and MUST NOT
be `stats`. Pack agents MUST NOT append `FIRST_PARTY_WIDGET_IDS`.

#### Scenario: ratings uses Stat and not stats id
- **WHEN** the chess ratings card is registered
- **THEN** its widget id MUST be `ratings`, it MUST NOT be `stats`, and its
  template MUST use the Stat bit

#### Scenario: ratings does not HTTP
- **WHEN** `ratings` renders from a dump with extra keys
- **THEN** it MUST NOT call `fetch` and MUST still render

#### Scenario: missing classes are omitted not zeroed
- **WHEN** the dump has blitz rating 2800 and no bullet object
- **THEN** the card MUST show blitz and MUST NOT render bullet as `0`

### Requirement: game widget renders Board from FEN or PGN
Widget `game` MUST declare integrations `chesscom` and `lichess`. It MUST
consume the cached dump and MUST NOT perform HTTP. It MUST prefer a `fen` or
`lastFen` field, else a PGN `[FEN ""]` tag, and pass that FEN to the Board
bit. It MUST NOT replay PGN moves with a chess engine. Missing position MUST
render “No game data” (or player names without a starting-position Board)
and MUST NOT crash. `game` is opt-in like github `demo` and MUST NOT become
a pack default. Default card size MUST remain 480×160 SVG still.

#### Scenario: game uses Board
- **WHEN** the dump includes a current or recent game FEN
- **THEN** the template MUST render the Board bit with that FEN

#### Scenario: PGN FEN tag is a fallback
- **WHEN** the dump has `pgn` with a `[FEN "…"]` tag and no `fen` field
- **THEN** Board MUST receive that tagged FEN

#### Scenario: empty game does not crash
- **WHEN** the dump has no current or recent game position
- **THEN** the widget MUST render a “No game data” card and MUST NOT throw

#### Scenario: game does not HTTP
- **WHEN** `game` renders from a dump
- **THEN** it MUST NOT call `fetch`

### Requirement: steam player widget selects from the dump
Widget `player` MUST declare integration `steam` only. It MUST consume
the cached steam dump (GetPlayerSummaries player object, plus
ResolveVanityURL when used) and MUST NOT perform HTTP. The card MUST
compose Frozen 11 `Stat` plus README-card `Image` (inventory Cover maps
to `Image`; the system MUST NOT create `Cover.tsx`). Default options
MUST be `filename` `player` and `animate` false. Empty or private
profiles MUST render an empty-state card and MUST NOT crash. The widget
MUST NOT invent `0` for omitted dump fields. `POST /api/preview` remains
layout preview, not a public embed API. Extra dump keys MUST NOT fail
parse.

#### Scenario: player declares steam only
- **WHEN** widget `player` is resolved
- **THEN** `WIDGET_INTEGRATIONS.player` MUST be `["steam"]`

#### Scenario: player reads the dump without HTTP
- **WHEN** widget `player` renders
- **THEN** it MUST select fields from the cached steam dump and MUST NOT
  perform HTTP

#### Scenario: player uses Stat and Image
- **WHEN** widget `player` is registered
- **THEN** it MUST use bits `Stat` and `Image` and MUST NOT create
  `Cover.tsx`

#### Scenario: empty player dump is an empty card
- **WHEN** GetPlayerSummaries returns no players
- **THEN** the widget MUST render an empty-state card, MUST NOT crash,
  and MUST NOT invent `0`

### Requirement: steam recent widget selects from the dump
Widget `recent` MUST declare integration `steam` only. It MUST consume
the cached GetRecentlyPlayedGames dump and MUST NOT perform HTTP. The
card MUST compose Frozen 11 `Stat` plus README-card `Image` (game icon;
Cover maps to `Image`). Yaml `limit` MUST be 1–16 default 5 and MUST
apply in the widget reader, not by dropping `games[]` at fetch. Default
`filename` MUST be `recent` and `animate` MUST default false. Empty
`games[]` MUST render an empty-state card and MUST NOT invent `0`. Extra
dump keys MUST NOT fail parse. `recent` MUST be opt-in (not a pack
default). `POST /api/preview` remains layout preview, not a public embed
API.

#### Scenario: recent declares steam only
- **WHEN** widget `recent` is resolved
- **THEN** `WIDGET_INTEGRATIONS.recent` MUST be `["steam"]`

#### Scenario: recent reads the dump without HTTP
- **WHEN** widget `recent` renders
- **THEN** it MUST select fields from the cached steam dump and MUST NOT
  perform HTTP

#### Scenario: recent limit is widget-side
- **WHEN** yaml `limit` is `1` and the dump `games[]` has more than one
  game
- **THEN** the widget MUST apply `limit` while reading the dump and the
  cached dump MUST still contain the unsliced list

#### Scenario: empty recent dump is an empty card
- **WHEN** GetRecentlyPlayedGames returns `total_count` 0 or an empty
  `games[]`
- **THEN** the widget MUST render an empty-state card, MUST NOT crash,
  and MUST NOT invent `0`

#### Scenario: recent uses Stat and Image
- **WHEN** widget `recent` is registered
- **THEN** it MUST use bits `Stat` and `Image` and MUST NOT create
  `Cover.tsx`
