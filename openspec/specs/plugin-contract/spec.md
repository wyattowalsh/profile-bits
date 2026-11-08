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

The first plugin id MUST be `github`. That plugin MUST include widgets `demo`, `stats`, `languages`, opt-in `repo`, opt-in `top-repos`, and opt-in `contributions`. The `github` plugin MUST declare integration `static` for `demo` and integration `github` for `stats`, `languages`, `repo`, `top-repos`, and `contributions`. First-party plugin ids MUST be `github`, `wakatime`, `rss`, `http`, `spotify`, `leetcode`, `chess`, and `steam`. The github v0 widget set MUST remain `demo`, `stats`, and `languages`. Widgets `repo`, `top-repos`, and `contributions` MUST be additive on pack `github` and MUST NOT be new plugin ids. The system MUST NOT describe the catalog as `github` and `rss` only.

#### Scenario: github plugin widgets
- **WHEN** the `github` plugin is enabled
- **THEN** widgets `demo`, `stats`, `languages`, `repo`, `top-repos`, and `contributions` MUST be available on that pack, github v0 widgets MUST remain `demo`, `stats`, and `languages`, reuse widgets MUST NOT be new plugin ids, and first-party plugin ids MUST be `github`, `wakatime`, `rss`, `http`, `spotify`, `leetcode`, `chess`, and `steam`

#### Scenario: repo is not a fifth pack
- **WHEN** widget `repo` is registered
- **THEN** the plugin id MUST remain `github` and first-party plugin ids MUST include `github`, `wakatime`, `rss`, `http`, `spotify`, `leetcode`, `chess`, and `steam`

### Requirement: Default widget list when plugin is on

When the `github` plugin is on and no widget list is specified, the system MUST enable `stats` and `languages`. Widget `demo` MUST be opt-in (playground smoke / explicit yaml), not part of pack defaults. Widgets `repo`, `top-repos`, and `contributions` MUST be opt-in like `demo` and MUST NOT become pack defaults.

#### Scenario: Pack defaults omit demo
- **WHEN** the github plugin is enabled with no widget list
- **THEN** the enabled widgets MUST be `stats` and `languages` and `demo` MUST remain disabled until explicitly enabled

#### Scenario: Pack defaults omit repo
- **WHEN** the github plugin is enabled with no widget list
- **THEN** the enabled widgets MUST be `stats` and `languages` and `repo` MUST remain disabled until explicitly enabled

#### Scenario: plugin_github true without yaml does not enable repo
- **WHEN** the config file is absent and `plugin_github` is true
- **THEN** the Action MUST enable github pack defaults `stats` and `languages` and MUST NOT enable `repo`

#### Scenario: Pack defaults omit github reuse widgets
- **WHEN** the github plugin is enabled with no widget list
- **THEN** `top-repos` and `contributions` MUST remain disabled until explicitly enabled

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

#### Scenario: latest is opt-in
- **WHEN** yaml enables `plugins.rss` with `widgets.feed.url` and omits `widgets.latest`
- **THEN** pack defaults MUST still enable `feed` only and MUST NOT require `latest`

#### Scenario: rss widgets include latest
- **WHEN** `rssPlugin` is read
- **THEN** `widgets` MUST be `[feed, latest]`, `integrations` MUST be `[rss]`, and `defaults.widgets` MUST be `[feed]`

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
The plugin id `http` MUST remain a first-party pack with widgets `[json, chips]` and integrations `[http]`. This change MUST add widget id `chips` and MUST NOT add a new plugin id or a new integration id. Widget `json` MUST remain. First-party plugin ids MUST include `github`, `wakatime`, `rss`, and `http`. The pack MUST be off unless yaml `plugins.http` is present. The Action MUST NOT expose a `plugin_http` bool input. The Action MUST NOT expose flattened `plugin_http_*` inputs. `plugins.http: {}` MUST parse and MUST enable zero widgets. Json MUST be on only when `plugins.http.widgets.json` is present. Chips MUST be on only when `plugins.http.widgets.chips` is present. Yaml MUST NOT accept a `bits` key. Yaml MUST NOT accept `url` or `headers` on `widgets.chips`. There MUST be no yaml pack defaults that auto-enable json or chips.

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

