## ADDED Requirements

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
