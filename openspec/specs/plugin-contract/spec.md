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
A valid yaml document MUST accept this github-only default shape, and MAY additionally include optional `plugins.wakatime`, optional `plugins.rss`, and optional `plugins.http` as siblings of `plugins.github` (unknown keys fail parse). The document MUST NOT forbid other optional plugin siblings (`wakatime`). Root fields MUST be `version`, `format`, `theme`, `output_pair`, `animated`, `timezone`, `output_dir`, and `plugins`. Default values MUST match:

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

When `plugins.wakatime` is present, its widget tree MUST follow the first-party wakatime plugin pack requirement. When `plugins.rss` is present, its widget tree MUST follow the first-party rss plugin pack requirement. When `plugins.http` is present, its widget tree MUST follow the first-party http plugin pack requirement. The default example document MUST remain github-only. `theme` MUST be a named catalog id string **or** a custom object `theme: { custom: { bg, card, text, muted, accent, border, pair? } }` (default named id `dark`). Named ids MUST be one of the 47 catalog ids defined by `theme-catalog`. Custom role values MUST be color refs `{flavorId}.{swatchId}` | `{flavorId}.{role}` | hex `#RGB` / `#RRGGBB` / `#RRGGBBAA`. `pair` MUST be a named catalog id **or** a second 7-role map (the opposite polarity file). Theme MUST remain a run-global root field (not under `plugins.*`). When `output_pair` is true, the Action MUST write polarity files under `output_dir`: `{filename}` MUST be the light member of the pair and `{filename}-dark` MUST be the dark member of the pair. `theme` selects the family and which dark/light flavor when a family has several. When `output_pair` is false, the Action MUST write `{filename}` only in the selected flavor (even if that flavor is dark). `format: apng` MUST use a `.png` extension. Tokens, `user`, `output_action`, `dry_run`, `allow_skipped`, `committer_*`, `output_condition`, and `config` path MUST stay in thin `action.yml`, not in this yaml document.

#### Scenario: Default yaml shape
- **WHEN** a consumer commits the default `.github/profile-bits.yml`
- **THEN** parse MUST succeed with `version: 1`, `format: svg`, `theme: dark`, `output_pair: false`, `animated: false`, `timezone: UTC`, `output_dir: profile-bits`, and github widgets `stats` and `languages` using the default option values above

#### Scenario: output_pair writes paired files
- **WHEN** yaml `output_pair` is true
- **THEN** the Action MUST write both `filename` and `filename-dark` under `output_dir`

#### Scenario: output_pair polarity files
- **WHEN** yaml `output_pair` is true and `theme` is `catppuccin-mocha`
- **THEN** the Action MUST write the light pair member (`catppuccin-latte`) as `{filename}` and the dark member (`catppuccin-mocha`) as `{filename}-dark`

#### Scenario: output_pair false writes selected flavor only
- **WHEN** yaml `output_pair` is false and `theme` is a dark named id
- **THEN** the Action MUST write `{filename}` only in that selected flavor and MUST NOT write `{filename}-dark`

#### Scenario: Named theme id parses
- **WHEN** yaml `theme` is `catppuccin-mocha`
- **THEN** parse MUST succeed and MUST treat the run theme as that named id

#### Scenario: Custom theme object parses
- **WHEN** yaml `theme` is `{ custom: { bg, card, text, muted, accent, border } }` with valid color refs
- **THEN** parse MUST succeed

#### Scenario: Optional plugins.wakatime sibling
- **WHEN** yaml includes `plugins.wakatime` as a sibling of `plugins.github`
- **THEN** parse MUST succeed and MUST keep the github widget tree; unknown keys MUST still fail parse

#### Scenario: Optional plugins.rss sibling
- **WHEN** yaml includes `plugins.rss` as a sibling of `plugins.github` with a valid `widgets.feed.url`
- **THEN** parse MUST succeed and MUST keep the github widget tree; unknown keys MUST still fail parse

#### Scenario: Optional plugins.http sibling
- **WHEN** yaml includes `plugins.http` as a sibling of `plugins.github` with a valid `widgets.json.url`
- **THEN** parse MUST succeed and MUST keep the github widget tree; unknown keys MUST still fail parse