### Requirement: Yaml token_env is an environment variable name
Yaml `plugins.http` MAY include optional `token_env` (http pattern). `token_env` MUST be a process environment variable **name**, not a token value. The name MUST match `TokenEnvSchema` (trimmed POSIX-ish `[A-Za-z_][A-Za-z0-9_]*`, not `INPUT_*`). Omitting `token_env` MUST parse. Present `token_env` that is empty, whitespace-only, `INPUT_*`, or not an env name MUST fail parse. Yaml keys `token`, `api_key`, and other secret values under `plugins.http` MUST fail parse (`additionalProperties: false`). Action `http_token_env` remains the thin Action env-name input. This change MUST NOT add first-party pack ids.

#### Scenario: Optional plugins.http.token_env parses
- **WHEN** yaml includes `plugins.http.token_env` set to `HTTP_JSON_TOKEN`
- **THEN** parse MUST succeed and MUST treat the value as an environment variable name

#### Scenario: Omitted token_env still parses
- **WHEN** yaml includes `plugins.http: {}` or `plugins.http` with widgets and omits `token_env`
- **THEN** parse MUST succeed

#### Scenario: Token values in yaml fail
- **WHEN** yaml `plugins.http` includes `token`, `api_key`, or `token_env: "Bearer secret"`
- **THEN** parse MUST fail

### Requirement: Thin required-auth Action tokens
Root `action.yml` MUST include optional `spotify_token` and `steam_token` with **no default** (wakatime_token pattern) in addition to optional `wakatime_token` and `http_token_env`. The Action MUST NOT expose `plugin_spotify`, `plugin_steam`, `plugin_wakatime`, `plugin_rss`, or `plugin_http` bools. `plugin_github` remains the only pack bool. Skills MUST read live `ActionInputsSchema` and MUST NOT invent thin names or flattened `plugin_<plugin>_<widget>_<option>` inputs.

#### Scenario: spotify_token and steam_token are thin with no default
- **WHEN** root `action.yml` is generated
- **THEN** it MUST contain optional `spotify_token` and `steam_token` with no `default:` key and MUST NOT contain `plugin_spotify` or `plugin_steam`

#### Scenario: No extra pack bools
- **WHEN** `ActionInputsSchema` is validated
- **THEN** it MUST NOT include `plugin_wakatime`, `plugin_rss`, `plugin_http`, `plugin_spotify`, or `plugin_steam`

### Requirement: First-party elbow plugin packs
First-party plugin ids MUST include `spotify`, `leetcode`, `chess`, and `steam` in addition to `github`, `wakatime`, `rss`, and `http`. Chess MUST be one pack with integrations `chesscom` and `lichess` (no integration id `chess`). Pack agents MUST complete these existing catalog ids and MUST NOT append `FIRST_PARTY_PLUGIN_IDS`. The Action MUST NOT expose `plugin_spotify`, `plugin_leetcode`, `plugin_chess`, or `plugin_steam` bools. The system MUST NOT add `plugin_<plugin>_<widget>_<option>` inputs.

#### Scenario: Elbow packs are first-party ids
- **WHEN** live `FIRST_PARTY_PLUGIN_IDS` is read
- **THEN** it MUST contain `github`, `wakatime`, `rss`, `http`, `spotify`, `leetcode`, `chess`, and `steam` in that relative membership

#### Scenario: Chess is one pack two integrations
- **WHEN** pack `chess` is registered
- **THEN** its integrations MUST be `chesscom` and `lichess` and MUST NOT include an integration id `chess`

