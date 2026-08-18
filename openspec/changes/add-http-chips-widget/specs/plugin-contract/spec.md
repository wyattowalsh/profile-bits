## MODIFIED Requirements

### Requirement: No flattened plugin option inputs
The system MUST NOT generate Action inputs of the form `plugin_<plugin>_<widget>_<option>` (including `plugin_github_stats_include`, `plugin_github_widgets` CSV, `plugin_github_filename_*`, `plugin_http_json_url`, and `plugin_http_chips_preset`). Codegen `--check` MUST fail if a generated input matches `plugin_github_stats_include`, `plugin_http_json_url`, `plugin_http_chips_preset`, or a similar flattened option name. The Action MUST NOT expose a `plugin_http` bool input.

#### Scenario: Codegen check rejects flattened include
- **WHEN** generated `action.yml` contains an input named `plugin_github_stats_include` or another `plugin_<plugin>_<widget>_<option>` name
- **THEN** `generate-action --check` MUST fail

#### Scenario: Codegen check rejects plugin_http_chips_preset
- **WHEN** generated `action.yml` contains an input named `plugin_http_chips_preset`
- **THEN** `generate-action --check` MUST fail

#### Scenario: Codegen check rejects plugin_http_json_url
- **WHEN** generated `action.yml` contains an input named `plugin_http_json_url`
- **THEN** `generate-action --check` MUST fail

## ADDED Requirements

### Requirement: Http pack widgets are json and chips
The plugin id `http` MUST remain a first-party pack with widgets `[json, chips]` and integrations `[http]`. This change MUST add widget id `chips` and MUST NOT add a new plugin id or a new integration id. Widget `json` MUST remain. First-party plugin ids MUST stay `github`, `wakatime`, `rss`, and `http`. The pack MUST be off unless yaml `plugins.http` is present. The Action MUST NOT expose a `plugin_http` bool input. The Action MUST NOT expose flattened `plugin_http_*` inputs. `plugins.http: {}` MUST parse and MUST enable zero widgets. Json MUST be on only when `plugins.http.widgets.json` is present. Chips MUST be on only when `plugins.http.widgets.chips` is present. Yaml MUST NOT accept a `bits` key. Yaml MUST NOT accept `url` or `headers` on `widgets.chips`. There MUST be no yaml pack defaults that auto-enable json or chips.

Example:

```yaml
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
      chips:
        filename: chips
        preset: shieldcn
        types: [npm, stars, ci]
        package: react
        repo: vercel/next.js
        workflow: ci.yml
```

#### Scenario: http pack off unless yaml present
- **WHEN** committed yaml omits `plugins.http`
- **THEN** the http pack MUST be disabled and neither json nor chips MUST run

#### Scenario: empty http plugin is widget-less
- **WHEN** yaml contains `plugins.http: {}`
- **THEN** parse MUST succeed and MUST enable zero json widgets and zero chips widgets

#### Scenario: json remains beside chips
- **WHEN** yaml includes both `plugins.http.widgets.json` with a valid https `url` and `plugins.http.widgets.chips` with a valid preset and types list
- **THEN** parse MUST succeed and MUST enable both widgets

#### Scenario: chips on only when widgets.chips is present
- **WHEN** yaml includes `plugins.http.widgets.json` and omits `widgets.chips`
- **THEN** parse MUST succeed and MUST enable json and MUST NOT enable chips

#### Scenario: no plugin_http Action input
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_http` or any `plugin_http_*` input and MUST still contain `plugin_github`

#### Scenario: yaml bits key fails parse
- **WHEN** yaml contains a `bits` key under `plugins.http` or `plugins.http.widgets.chips`
- **THEN** parse MUST fail

#### Scenario: chips url or headers fail parse
- **WHEN** yaml `plugins.http.widgets.chips` includes `url` or `headers`
- **THEN** parse MUST fail

### Requirement: Action engine enumerates json and chips without failing mixed github runs
The Action MUST collect json from yaml `plugins.http.widgets.json` and chips from yaml `plugins.http.widgets.chips` in `enabledWidgets` independently of github widgets. `enabledWidgets` MUST NOT return no widgets solely because `plugins.github.widgets` is absent. Http widgets (`json`, `chips`) MUST skip `include_private` preflight and MUST preflight as `render`. After the widget loop, github `fail_widget` MUST keep the current throw. Http-only runs MUST use `decideHttpOnlyRunFailed`: when every enabled widget uses integration `http`, none rendered, and `allow_skipped` is false, the Action MUST fail the job. Mixed github-render plus http `fail_widget` MUST NOT throw. Json or chips `fail_widget` MUST NOT join `decideAllGithubWidgetsSkipped`. `usesHttpIntegration` MUST be true for `chips` because `WIDGET_INTEGRATIONS.chips` is `["http"]`. This change MUST NOT edit Action entry `main.ts` to inject `renderWidget`. Engine tests MUST use an injected `renderWidget` and MUST NOT perform live network.

#### Scenario: enabledWidgets includes json and chips independently of github
- **WHEN** yaml includes `plugins.http.widgets.json` and/or `plugins.http.widgets.chips` and omits github widgets
- **THEN** `enabledWidgets` MUST include those http widgets and MUST NOT return an empty list solely because github is absent

#### Scenario: http widgets skip include_private preflight
- **WHEN** json or chips is enabled
- **THEN** preflight MUST be `render` and MUST NOT read `include_private`

#### Scenario: mixed github render and http fail_widget does not throw
- **WHEN** a github widget outcome is `render` and json or chips outcome is `fail_widget`
- **THEN** the Action MUST still write successful github blobs and MUST NOT throw because of the http widget

#### Scenario: http-only non-render fails the job
- **WHEN** every enabled widget uses integration `http`, none rendered, and `allow_skipped` is false
- **THEN** the Action MUST fail the job

#### Scenario: chips does not join github all-skipped
- **WHEN** a chips widget fails or is skipped and github widgets are not all skipped
- **THEN** the Action MUST NOT fail the job solely because of the chips widget and MUST NOT treat chips as a github widget for the all-github-widgets-skipped rule

#### Scenario: usesHttpIntegration is true for chips
- **WHEN** the widget id is `chips`
- **THEN** `usesHttpIntegration` MUST be true and MUST remain false for github, rss, and wakatime widgets
