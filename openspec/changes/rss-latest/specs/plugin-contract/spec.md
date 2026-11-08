## MODIFIED Requirements

### Requirement: First-party rss plugin pack
The plugin id `rss` MUST be a first-party pack with widgets `[feed, latest]` and integrations `[rss]`. The pack MUST be off unless yaml `plugins.rss` is present. Pack defaults MUST remain `[feed]`; widget `latest` MUST be opt-in. The Action MUST NOT expose a `plugin_rss` bool input. The Action MUST NOT expose flattened `plugin_rss_*` inputs. `widgets.feed.url` MUST be required when the rss pack is present; `plugins: { rss: {} }` MUST fail parse. Feed defaults MUST stay `filename: feed`, `limit: 5` (range 1–8), `animate: false`. Latest defaults MUST be `filename: latest`, `limit: 1` (range 1–8), `animate: false`. Both `widgets.feed.url` and `widgets.latest.url` MUST be https without username or password. Pack-level `bitsUsed` MUST include `Time` once `latest` is registered. This change MUST NOT add a new first-party plugin id. Pack agents MUST NOT edit `packages/core/src/types.ts`.

Example:

```yaml
plugins:
  rss:
    widgets:
      feed:
        filename: feed
        url: https://example.com/feed.xml
        limit: 5
        animate: false
      latest:
        filename: latest
        url: https://example.com/feed.xml
        limit: 1
        animate: false
```

#### Scenario: rss pack off unless yaml present
- **WHEN** committed yaml omits `plugins.rss`
- **THEN** the rss pack MUST be disabled and no feed or latest widget MUST run

#### Scenario: empty rss plugin fails parse
- **WHEN** yaml contains `plugins.rss` without `widgets.feed.url`
- **THEN** parse MUST fail

#### Scenario: latest is opt-in
- **WHEN** yaml enables `plugins.rss` with `widgets.feed.url` and omits `widgets.latest`
- **THEN** pack defaults MUST still enable `feed` only and MUST NOT require `latest`

#### Scenario: rss widgets include latest
- **WHEN** `rssPlugin` is read
- **THEN** `widgets` MUST be `[feed, latest]`, `integrations` MUST be `[rss]`, and `defaults.widgets` MUST be `[feed]`

#### Scenario: no plugin_rss Action input
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_rss` or any `plugin_rss_*` input and MUST still contain `plugin_github`

#### Scenario: rss does not join github all-skipped rule
- **WHEN** an rss feed or latest widget fails or is skipped and github widgets are not all skipped
- **THEN** the Action MUST NOT fail the job solely because of the rss widget and MUST NOT treat rss as a github widget for the all-github-widgets-skipped rule

#### Scenario: rss fail_widget does not fail the job when other widgets rendered
- **WHEN** an rss feed widget ends in `fail_widget` and at least one other enabled widget rendered or skipped without failing the job
- **THEN** the Action MUST NOT fail the job because of that rss widget, MUST NOT write that rss widget’s output, and MUST NOT treat rss as a github widget for the all-github-widgets-skipped rule

#### Scenario: rss-only 404 does not fail the job
- **WHEN** yaml enables rss `feed` and no github widgets, and the feed URL returns HTTP 404
- **THEN** the Action MUST succeed with no rss output files and MUST NOT fail the job solely because of the rss widget