#### Scenario: No extra pack bools or flatten
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_spotify`, `plugin_leetcode`, `plugin_chess`, `plugin_steam`, or any `plugin_<plugin>_<widget>_<option>` input

### Requirement: Yaml may include optional elbow pack siblings
A valid yaml document MAY include optional `plugins.spotify`, `plugins.leetcode`, `plugins.chess`, and `plugins.steam` as siblings of `plugins.github` (unknown keys still fail parse). Default committed yaml MUST remain github-only. Spotify and steam yaml MAY include optional `token_env` (http pattern: env **name**, not a token value, not `INPUT_*`). Yaml MUST NOT store refresh tokens, Steam keys, client secrets, or `plugin_*_*_*` keys.

#### Scenario: Optional elbow plugin siblings parse
- **WHEN** yaml includes `plugins.spotify`, `plugins.leetcode`, `plugins.chess`, or `plugins.steam` as a sibling of `plugins.github`
- **THEN** parse MUST succeed when those objects match their option schemas and MUST keep the github widget tree

#### Scenario: Default yaml stays github-only
- **WHEN** a consumer commits the default `.github/profile-bits.yml`
- **THEN** parse MUST succeed without requiring elbow packs

#### Scenario: token_env is an env name
- **WHEN** yaml `plugins.spotify.token_env` or `plugins.steam.token_env` is set
- **THEN** the value MUST be a process environment variable name and MUST NOT be a token value or `INPUT_*`

### Requirement: Spotify pack owns now-playing and top
Pack id `spotify` MUST already exist in live `FIRST_PARTY_PLUGIN_IDS`. The pack MUST declare widgets `now-playing` and `top` and integration `spotify` only. Pack defaults when the pack is on with no widget list MUST be `now-playing` (opt-in `top`). `demo` MUST NOT be a Spotify default. Pack-level `SPOTIFY_BITS_USED` MUST include `Image` when cover art is rendered. The Action MUST NOT expose a `plugin_spotify` bool. The system MUST NOT add `plugin_<plugin>_<widget>_<option>` inputs. Pack agents MUST NOT edit `packages/core/src/types.ts`.

#### Scenario: Pack registry
- **WHEN** `spotifyPlugin` is read
- **THEN** `id` MUST be `spotify`, `widgets` MUST include `now-playing` and `top`, `integrations` MUST equal `["spotify"]`, and `defaults.widgets` MUST be `["now-playing"]`

#### Scenario: No extra pack bool
- **WHEN** the Spotify pack is registered
- **THEN** root `action.yml` MUST NOT gain `plugin_spotify` or flattened widget option inputs

### Requirement: Spotify yaml stays token_env plus widget options
A valid yaml document MAY include optional `plugins.spotify` with optional `token_env` (http pattern) and optional widgets `now-playing` / `top` (`filename`, `animate`; `top` also `limit`). Yaml MUST NOT store refresh tokens, client id, client secret, or `plugin_*_*_*` keys. Default committed yaml MUST remain github-only.

#### Scenario: token_env is an env name
- **WHEN** yaml sets `plugins.spotify.token_env`
- **THEN** the value MUST be a process env name, MUST NOT be `INPUT_*`, and MUST NOT be a token value

#### Scenario: Unknown flatten keys fail parse
- **WHEN** yaml includes `plugin_spotify_now_playing_filename` or `plugins.spotify.client_id`
- **THEN** parse MUST fail

### Requirement: LeetCode pack binds integration leetcode only
Pack `leetcode` MUST declare integration `leetcode` only. That plugin MUST include widgets `solved` and opt-in `heatmap`. When the pack is on and no widget list is specified, the system MUST enable `solved` and MUST NOT enable `heatmap` until explicitly enabled. The Action MUST NOT expose a `plugin_leetcode` bool. The system MUST NOT add `plugin_<plugin>_<widget>_<option>` inputs. Pack agents MUST complete the existing catalog id and MUST NOT append `FIRST_PARTY_PLUGIN_IDS`. Pack agents MUST NOT edit `packages/core/src/types.ts`.

#### Scenario: Pack default is solved
- **WHEN** the leetcode plugin is enabled with no widget list
- **THEN** the enabled widgets MUST be `solved` and `heatmap` MUST remain disabled until explicitly enabled

#### Scenario: Heatmap is opt-in
- **WHEN** yaml enables `plugins.leetcode.widgets.heatmap`
- **THEN** widget `heatmap` MUST be available on pack `leetcode` and MUST NOT become a pack default

#### Scenario: No extra pack bool or flatten
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_leetcode` or any `plugin_<plugin>_<widget>_<option>` input

#### Scenario: Pack agents do not mint ids
- **WHEN** a pack agent authors `leetcode`
- **THEN** it MUST complete the existing catalog id, MUST NOT append `FIRST_PARTY_PLUGIN_IDS`, and MUST NOT edit `packages/core/src/types.ts`

