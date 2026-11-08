## MODIFIED Requirements

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

## ADDED Requirements

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
