## MODIFIED Requirements

### Requirement: First-party github plugin catalog
The first plugin id MUST be `github`. That plugin MUST include widgets `demo`, `stats`, and `languages`. The `github` plugin MUST declare integrations used by those widgets (`static` for `demo`, `github` for `stats` and `languages`). First-party plugin ids MUST be `github`, `wakatime`, `rss`, and `http`. This change **adds** first-party plugin id `rss` without removing `github`, `wakatime`, or `http`. The github v0 widget set MUST remain `demo`, `stats`, and `languages`. The system MUST NOT add first-party plugin ids other than `rss` in this change. The system MUST NOT describe the catalog as `github` and `rss` only.

#### Scenario: github plugin widgets
- **WHEN** the `github` plugin is enabled
- **THEN** widgets `demo`, `stats`, and `languages` MUST be available on that pack, github v0 widgets MUST remain unchanged, and first-party plugin ids MUST be `github`, `wakatime`, `rss`, and `http`

### Requirement: Yaml document shape
A valid yaml document MUST accept this github-only default shape, and MAY additionally include optional `plugins.rss` as a sibling of `plugins.github` (unknown keys fail parse). The document MUST NOT forbid other optional plugin siblings (`wakatime`, `http`). Root fields MUST be `version`, `format`, `theme`, `output_pair`, `animated`, `timezone`, `output_dir`, and `plugins`. Default values MUST match:

```yaml
version: 1
format: svg
theme: dark
output_pair: false
animated: false
timezone: UTC
output_dir: profile-bits
plugins:
  github:
    widgets:
      stats:
        filename: stats
        include: [followers, repos, stars]
        hide_rank: true
        avatar: true
        animate: false
        include_private: false
        include_forks: false
        include_archived: false
      languages:
        filename: languages
        limit: 8
        min_pct: 1
        exclude: []
        animate: false
        include_private: false
        include_forks: false
        include_archived: false
```

When `plugins.rss` is present, its widget tree MUST follow the first-party rss plugin pack requirement. The default example document MUST remain github-only. `theme` MUST be `light` or `dark` (default `dark`). `output_pair: true` MUST write `filename` plus `filename-dark` under `output_dir`. `format: apng` MUST use a `.png` extension. Tokens, `user`, `output_action`, `dry_run`, `allow_skipped`, `committer_*`, `output_condition`, and `config` path MUST stay in thin `action.yml`, not in this yaml document.

#### Scenario: Default yaml shape
- **WHEN** a consumer commits the default `.github/profile-bits.yml`
- **THEN** parse MUST succeed with `version: 1`, `format: svg`, `theme: dark`, `output_pair: false`, `animated: false`, `timezone: UTC`, `output_dir: profile-bits`, and github widgets `stats` and `languages` using the default option values above

#### Scenario: output_pair writes paired files
- **WHEN** yaml `output_pair` is true
- **THEN** the Action MUST write both `filename` and `filename-dark` under `output_dir`

#### Scenario: Optional plugins.rss sibling
- **WHEN** yaml includes `plugins.rss` as a sibling of `plugins.github` with a valid `widgets.feed.url`
- **THEN** parse MUST succeed and MUST keep the github widget tree; unknown keys MUST still fail parse

### Requirement: No flattened plugin option inputs
The system MUST NOT generate Action inputs of the form `plugin_<plugin>_<widget>_<option>` (including `plugin_github_stats_include`, `plugin_github_widgets` CSV, `plugin_github_filename_*`, and `plugin_rss_feed_url`). Codegen `--check` MUST fail if a generated input matches `plugin_github_stats_include`, `plugin_rss_feed_url`, or a similar flattened option name.

#### Scenario: Codegen check rejects flattened include
- **WHEN** generated `action.yml` contains an input named `plugin_github_stats_include` or another `plugin_<plugin>_<widget>_<option>` name
- **THEN** `generate-action --check` MUST fail

#### Scenario: Codegen check rejects plugin_rss_feed_url
- **WHEN** generated `action.yml` contains an input named `plugin_rss_feed_url`
- **THEN** `generate-action --check` MUST fail

## ADDED Requirements

### Requirement: First-party rss plugin pack
The plugin id `rss` MUST be a first-party pack with widgets `[feed]` and integrations `[rss]`. The pack MUST be off unless yaml `plugins.rss` is present. The Action MUST NOT expose a `plugin_rss` bool input. The Action MUST NOT expose flattened `plugin_rss_*` inputs. `widgets.feed.url` MUST be required; `plugins: { rss: {} }` MUST fail parse. Defaults MUST be `filename: feed`, `limit: 5` (range 1–8), `animate: false`. `widgets.feed.url` MUST be https without username or password.

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
```

#### Scenario: rss pack off unless yaml present
- **WHEN** committed yaml omits `plugins.rss`
- **THEN** the rss pack MUST be disabled and no feed widget MUST run

#### Scenario: empty rss plugin fails parse
- **WHEN** yaml contains `plugins.rss` without `widgets.feed.url`
- **THEN** parse MUST fail

#### Scenario: no plugin_rss Action input
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_rss` or any `plugin_rss_*` input and MUST still contain `plugin_github`

#### Scenario: rss does not join github all-skipped rule
- **WHEN** an rss feed widget fails or is skipped and github widgets are not all skipped
- **THEN** the Action MUST NOT fail the job solely because of the rss widget and MUST NOT treat rss as a github widget for the all-github-widgets-skipped rule

#### Scenario: rss fail_widget does not fail the job when other widgets rendered
- **WHEN** an rss feed widget ends in `fail_widget` and at least one other enabled widget rendered or skipped without failing the job
- **THEN** the Action MUST NOT fail the job because of that rss widget, MUST NOT write that rss widget’s output, and MUST NOT treat rss as a github widget for the all-github-widgets-skipped rule

#### Scenario: rss-only 404 does not fail the job
- **WHEN** yaml enables rss `feed` and no github widgets, and the feed URL returns HTTP 404
- **THEN** the Action MUST succeed with no rss output files and MUST NOT fail the job solely because of the rss widget
