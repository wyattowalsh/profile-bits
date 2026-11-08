## ADDED Requirements

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
