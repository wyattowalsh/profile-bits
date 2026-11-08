## ADDED Requirements

### Requirement: Thin Action token names are read from live ActionInputsSchema
Authoring skills MUST read live `ActionInputsSchema` / `types.ts` for thin Action input names, including optional `wakatime_token`, `http_token_env`, `spotify_token`, and `steam_token` (no defaults). Skills MUST NOT invent flattened Action inputs of the form `plugin_<plugin>_<widget>_<option>`. Skills MUST NOT invent pack-enable bools `plugin_wakatime`, `plugin_rss`, `plugin_http`, `plugin_spotify`, or `plugin_steam`. Yaml `token_env` MUST be an environment variable name (http pattern), not a token value, and MUST NOT be `INPUT_*`. This change MUST NOT add ids to `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, or `FIRST_PARTY_INTEGRATION_IDS`. Wave 2 MUST NOT run `author-integration add` for `github`, `wakatime`, `rss`, or `http`.

#### Scenario: Skills do not invent thin names
- **WHEN** a skill needs an Action token input
- **THEN** it MUST read live `ActionInputsSchema` / `types.ts` and MUST NOT invent `plugin_*_*_*` or extra pack bools

#### Scenario: Yaml token_env is not a secret
- **WHEN** a skill writes or documents yaml `token_env`
- **THEN** the value MUST be an environment variable name and MUST NOT be a token, `api_key`, or `INPUT_*` name

#### Scenario: Wave 2 does not add live first-party integrations
- **WHEN** wave 2 extends github, wakatime, rss, or http
- **THEN** it MUST NOT run `author-integration add` for those ids

#### Scenario: No first-party id in this change
- **WHEN** this change lands
- **THEN** `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, and `FIRST_PARTY_INTEGRATION_IDS` MUST NOT gain a new id from this change
