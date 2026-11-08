## ADDED Requirements

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
