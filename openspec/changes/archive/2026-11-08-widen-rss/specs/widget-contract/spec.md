## MODIFIED Requirements

### Requirement: Frozen feed widget options
Widget `feed` MUST use integration `rss` only. Options MUST be: `filename` (default `feed`); `url` (required; https only; no username or password); `limit` 1–8 default 5; `animate` bool default false. The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The widget MUST consume the cached rss **feed+item dump** and MUST NOT perform HTTP itself. The leftover frozen triple `{ title, url, published_at }` MUST be the feed widget reader (not the cache schema). Extra dump fields (`id`, `content`, `summary`, `authors`, `categories`, `updated`, `enclosures`, feed metadata) MUST remain available on the dump and MUST NOT be required for `feed` to render. The widget MUST slice dump `items` to `limit`. The widget MAY still render title, url, and date. Empty dump `items` MUST render a “No feed items” card, not crash. `animate` MUST be plumbed; gif/apng motion for `feed` is not required. A skipped `feed` widget MUST NOT write files (inherited skip-without-write). A 404 feed URL MUST fail the widget. Malformed XML MUST fail the widget (not skip). `http://` MUST fail yaml parse. URL userinfo MUST fail yaml parse. Redirect-to-http MUST fail fetch (not parse). The system MUST NOT add flattened `plugin_<plugin>_<widget>_<option>` Action inputs such as `plugin_rss_feed_url`. This change MUST NOT add a new first-party widget id.

#### Scenario: Feed defaults
- **WHEN** `feed` is enabled with `url` and no other option overrides
- **THEN** `filename` MUST be `feed`, `limit` MUST be 5, `animate` MUST be false, the card MUST be 480×160 svg, and the widget MUST NOT perform HTTP

#### Scenario: Empty feed items card
- **WHEN** the cached rss dump has no items
- **THEN** the widget MUST render a “No feed items” card and MUST NOT crash

#### Scenario: leftover triple is the feed widget reader
- **WHEN** the cached dump includes id, content, summary, authors, categories, updated, enclosures, and feed metadata in addition to title, url, and published_at
- **THEN** the feed widget MUST read `{ title, url, published_at }` from dump items, MAY still render title / url / date, and MUST NOT require the extra dump fields to render

#### Scenario: feed widget slices dump items to limit
- **WHEN** dump `items` length exceeds `limit`
- **THEN** the widget MUST slice `items` to `limit` and MUST NOT ask the rss client to drop dump fields

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

#### Scenario: No flattened feed Action inputs
- **WHEN** this change lands
- **THEN** the Action MUST NOT declare `plugin_rss_feed_url` or any `plugin_rss_feed_*` input
