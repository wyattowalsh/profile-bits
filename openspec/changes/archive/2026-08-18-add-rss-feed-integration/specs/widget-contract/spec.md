## ADDED Requirements

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