### Requirement: chess is one pack with chesscom and lichess
Plugin id `chess` MUST be one pack. Its widgets MUST be `ratings` and
`game`. Its integrations MUST be the derived union `chesscom` and `lichess`
and MUST NOT include an integration id `chess`. Pack defaults when the pack
is on with no widget list MUST be `ratings` only (`game` opt-in). Pack-level
`bitsUsed` MUST include `Stat` (ratings) and `Board` (game) in addition to
layout bits. Pack agents MUST complete these existing catalog ids and MUST
NOT append `FIRST_PARTY_PLUGIN_IDS` and MUST NOT edit
`packages/core/src/types.ts`. The Action MUST NOT expose `plugin_chess`,
flattened `plugin_*_*_*` inputs, or `plugin_<plugin>_<widget>_<option>`
inputs. `docsPath` MUST NOT be hardcoded
as `/generate/chess/`.

#### Scenario: chess pack identity
- **WHEN** pack `chess` is registered
- **THEN** widgets MUST be `ratings` and `game`, integrations MUST be
  `chesscom` and `lichess`, and defaults MUST be `ratings`

#### Scenario: chess does not flatten Action inputs
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_chess` or any
  `plugin_chess_<widget>_<option>` input

### Requirement: chess yaml user prefers chess.com then lichess
A valid yaml document MAY include optional `plugins.chess` with optional
`user` and widgets `ratings` / `game`. When only `user` is set, load MUST
try integration `chesscom` first and MUST fall back to `lichess` only on
HTTP 404. 403, 429, and 5xx MUST NOT fall back. Missing/blank `user` MUST
`fail_widget` without HTTP. Default committed yaml MUST remain github-only.
`POST /api/preview` remains layout preview, not a public embed API.

#### Scenario: unknown chess.com user falls back to lichess
- **WHEN** yaml `plugins.chess.user` is set and chess.com returns 404
- **THEN** the pack MUST load the lichess dump for that user

#### Scenario: chess.com rate limit does not fall back
- **WHEN** chess.com returns 429
- **THEN** the pack MUST NOT call lichess as a substitute

#### Scenario: blank user does not HTTP
- **WHEN** yaml chess `user` is missing, `""`, or whitespace
- **THEN** load MUST fail the widget and MUST NOT send HTTP

### Requirement: steam pack yaml uses token_env and thin steam_token
First-party plugin `steam` MUST declare widgets `player` and `recent`
and integration `steam`. When the pack is on with no widget list, the
system MUST enable `player` only; `recent` MUST be opt-in like github
`repo`. Yaml MAY include optional `plugins.steam` as a sibling of
`plugins.github`. That object MAY include optional `token_env` (http
pattern: process env **name**, not a token value, not `INPUT_*`) and
optional `user` (Steam vanity or steamid64). Yaml MUST NOT store Steam
Web API keys. Thin Action input `steam_token` MUST remain optional with
**no default**. The Action MUST NOT expose a `plugin_steam` bool. The
system MUST NOT add `plugin_<plugin>_<widget>_<option>` inputs. Default
committed yaml MUST remain github-only. Pack agents MUST complete this
existing catalog id and MUST NOT append `FIRST_PARTY_PLUGIN_IDS` or edit
`packages/core/src/types.ts`.

#### Scenario: steam pack default is player
- **WHEN** the steam plugin is enabled with no widget list
- **THEN** the enabled widgets MUST be `player` and `recent` MUST remain
  disabled until explicitly enabled

#### Scenario: token_env is an env name
- **WHEN** yaml `plugins.steam.token_env` is set
- **THEN** the value MUST be a process environment variable name and
  MUST NOT be a token value or `INPUT_*`

#### Scenario: yaml must not store the steam key
- **WHEN** a consumer commits `.github/profile-bits.yml` with
  `plugins.steam`
- **THEN** parse MUST succeed without a Web API key in yaml and MUST
  reject unknown flatten keys

#### Scenario: no plugin_steam bool or flatten
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_steam` or any
  `plugin_<plugin>_<widget>_<option>` input

#### Scenario: steam_token has no default
- **WHEN** Action input `steam_token` is read
- **THEN** it MUST be optional with no default and pack-off MUST NOT
  require it