### Requirement: Thin root action.yml
Root `action.yml` MUST be thin. Allowed inputs MUST be: `user` (default `github.repository_owner`); `github_token` (API; default `${{ github.token }}` when omitted); `committer_token` (git; default `${{ github.token }}`); `config` (path, default `.github/profile-bits.yml`); `output_action`; `dry_run`; optional `format` / `theme` / `output_pair` / `animated` overrides; optional `plugin_github` bool; optional `wakatime_token` with **no default**; optional `http_token_env` (env **name**, default unset); plus `committer_branch`, `committer_gist`, `output_condition` (`always` | `data-changed`), `timezone`, and `allow_skipped` (default false). The Action MUST NOT expose a `plugin_wakatime` bool input. Empty / `""` / whitespace `github_token` MUST be treated as missing (not as omitted default). Breaking a thin input MUST be semver major.

#### Scenario: Omitted token uses github.token
- **WHEN** `github_token` is omitted from the workflow
- **THEN** the Action MUST use `${{ github.token }}` as the API token

#### Scenario: Empty token is not omitted
- **WHEN** `github_token` is provided as empty, `""`, or whitespace
- **THEN** the Action MUST treat the token as missing and MUST fail the job rather than substituting `${{ github.token }}` or calling GitHub unauthenticated

#### Scenario: wakatime_token is thin with no default
- **WHEN** root `action.yml` is generated
- **THEN** it MUST contain optional `wakatime_token` with no `default:` key and MUST NOT contain `plugin_wakatime`

#### Scenario: http_token_env is a thin optional name
- **WHEN** root `action.yml` is generated
- **THEN** it MUST include optional `http_token_env` with no default and MUST NOT include `plugin_http` or any `plugin_http_*` input

### Requirement: No flattened plugin option inputs
The system MUST NOT generate Action inputs of the form `plugin_<plugin>_<widget>_<option>` (including `plugin_github_stats_include`, `plugin_github_widgets` CSV, `plugin_github_filename_*`, `plugin_wakatime_coding_*`, `plugin_rss_feed_url`, `plugin_http_json_url`, and `plugin_http_chips_preset`). Codegen `--check` MUST fail if a generated input matches `plugin_github_stats_include`, `plugin_wakatime_coding_range`, `plugin_rss_feed_url`, `plugin_http_json_url`, `plugin_http_chips_preset`, or a similar flattened option name. The Action MUST NOT expose a `plugin_http` bool input.

#### Scenario: Codegen check rejects flattened include
- **WHEN** generated `action.yml` contains an input named `plugin_github_stats_include` or another `plugin_<plugin>_<widget>_<option>` name
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
The Action MUST collect json from yaml `plugins.http.widgets.json` and chips from yaml `plugins.http.widgets.chips` in `enabledWidgets` independently of github widgets. `enabledWidgets` MUST NOT return no widgets solely because `plugins.github.widgets` is absent. Http widgets (`json`, `chips`) MUST skip `include_private` preflight and MUST preflight as `render`. After the widget loop, github `fail_widget` MUST keep the current throw. Http-only runs MUST use `decideHttpOnlyRunFailed`: when every enabled widget uses integration `http`, none rendered, and `allow_skipped` is false, the Action MUST fail the job. Mixed github-render plus http `fail_widget` MUST NOT throw. Json or chips `fail_widget` MUST NOT join `decideAllGithubWidgetsSkipped`. `usesHttpIntegration` MUST be true for `chips` because `WIDGET_INTEGRATIONS.chips` is `["http"]`. `engine.ts` MUST remain a fetch/render port and MUST NOT perform HTTP. The Action MUST construct one `createHttpClient({ token })` per run from `process.env[http_token_env]` (raw env, not `INPUT_*`). Unset or whitespace `http_token_env` MUST yield a client with no `Authorization`. A named env whose value is empty or whitespace MUST fail the json widget (`fail_widget`). `github_token` MUST still be required (`decideActionToken`). This change MUST NOT edit Action entry `main.ts` to inject `renderWidget`. Engine tests MUST use an injected `renderWidget` and MUST NOT perform live network.

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

#### Scenario: Action constructs one http client from http_token_env
- **WHEN** the Action runs with optional `http_token_env`
- **THEN** it MUST construct one `createHttpClient({ token })` per run from `process.env[http_token_env]` (raw env, not `INPUT_*`); unset or whitespace `http_token_env` MUST yield a client with no `Authorization`; a named env whose value is empty or whitespace MUST fail the json widget (`fail_widget`); `engine.ts` MUST NOT perform HTTP; and `github_token` MUST still be required

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

