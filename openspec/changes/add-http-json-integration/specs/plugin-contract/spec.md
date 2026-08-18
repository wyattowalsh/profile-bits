## MODIFIED Requirements

### Requirement: First-party github plugin catalog
The first plugin id MUST be `github`. That plugin MUST include widgets `demo`, `stats`, and `languages`. The `github` plugin MUST declare integrations used by those widgets (`static` for `demo`, `github` for `stats` and `languages`). The github v0 widget set MUST remain `demo`, `stats`, and `languages`. This change **adds** first-party plugin id `http`. The system MUST NOT add first-party plugin ids other than `http` in this change.

#### Scenario: github plugin widgets
- **WHEN** the `github` plugin is enabled
- **THEN** widgets `demo`, `stats`, and `languages` MUST be available on that pack, github v0 widgets MUST remain unchanged, and this change MUST have added first-party id `http` without removing other first-party ids

### Requirement: Yaml document shape
A valid yaml document MUST accept this github-only default shape, and MAY additionally include optional `plugins.http` as a sibling of `plugins.github` (unknown keys fail parse). The document MUST NOT forbid other optional plugin siblings introduced by other changes. Root fields MUST be `version`, `format`, `theme`, `output_pair`, `animated`, `timezone`, `output_dir`, and `plugins`. Default values MUST match:

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

When `plugins.http` is present, its widget tree MUST follow the first-party http plugin pack requirement. The default example document MUST remain github-only. `theme` MUST be `light` or `dark` (default `dark`). `output_pair: true` MUST write `filename` plus `filename-dark` under `output_dir`. `format: apng` MUST use a `.png` extension. Tokens, `user`, `output_action`, `dry_run`, `allow_skipped`, `committer_*`, `output_condition`, and `config` path MUST stay in thin `action.yml`, not in this yaml document.

#### Scenario: Default yaml shape
- **WHEN** a consumer commits the default `.github/profile-bits.yml`
- **THEN** parse MUST succeed with `version: 1`, `format: svg`, `theme: dark`, `output_pair: false`, `animated: false`, `timezone: UTC`, `output_dir: profile-bits`, and github widgets `stats` and `languages` using the default option values above

#### Scenario: output_pair writes paired files
- **WHEN** yaml `output_pair` is true
- **THEN** the Action MUST write both `filename` and `filename-dark` under `output_dir`

#### Scenario: Optional plugins.http sibling
- **WHEN** yaml includes `plugins.http` as a sibling of `plugins.github` with a valid `widgets.json.url`
- **THEN** parse MUST succeed and MUST keep the github widget tree; unknown keys MUST still fail parse

### Requirement: Thin root action.yml
Root `action.yml` MUST be thin. Allowed inputs MUST be: `user` (default `github.repository_owner`); `github_token` (API; default `${{ github.token }}` when omitted); `committer_token` (git; default `${{ github.token }}`); `config` (path, default `.github/profile-bits.yml`); `output_action`; `dry_run`; optional `format` / `theme` / `output_pair` / `animated` overrides; optional `plugin_github` bool; optional `http_token_env` (env **name**, default unset); plus `committer_branch`, `committer_gist`, `output_condition` (`always` | `data-changed`), `timezone`, and `allow_skipped` (default false). Empty / `""` / whitespace `github_token` MUST be treated as missing (not as omitted default). The Action MUST NOT expose a `plugin_http` bool input. Breaking a thin input MUST be semver major.

#### Scenario: Omitted token uses github.token
- **WHEN** `github_token` is omitted from the workflow
- **THEN** the Action MUST use `${{ github.token }}` as the API token

#### Scenario: Empty token is not omitted
- **WHEN** `github_token` is provided as empty, `""`, or whitespace
- **THEN** the Action MUST treat the token as missing and MUST fail the job rather than substituting `${{ github.token }}` or calling GitHub unauthenticated

#### Scenario: http_token_env is a thin optional name
- **WHEN** root `action.yml` is generated
- **THEN** it MUST include optional `http_token_env` with no default and MUST NOT include `plugin_http` or any `plugin_http_*` input

