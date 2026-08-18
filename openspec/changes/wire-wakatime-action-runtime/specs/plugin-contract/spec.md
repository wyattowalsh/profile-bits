## ADDED Requirements

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
The Action engine's enabled widget list MUST include `{ id: "coding" }` when yaml `plugins.wakatime` enables widget `coding` (including empty `plugins.wakatime: {}`). Default committed yaml remains github-only and MUST still run github widgets without a WakaTime token. WakaTime-only yaml (`plugins.wakatime: {}` with github omitted) MUST run coding without treating the run as “every github widget skipped”. Coding outcomes MUST NOT join `decideAllGithubWidgetsSkipped`. This change MUST NOT add widget ids other than `demo`, `stats`, `languages`, and `coding` to the engine enabled-widget list.

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

#### Scenario: enabledWidgets stays github plus coding
- **WHEN** the Action builds the enabled widget list for a run
- **THEN** widget ids MUST be drawn only from `demo`, `stats`, `languages`, and `coding`
