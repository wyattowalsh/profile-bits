## MODIFIED Requirements

### Requirement: First-party github plugin catalog
The first plugin id MUST be `github`. That plugin MUST include widgets `demo`, `stats`, `languages`, and opt-in `repo`. The `github` plugin MUST declare integrations used by those widgets (`static` for `demo`, `github` for `stats`, `languages`, and `repo`). First-party plugin ids MUST be `github`, `wakatime`, `rss`, and `http`. The github v0 widget set MUST remain `demo`, `stats`, and `languages`. Widget `repo` MUST be additive on pack `github` and MUST NOT be a fifth first-party plugin id. The system MUST NOT describe the catalog as `github` and `rss` only.

#### Scenario: github plugin widgets
- **WHEN** the `github` plugin is enabled
- **THEN** widgets `demo`, `stats`, `languages`, and `repo` MUST be available on that pack, github v0 widgets MUST remain `demo`, `stats`, and `languages`, widget `repo` MUST NOT be a new plugin id, and first-party plugin ids MUST be `github`, `wakatime`, `rss`, and `http`

#### Scenario: repo is not a fifth pack
- **WHEN** widget `repo` is registered
- **THEN** the plugin id MUST remain `github` and first-party plugin ids MUST stay `github`, `wakatime`, `rss`, and `http`

### Requirement: Default widget list when plugin is on
When the `github` plugin is on and no widget list is specified, the system MUST enable `stats` and `languages`. Widget `demo` MUST be opt-in (playground smoke / explicit yaml), not part of pack defaults. Widget `repo` MUST be opt-in like `demo` and MUST NOT become a pack default.

#### Scenario: Pack defaults omit demo
- **WHEN** the github plugin is enabled with no widget list
- **THEN** the enabled widgets MUST be `stats` and `languages` and `demo` MUST remain disabled until explicitly enabled

#### Scenario: Pack defaults omit repo
- **WHEN** the github plugin is enabled with no widget list
- **THEN** the enabled widgets MUST be `stats` and `languages` and `repo` MUST remain disabled until explicitly enabled

#### Scenario: plugin_github true without yaml does not enable repo
- **WHEN** the config file is absent and `plugin_github` is true
- **THEN** the Action MUST enable github pack defaults `stats` and `languages` and MUST NOT enable `repo`

### Requirement: No flattened plugin option inputs
The system MUST NOT generate Action inputs of the form `plugin_<plugin>_<widget>_<option>` (including `plugin_github_stats_include`, `plugin_github_repo_include`, `plugin_github_widgets` CSV, `plugin_github_filename_*`, `plugin_wakatime_coding_*`, `plugin_rss_feed_url`, `plugin_http_json_url`, and `plugin_http_chips_preset`). Codegen `--check` MUST fail if a generated input matches `plugin_github_stats_include`, `plugin_github_repo_include`, `plugin_wakatime_coding_range`, `plugin_rss_feed_url`, `plugin_http_json_url`, `plugin_http_chips_preset`, or a similar flattened option name. The Action MUST NOT expose a `plugin_http` bool input. The Action MUST NOT expose a `plugin_github_repo` input.

#### Scenario: Codegen check rejects flattened include
- **WHEN** generated `action.yml` contains an input named `plugin_github_stats_include` or another `plugin_<plugin>_<widget>_<option>` name
- **THEN** `generate-action --check` MUST fail

#### Scenario: Codegen check rejects plugin_github_repo_include
- **WHEN** generated `action.yml` contains an input named `plugin_github_repo_include` or another `plugin_github_repo_*` name
- **THEN** `generate-action --check` MUST fail

#### Scenario: Codegen check rejects plugin_wakatime_coding_range
- **WHEN** generated `action.yml` contains an input named `plugin_wakatime_coding_range` or another `plugin_wakatime_coding_*` name
- **THEN** `generate-action --check` MUST fail

#### Scenario: Codegen check rejects plugin_rss_feed_url
- **WHEN** generated `action.yml` contains an input named `plugin_rss_feed_url`
- **THEN** `generate-action --check` MUST fail

#### Scenario: Codegen check rejects plugin_http_chips_preset
- **WHEN** generated `action.yml` contains an input named `plugin_http_chips_preset`
- **THEN** `generate-action --check` MUST fail

#### Scenario: Codegen check rejects plugin_http_json_url
- **WHEN** generated `action.yml` contains an input named `plugin_http_json_url`
- **THEN** `generate-action --check` MUST fail

