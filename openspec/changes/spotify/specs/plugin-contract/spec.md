## ADDED Requirements

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
