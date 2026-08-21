# plugin-contract Specification

## Purpose

Defines a plugin as a pack of widgets plus declared integrations, and locks yaml SSOT plus a thin Action public surface so widget options never become flattened Marketplace inputs.

## Requirements

### Requirement: Plugin is a pack of widgets and integrations
A plugin SHALL be a collection of widgets plus a derived union of integrations, not a single card and not a single API. A plugin MUST declare 1..N widgets and 0..N integrations. Adding a widget MUST NOT require a new plugin. Adding an integration MUST NOT require a new plugin. Core MUST NOT assume one plugin equals one image equals one API.

#### Scenario: Plugin declares multiple widgets
- **WHEN** a plugin pack is registered
- **THEN** it MUST expose a widget list of length at least 1 and an integrations union derived from those widgets

#### Scenario: New widget stays on existing pack
- **WHEN** a new card is added to an existing pack
- **THEN** the system MUST register it as a widget on that plugin rather than creating a new plugin

### Requirement: First-party github plugin catalog
The first plugin id MUST be `github`. That plugin MUST include widgets `demo`, `stats`, and `languages`. The `github` plugin MUST declare integrations used by those widgets (`static` for `demo`, `github` for `stats` and `languages`). First-party plugin ids MUST be `github`, `wakatime`, `rss`, and `http`. The github v0 widget set MUST remain `demo`, `stats`, and `languages`. The system MUST NOT describe the catalog as `github` and `rss` only.

#### Scenario: github plugin widgets
- **WHEN** the `github` plugin is enabled
- **THEN** widgets `demo`, `stats`, and `languages` MUST be available on that pack, github v0 widgets MUST remain unchanged, and first-party plugin ids MUST be `github`, `wakatime`, `rss`, and `http`

### Requirement: Default widget list when plugin is on
When the `github` plugin is on and no widget list is specified, the system MUST enable `stats` and `languages`. Widget `demo` MUST be opt-in (playground smoke / explicit yaml), not part of pack defaults.

#### Scenario: Pack defaults omit demo
- **WHEN** the github plugin is enabled with no widget list
- **THEN** the enabled widgets MUST be `stats` and `languages` and `demo` MUST remain disabled until explicitly enabled

### Requirement: Committed yaml is config SSOT
Committed `.github/profile-bits.yml` MUST be the configuration source of truth for plugin/widget/option trees, filenames, and format/theme defaults. Yaml parse MUST use `additionalProperties: false`. Widget options MUST live in yaml and MAY change without a Marketplace input bump.

#### Scenario: Yaml file is source of truth
- **WHEN** `.github/profile-bits.yml` exists at the configured path
- **THEN** plugin, widget, and option configuration MUST be taken from that file rather than from flattened Action inputs

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

### Requirement: Thin root action.yml
Root `action.yml` MUST be thin. Allowed inputs MUST be: `user` (default `github.repository_owner`); `github_token` (API; default `${{ github.token }}` when omitted); `committer_token` (git; default `${{ github.token }}`); `config` (path, default `.github/profile-bits.yml`); `output_action`; `dry_run`; optional `format` / `theme` / `output_pair` / `animated` overrides; optional `plugin_github` bool; plus `committer_branch`, `committer_gist`, `output_condition` (`always` | `data-changed`), `timezone`, and `allow_skipped` (default false). Empty / `""` / whitespace `github_token` MUST be treated as missing (not as omitted default). Breaking a thin input MUST be semver major.

#### Scenario: Omitted token uses github.token
- **WHEN** `github_token` is omitted from the workflow
- **THEN** the Action MUST use `${{ github.token }}` as the API token

#### Scenario: Empty token is not omitted
- **WHEN** `github_token` is provided as empty, `""`, or whitespace
- **THEN** the Action MUST treat the token as missing and MUST fail the job rather than substituting `${{ github.token }}` or calling GitHub unauthenticated

### Requirement: No flattened plugin option inputs
The system MUST NOT generate Action inputs of the form `plugin_<plugin>_<widget>_<option>` (including `plugin_github_stats_include`, `plugin_github_widgets` CSV, `plugin_github_filename_*`, and `plugin_rss_feed_url`). Codegen `--check` MUST fail if a generated input matches `plugin_github_stats_include`, `plugin_rss_feed_url`, or a similar flattened option name.

#### Scenario: Codegen check rejects flattened include
- **WHEN** generated `action.yml` contains an input named `plugin_github_stats_include` or another `plugin_<plugin>_<widget>_<option>` name
- **THEN** `generate-action --check` MUST fail

#### Scenario: Codegen check rejects plugin_rss_feed_url
- **WHEN** generated `action.yml` contains an input named `plugin_rss_feed_url`
- **THEN** `generate-action --check` MUST fail

### Requirement: Config precedence yaml over plugin_github
If the config file exists, yaml MUST win and `plugin_github` MUST be ignored. `plugin_github: true` MUST apply pack defaults (`stats`, `languages`) only when the config file is absent.

