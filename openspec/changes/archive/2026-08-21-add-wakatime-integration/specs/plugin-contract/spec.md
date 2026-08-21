## MODIFIED Requirements

### Requirement: First-party github plugin catalog
The first plugin id MUST be `github`. That plugin MUST include widgets `demo`, `stats`, and `languages`. The `github` plugin MUST declare integrations used by those widgets (`static` for `demo`, `github` for `stats` and `languages`). First-party plugin ids MUST be `github` and `wakatime` only. The github v0 widget set MUST remain `demo`, `stats`, and `languages`. The system MUST NOT add first-party plugin ids other than `github` and `wakatime`.

#### Scenario: github plugin widgets
- **WHEN** the `github` plugin is enabled
- **THEN** widgets `demo`, `stats`, and `languages` MUST be available on that pack and first-party plugin ids MUST be `github` and `wakatime` only

### Requirement: Yaml document shape
A valid yaml document MUST accept this github-only default shape, and MAY additionally include optional `plugins.wakatime` as a sibling of `plugins.github` (unknown keys fail parse). Root fields MUST be `version`, `format`, `theme`, `output_pair`, `animated`, `timezone`, `output_dir`, and `plugins`. Default values MUST match:

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

When `plugins.wakatime` is present, its widget tree MUST follow the first-party wakatime plugin pack requirement. The default example document MUST remain github-only. `theme` MUST be `light` or `dark` (default `dark`). `output_pair: true` MUST write `filename` plus `filename-dark` under `output_dir`. `format: apng` MUST use a `.png` extension. Tokens, `user`, `output_action`, `dry_run`, `allow_skipped`, `committer_*`, `output_condition`, and `config` path MUST stay in thin `action.yml`, not in this yaml document.

#### Scenario: Default yaml shape
- **WHEN** a consumer commits the default `.github/profile-bits.yml`
- **THEN** parse MUST succeed with `version: 1`, `format: svg`, `theme: dark`, `output_pair: false`, `animated: false`, `timezone: UTC`, `output_dir: profile-bits`, and github widgets `stats` and `languages` using the default option values above

#### Scenario: output_pair writes paired files
- **WHEN** yaml `output_pair` is true
- **THEN** the Action MUST write both `filename` and `filename-dark` under `output_dir`

#### Scenario: Optional plugins.wakatime sibling
- **WHEN** yaml includes `plugins.wakatime` as a sibling of `plugins.github`
- **THEN** parse MUST succeed and MUST keep the github widget tree; unknown keys MUST still fail parse

### Requirement: Thin root action.yml
Root `action.yml` MUST be thin. Allowed inputs MUST be: `user` (default `github.repository_owner`); `github_token` (API; default `${{ github.token }}` when omitted); `committer_token` (git; default `${{ github.token }}`); `config` (path, default `.github/profile-bits.yml`); `output_action`; `dry_run`; optional `format` / `theme` / `output_pair` / `animated` overrides; optional `plugin_github` bool; optional `wakatime_token` with **no default**; plus `committer_branch`, `committer_gist`, `output_condition` (`always` | `data-changed`), `timezone`, and `allow_skipped` (default false). The Action MUST NOT expose a `plugin_wakatime` bool input. Empty / `""` / whitespace `github_token` MUST be treated as missing (not as omitted default). Breaking a thin input MUST be semver major.

#### Scenario: Omitted token uses github.token
- **WHEN** `github_token` is omitted from the workflow
- **THEN** the Action MUST use `${{ github.token }}` as the API token

#### Scenario: Empty token is not omitted
- **WHEN** `github_token` is provided as empty, `""`, or whitespace
- **THEN** the Action MUST treat the token as missing and MUST fail the job rather than substituting `${{ github.token }}` or calling GitHub unauthenticated

#### Scenario: wakatime_token is thin with no default
- **WHEN** root `action.yml` is generated
- **THEN** it MUST contain optional `wakatime_token` with no `default:` key and MUST NOT contain `plugin_wakatime`

### Requirement: No flattened plugin option inputs
The system MUST NOT generate Action inputs of the form `plugin_<plugin>_<widget>_<option>` (including `plugin_github_stats_include`, `plugin_github_widgets` CSV, `plugin_github_filename_*`, and `plugin_wakatime_coding_*`). Codegen `--check` MUST fail if a generated input matches `plugin_github_stats_include`, `plugin_wakatime_coding_range`, or a similar flattened option name.

#### Scenario: Codegen check rejects flattened include
- **WHEN** generated `action.yml` contains an input named `plugin_github_stats_include` or another `plugin_<plugin>_<widget>_<option>` name
- **THEN** `generate-action --check` MUST fail

#### Scenario: Codegen check rejects plugin_wakatime_coding_range
- **WHEN** generated `action.yml` contains an input named `plugin_wakatime_coding_range` or another `plugin_wakatime_coding_*` name
- **THEN** `generate-action --check` MUST fail

## ADDED Requirements

### Requirement: First-party wakatime plugin pack
The plugin id `wakatime` MUST be a first-party pack with widgets `[coding]` and integrations `[wakatime]`. The pack MUST be off unless yaml `plugins.wakatime` is present. The Action MUST NOT expose a `plugin_wakatime` bool input. The Action MUST NOT expose flattened `plugin_wakatime_coding_*` inputs. Empty `plugins.wakatime: {}` MUST enable the default widget list `[coding]`. Default coding options MUST be `filename: wakatime`, `range: last_7_days`, `include: [languages, editors]`, `limit: 8` (range 1–16), `api_domain: wakatime.com`, `animate: false`.

Example:

```yaml
plugins:
  wakatime:
    widgets:
      coding:
        filename: wakatime
        range: last_7_days
        include: [languages, editors]
        limit: 8
        api_domain: wakatime.com
        animate: false
```

#### Scenario: wakatime pack off unless yaml present
- **WHEN** committed yaml omits `plugins.wakatime`
- **THEN** the wakatime pack MUST be disabled and no coding widget MUST run

#### Scenario: empty wakatime plugin enables coding defaults
- **WHEN** yaml contains `plugins.wakatime: {}`
- **THEN** parse MUST succeed and MUST enable widget `coding` with the default option values

#### Scenario: no plugin_wakatime Action input
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_wakatime` or any `plugin_wakatime_coding_*` input, MUST contain optional `wakatime_token` with no default, and MUST still contain `plugin_github`

#### Scenario: wakatime does not join github all-skipped rule
- **WHEN** a wakatime coding widget fails or is skipped and github widgets are not all skipped
- **THEN** the Action MUST NOT fail the job solely because of the wakatime widget and MUST NOT treat wakatime as a github widget for the all-github-widgets-skipped rule
