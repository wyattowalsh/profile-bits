## ADDED Requirements

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