#### Scenario: no plugin_github_repo Action input
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_github_repo` or any `plugin_github_repo_*` input and MUST still contain `plugin_github`

### Requirement: Action constructs one shared wakatime client when the pack is on
When yaml `plugins.wakatime` is present, the Action MUST construct exactly one shared wakatime client per run and MUST pass that instance to every coding render in that run. The Action MUST NOT construct a wakatime client when the pack is absent. Pack on plus missing / `""` / whitespace `wakatime_token` MUST fail the job (`fail_job`) in the engine **before** `renderWidget` runs. Pack absent MUST NOT require `wakatime_token` and MUST NOT fail the job for a missing WakaTime token. `loadConfig` MUST NOT fail the job solely because the token is missing. Error messages MUST NOT include the token value. The Action MUST NEVER log the token.

GitHub widgets in the same run MUST use the existing github client. The Action MUST construct at most one github client per run, and MUST construct it only when at least one github widget (`demo`, `stats`, `languages`, or `repo`) is enabled. Widget `repo` MUST use that same client for the single-repo GET. The Action MUST NOT construct a second github client for `repo`.

#### Scenario: pack on constructs one wakatime client
- **WHEN** yaml includes `plugins.wakatime` and `wakatime_token` is present
- **THEN** the Action MUST construct exactly one wakatime client for that run and MUST use it for coding fetch

#### Scenario: pack off does not construct a wakatime client
- **WHEN** yaml omits `plugins.wakatime`
- **THEN** the Action MUST NOT construct a wakatime client and MUST NOT require `wakatime_token`

#### Scenario: pack on plus missing token fails the job before render
- **WHEN** yaml includes `plugins.wakatime` and `wakatime_token` is empty, `""`, or whitespace
- **THEN** the Action MUST fail the job before `renderWidget` and MUST NOT include the token value in the error

#### Scenario: github widgets use the existing github client
- **WHEN** github widgets are enabled in the same run as coding
- **THEN** the Action MUST use the existing github client for demo/stats/languages/repo and MUST NOT construct a wakatime client for those widgets

#### Scenario: repo-only yaml constructs one github client
- **WHEN** yaml enables `plugins.github.widgets.repo` and omits stats and languages
- **THEN** the Action MUST construct exactly one github client for that run and MUST NOT skip client construction solely because the pack defaults were not used

### Requirement: Action enabledWidgets includes coding without adding further pack ids
The Action engine's enabled widget list MUST include `{ id: "coding" }` when yaml `plugins.wakatime` enables widget `coding` (including empty `plugins.wakatime: {}`). Default committed yaml remains github-only and MUST still run github widgets without a WakaTime token. WakaTime-only yaml (`plugins.wakatime: {}` with github omitted) MUST run coding without treating the run as “every github widget skipped”. Coding outcomes MUST NOT join `decideAllGithubWidgetsSkipped`. `enabledWidgets` MUST keep the first-party widget ids `demo`, `stats`, `languages`, `repo`, `coding`, `feed`, `json`, and `chips`. This requirement MUST NOT drop rss or http widgets. `enabledWidgets` MUST include `{ id: "repo" }` when yaml `plugins.github.widgets.repo` is present.

`preflightWidget` MUST NOT apply `include_private` to coding or to `repo`. Coding or `repo` that is enabled MUST preflight as `render` (github auth already gated by the required Action token; `repo` has no `include_private` option).

#### Scenario: empty wakatime pack enables coding in the Action
- **WHEN** yaml contains `plugins.wakatime: {}` and a WakaTime token is present
- **THEN** the Action MUST enable widget `coding` and MUST attempt to write its output

#### Scenario: default github yaml does not construct wakatime
- **WHEN** the Action runs the default github-only yaml with no `plugins.wakatime`
- **THEN** github widgets MUST still render and the Action MUST NOT construct a wakatime client

#### Scenario: coding fail_widget does not trip github skip-all
- **WHEN** a coding widget is `fail_widget` and at least one github widget rendered
- **THEN** the Action MUST NOT throw the all-github-widgets-skipped error solely because of coding

#### Scenario: wakatime-only yaml is not every github widget skipped
- **WHEN** yaml enables only `plugins.wakatime` (github omitted) and `allow_skipped` is false
- **THEN** a successful coding render MUST NOT fail the job as “every github widget skipped”

#### Scenario: coding is included alongside github feed json and chips
- **WHEN** the Action builds the enabled widget list for a run
- **THEN** widget ids MUST be drawn from `demo`, `stats`, `languages`, `repo`, `coding`, `feed`, `json`, and `chips`

#### Scenario: enabledWidgets includes repo when yaml present
- **WHEN** yaml includes `plugins.github.widgets.repo` with a valid `repo: owner/name`
- **THEN** `enabledWidgets` MUST include `{ id: "repo" }`

#### Scenario: repo skips include_private preflight
- **WHEN** widget `repo` is enabled
- **THEN** preflight MUST be `render` and MUST NOT read `include_private`

## ADDED Requirements

### Requirement: Github pack widget repo is yaml opt-in
Widget `repo` MUST be a widget on pack `github` with integration `github`. It MUST be on only when yaml `plugins.github.widgets.repo` is present. Required yaml `repo` MUST be `owner/name`. Missing `repo`, a value without `/`, or an unknown `include` token MUST fail parse. Default committed yaml MUST remain github `stats` and `languages` and MUST NOT auto-enable `repo`. Http widget `chips` MUST remain on pack `http` and MUST NOT share widget id `repo`. The Action MUST NOT expose `plugin_github_repo` or flattened `plugin_github_repo_*` inputs.

Example:

```yaml
plugins:
  github:
    widgets:
      repo:
        filename: repo
        repo: wyattowalsh/profile-bits
        include: [stars, forks, issues, license]
```

#### Scenario: repo on only when widgets.repo is present
- **WHEN** yaml includes github pack defaults and omits `widgets.repo`
- **THEN** parse MUST succeed and MUST enable `stats` and `languages` and MUST NOT enable `repo`

#### Scenario: valid repo yaml enables the widget
- **WHEN** yaml includes `plugins.github.widgets.repo` with `repo: wyattowalsh/profile-bits`
- **THEN** parse MUST succeed and MUST enable widget `repo`

#### Scenario: missing repo field fails parse
- **WHEN** yaml `plugins.github.widgets.repo` omits `repo`
- **THEN** parse MUST fail

#### Scenario: repo without owner/name slash fails parse
- **WHEN** yaml `widgets.repo.repo` is `profile-bits` with no `/`
- **THEN** parse MUST fail

#### Scenario: unknown repo include token fails parse
- **WHEN** yaml `widgets.repo.include` contains a token other than `stars`, `forks`, `watchers`, `issues`, `license`, or `language`
- **THEN** parse MUST fail

#### Scenario: chips remains a different surface
- **WHEN** yaml enables http `chips` and github `repo` in the same document
- **THEN** parse MUST treat them as distinct widgets on packs `http` and `github` and MUST NOT alias `repo` to `chips`