### Requirement: No flattened plugin option inputs
The system MUST NOT generate Action inputs of the form `plugin_<plugin>_<widget>_<option>` (including `plugin_github_stats_include`, `plugin_github_widgets` CSV, `plugin_github_filename_*`, and `plugin_http_json_url`). Codegen `--check` MUST fail if a generated input matches `plugin_github_stats_include`, `plugin_http_json_url`, or a similar flattened option name.

#### Scenario: Codegen check rejects flattened include
- **WHEN** generated `action.yml` contains an input named `plugin_github_stats_include` or another `plugin_<plugin>_<widget>_<option>` name
- **THEN** `generate-action --check` MUST fail

#### Scenario: Codegen check rejects plugin_http_json_url
- **WHEN** generated `action.yml` contains an input named `plugin_http_json_url`
- **THEN** `generate-action --check` MUST fail

## ADDED Requirements

### Requirement: First-party http plugin pack
The plugin id `http` MUST be a first-party pack with widgets `[json]` and integrations `[http]`. The pack MUST be off unless yaml `plugins.http` is present. The Action MUST NOT expose a `plugin_http` bool input. The Action MUST NOT expose flattened `plugin_http_*` inputs. `plugins.http: {}` MUST parse and MUST enable zero json widgets. Json MUST be on only when `plugins.http.widgets.json` is present. `widgets.json.url` MUST be required when the json widget is present; missing `url` MUST fail parse. There MUST be no yaml pack defaults that auto-enable json.

Example:

```yaml
plugins:
  http:
    widgets:
      json:
        filename: json
        url: https://example.com/api.json
        jmespath: "@"
        timeout_ms: 10000
        animate: false
```

#### Scenario: http pack off unless yaml present
- **WHEN** committed yaml omits `plugins.http`
- **THEN** the http pack MUST be disabled and no json widget MUST run

#### Scenario: empty http plugin is widget-less
- **WHEN** yaml contains `plugins.http: {}`
- **THEN** parse MUST succeed and MUST enable zero json widgets

#### Scenario: missing json url fails parse
- **WHEN** yaml contains `plugins.http.widgets.json` without `url`
- **THEN** parse MUST fail

#### Scenario: no plugin_http Action input
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_http` or any `plugin_http_*` input and MUST still contain `plugin_github`

#### Scenario: http does not join github all-skipped rule
- **WHEN** a json widget fails or is skipped and github widgets are not all skipped
- **THEN** the Action MUST NOT fail the job solely because of the json widget and MUST NOT treat json as a github widget for the all-github-widgets-skipped rule

#### Scenario: http-only non-render fails the job
- **WHEN** json is the only enabled widget, its outcome is non-render, and `allow_skipped` is false
- **THEN** the Action MUST fail the job

### Requirement: Action runtime wires json through the engine port
The Action MUST collect json from yaml `plugins.http.widgets.json` in `enabledWidgets` independently of github widgets. `enabledWidgets` MUST NOT return no widgets solely because `plugins.github.widgets` is absent. `engine.ts` MUST remain a fetch/render port and MUST NOT perform HTTP. `main.ts` or an adapter MUST construct one `createHttpClient({ token })` per run, look up `process.env[http_token_env]` (raw env, not `INPUT_*`), and inject `renderWidget`. Unset or whitespace `http_token_env` MUST yield a client with no `Authorization`. A named env whose value is empty or whitespace MUST fail the json widget (`fail_widget`). `github_token` MUST still be required (`decideActionToken`). This change MUST NOT wire rss `feed` or wakatime `coding` and MUST NOT implement GitHub crawl or GitHub `renderWidget`.

#### Scenario: Action runtime injects json renderWidget
- **WHEN** yaml includes `plugins.http.widgets.json` and the Action entry runs
- **THEN** `enabledWidgets` MUST include json independently of whether github widgets are present, the entry MUST construct one `createHttpClient({ token })` per run from `process.env[http_token_env]` and inject `renderWidget` into the engine port, and `engine.ts` MUST NOT perform HTTP