### Requirement: Action constructs one shared wakatime client when the pack is on
When yaml `plugins.wakatime` is present, the Action MUST construct exactly one shared wakatime client per run and MUST pass that instance to every coding render in that run. The Action MUST NOT construct a wakatime client when the pack is absent. Pack on plus missing / `""` / whitespace `wakatime_token` MUST fail the job (`fail_job`) in the engine **before** `renderWidget` runs. Pack absent MUST NOT require `wakatime_token` and MUST NOT fail the job for a missing WakaTime token. `loadConfig` MUST NOT fail the job solely because the token is missing. Error messages MUST NOT include the token value. The Action MUST NEVER log the token.

GitHub widgets in the same run MUST use the existing github client (`createGithubClient` / `loadPayload`). The Action MUST construct at most one github client per run, and MUST construct it only when at least one github widget (`demo`, `stats`, or `languages`) is enabled. The Action MUST NOT edit the github integration module to satisfy this requirement.

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
- **THEN** the Action MUST use the existing github client for demo/stats/languages and MUST NOT construct a wakatime client for those widgets

### Requirement: Action enabledWidgets includes coding without adding further pack ids
The Action engine's enabled widget list MUST include `{ id: "coding" }` when yaml `plugins.wakatime` enables widget `coding` (including empty `plugins.wakatime: {}`). Default committed yaml remains github-only and MUST still run github widgets without a WakaTime token. WakaTime-only yaml (`plugins.wakatime: {}` with github omitted) MUST run coding without treating the run as “every github widget skipped”. Coding outcomes MUST NOT join `decideAllGithubWidgetsSkipped`. `enabledWidgets` MUST keep the existing first-party widget ids `demo`, `stats`, `languages`, `coding`, `feed`, `json`, and `chips`. This requirement MUST NOT drop rss or http widgets.

`preflightWidget` MUST NOT apply `include_private` to coding. Coding that is enabled MUST preflight as `render` (auth already gated by pack-on token policy).

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
- **THEN** widget ids MUST be drawn from `demo`, `stats`, `languages`, `coding`, `feed`, `json`, and `chips`

### Requirement: Unknown theme ids and custom refs fail parse
Unknown named theme ids MUST fail parse. Custom theme parse MUST fail when any color ref’s flavor, swatch, or role is unknown, when hex is malformed, when a required role (`bg`, `card`, `text`, `muted`, `accent`, `border`) is missing, or when `output_pair` is true with a custom theme and `pair` is absent. Parse MUST NOT silently fall back to `dark`. Unknown yaml keys MUST still fail parse. This schema widening MUST NOT add further first-party plugin ids or flattened color inputs.

#### Scenario: Unknown named id fails parse
- **WHEN** yaml `theme` is `radical` or another id not in the 47-id catalog
- **THEN** parse MUST fail the job and MUST NOT fall back to `dark`

#### Scenario: Unknown custom ref fails parse
- **WHEN** a custom role ref uses an unknown flavor, swatch, or role
- **THEN** parse MUST fail the job

#### Scenario: Custom missing role fails parse
- **WHEN** yaml `theme.custom` omits `bg`, `card`, `text`, `muted`, `accent`, or `border`
- **THEN** parse MUST fail the job

#### Scenario: Custom plus output_pair without pair fails parse
- **WHEN** yaml `output_pair` is true and `theme.custom` has no `pair`
- **THEN** parse MUST fail the job

### Requirement: Thin Action theme override is named id only
The thin Action `theme` input MUST accept a named catalog id string only. The Action MUST reject `theme: custom` and MUST NOT accept a custom object as an Action input. When yaml uses a custom object and the Action `theme` input is a named id, the Action named id MUST win. The Action MUST NOT add flattened `plugin_<plugin>_<widget>_<color>` inputs or other color Marketplace inputs. Codegen `--check` MUST fail if a generated input matches a flattened color name.

#### Scenario: Action theme named id overrides yaml
- **WHEN** yaml `theme` is a custom object and the Action `theme` input is `nord`
- **THEN** the run MUST use `nord`

#### Scenario: Action theme custom fails
- **WHEN** the Action `theme` input is `custom`
- **THEN** the Action MUST fail and MUST NOT treat that input as a custom mix

#### Scenario: Flattened color inputs are rejected
- **WHEN** generated `action.yml` contains `plugin_github_stats_bg` or another `plugin_<plugin>_<widget>_<color>` name
- **THEN** `generate-action --check` MUST fail

