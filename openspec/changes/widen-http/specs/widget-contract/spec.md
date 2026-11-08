## ADDED Requirements

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

## MODIFIED Requirements

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

#### Scenario: cache retains link while render ignores it
- **WHEN** the cached dump includes `link` or `href`
- **THEN** those keys MUST remain on the cached dump and the rendered chip MUST still ignore them as per-chip links

#### Scenario: empty successful list renders No data
- **WHEN** every type GET and normalize succeeds and the resulting chip list is empty
- **THEN** the widget MUST render a “No data” card and MUST NOT crash

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