#### Scenario: Existing yaml ignores plugin_github
- **WHEN** `.github/profile-bits.yml` exists and `plugin_github` is also set
- **THEN** configuration MUST come from yaml and `plugin_github` MUST have no effect

#### Scenario: plugin_github applies only without config
- **WHEN** the config file is absent and `plugin_github` is true
- **THEN** the Action MUST enable github pack defaults `stats` and `languages`

### Requirement: Unknown yaml keys and include tokens fail parse
Unknown yaml keys MUST fail parse. Unknown `include` tokens MUST fail parse. Parse MUST NOT silently drop unknown fields.

#### Scenario: Unknown yaml key
- **WHEN** yaml contains a key not in the frozen schema
- **THEN** parse MUST fail the job

#### Scenario: Unknown include token
- **WHEN** stats `include` contains a token other than `followers`, `following`, `repos`, `stars`, `forks`, `gists`, or `contributions`
- **THEN** parse MUST fail the job

### Requirement: Action commits widget files only
The Action MUST commit widget files under `output_dir` only. The Action MUST NOT patch consumer `README.md`. Playground and examples MAY emit markdown for the user to paste.

#### Scenario: README is not patched
- **WHEN** the Action runs with `output_action: commit`
- **THEN** widget files MUST be written under `output_dir` and `README.md` MUST NOT be modified by the Action

### Requirement: output_action modes
`output_action` MUST be one of `none` | `commit` | `pull-request` | `gist` (default `commit`). `gist` MUST be SVG only. `gist` with a non-svg format MUST fail. `output_action: gist` without `canGist` MUST fail the run. Pull-request output MUST require `permissions: { contents: write, pull-requests: write }`.

#### Scenario: gist without canGist fails the run
- **WHEN** `output_action` is `gist` and the token cannot create gists (`canGist` is false)
- **THEN** the run MUST fail

#### Scenario: gist with non-svg format fails
- **WHEN** `output_action` is `gist` and format is not `svg`
- **THEN** the run MUST fail with a clear error

### Requirement: Action runtime and dist policy
`runs.using` MUST be `node24` only. `dist/` MUST be gitignored on `main` and committed only on the orphan `release/v1` tree.

#### Scenario: node24 runtime
- **WHEN** root `action.yml` is generated
- **THEN** `runs.using` MUST be `node24`

#### Scenario: dist gitignored on main
- **WHEN** sources live on `main`
- **THEN** `dist/` MUST be gitignored and MUST NOT be required for the contract to be valid on `main`

### Requirement: All github widgets skipped fails the job
If every github widget is skipped and `allow_skipped` is false, the Action MUST fail the job. If `allow_skipped` is true, the job MAY complete without widget files.

#### Scenario: all github widgets skipped and allow_skipped false
- **WHEN** every github widget is skipped and `allow_skipped` is false
- **THEN** the job MUST fail

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

### Requirement: Compose routes chips through the existing json http adapter
The Action compositor MUST route widget ids `json` and `chips` to the existing json http adapter slot. The compositor MUST NOT add a separate chips adapter key and MUST NOT rename that json slot. Widget `stats` MUST still route to github. Widget `feed` MUST remain on the feed adapter when injected.

Json plus chips in one Action run MUST NOT throw `UnhandledActionWidgetError`. A chips `fail_widget` after a successful json render MUST NOT drop the json writes. This change MUST NOT edit Action entry `main.ts`. Json is already injected there; chips MUST become handled by compose plus the http adapter.

#### Scenario: chips uses the json adapter slot
- **WHEN** compose receives widget id `chips`
- **THEN** it MUST invoke the existing json http adapter and MUST NOT fall through to github

#### Scenario: stats still uses github
- **WHEN** compose receives widget id `stats`
- **THEN** it MUST invoke the github adapter and MUST NOT send stats to the http adapter

#### Scenario: feed remains on the feed adapter
- **WHEN** compose receives widget id `feed` and a feed adapter is injected
- **THEN** it MUST invoke that feed adapter unchanged

#### Scenario: mixed json and chips does not throw unhandled Action widget
- **WHEN** yaml enables json and chips in one run
- **THEN** the Action MUST NOT throw `UnhandledActionWidgetError` for chips

#### Scenario: chips 404 does not drop json writes
- **WHEN** json renders successfully and chips then fails `fail_widget`
- **THEN** the Action MUST still write the json files and MUST NOT skip `writeFiles` because chips threw

#### Scenario: this change does not edit main.ts
- **WHEN** this change is applied
- **THEN** `packages/action/src/main.ts` MUST remain unedited and chips MUST be handled without a new compose key in that file

### Requirement: Http pack bitsUsed is Theme Frame Muted Chip
The first-party `http` pack MUST keep widgets `[json, chips]` and MUST declare `bitsUsed` `["Theme","Frame","Muted","Chip"]`. Json MAY use zero bits. Chips MUST NOT be restyled onto bits `Row` as a substitute for Chip chrome.

#### Scenario: pack widgets and bitsUsed
- **WHEN** the http pack identity is read
- **THEN** widgets MUST be `[json, chips]` and `bitsUsed` MUST be `["Theme","Frame","Muted","Chip"]`
