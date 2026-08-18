## ADDED Requirements

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
