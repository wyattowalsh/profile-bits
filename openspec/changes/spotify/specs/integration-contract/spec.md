## ADDED Requirements

### Requirement: Spotify uses oauth-refresh at the named token URL
Spotify MUST use scheme `oauth-refresh` (not `oauth2`, not `http-optional`). The token endpoint MUST be `https://accounts.spotify.com/api/token`. The token request MUST use `grant_type=refresh_token` and MUST send client id/secret as HTTP Basic (not as yaml, not as `?key=` / `?api_key=`). The refresh token MUST NOT be sent as `Authorization`. After a successful refresh, resource requests MUST send `Authorization: Bearer ${access_token}`. `spotifyAuthorizationHeader` MUST take the access token, not the refresh token. `spotifyRequiresAuthorization()` MUST be true. Catalog auth MUST remain `required`. `decideActionToken` MUST remain GitHub-only. Dest `packages/integrations/src/spotify/client.ts` MAY be created only when it is absent.

#### Scenario: Token request uses refresh_token grant
- **WHEN** the Spotify client exchanges credentials for an access token
- **THEN** it MUST POST `https://accounts.spotify.com/api/token` with `grant_type=refresh_token` and MUST NOT send the refresh token as Bearer on that request

#### Scenario: Resource request uses access-token Bearer
- **WHEN** the Spotify client calls currently-playing, recently-played, or top tracks after a successful refresh
- **THEN** the request MUST include `Authorization: Bearer ${access_token}` and MUST NOT send the refresh token in that header

#### Scenario: oauth2 and http-optional are not used
- **WHEN** Spotify auth is applied
- **THEN** `{{scheme}}` MUST be `oauth-refresh` and the client MUST NOT reuse `http-optional` or invent `auth.oauth2.ts.template`

### Requirement: Spotify complete dump of player and top tracks
The Spotify cache MUST be a complete dump of allowed JSON from `GET /v1/me/player/currently-playing`, `GET /v1/me/player/recently-played`, and `GET /v1/me/top/tracks`. Widgets MUST NOT HTTP. Include/limit MUST run in the widget. Album art URLs MUST remain in the dump. Extra keys MUST NOT fail dump parse. Secrets MUST NOT appear in the dump. REST `/languages` MUST stay forbidden. Playwright MUST NOT enter the Action runtime.

#### Scenario: Dump keeps currently-playing, recently-played, and top tracks
- **WHEN** the Spotify client fetches
- **THEN** the typed dump MUST include currently-playing, recently-played, and top-tracks JSON (204 currently-playing MAY be `null`)

#### Scenario: Album art URLs stay in the dump
- **WHEN** a track object in the dump has `album.images`
- **THEN** those image URLs MUST remain in the cached dump for the Image bit to read

#### Scenario: Extra dump keys do not fail parse
- **WHEN** the dump includes unexpected keys
- **THEN** parse MUST succeed and widgets MUST still read known fields

### Requirement: Spotify secrets never persist or log
Refresh token, access token, and client secret MUST NEVER appear in logs, widget payloads, typed dumps, or cache keys. Client id MUST NOT be written into yaml or widget payloads. Access tokens MUST NOT persist across Action runs. In-run memory MAY hold the access token. Cache keys MUST use `auth` `"bearer"` (never the secret). Header helpers that omit Authorization MUST return `{}` and MUST NOT return `{ Authorization: "" }`.

#### Scenario: Logs omit the refresh token
- **WHEN** the Spotify client refreshes or fetches and an error is thrown or logged
- **THEN** the message MUST NOT contain the refresh token, access token, or client secret

#### Scenario: Cache key omits secrets
- **WHEN** a Spotify resource GET is cached
- **THEN** the cache key MUST NOT include the refresh token, access token, or client secret

### Requirement: Missing Spotify credentials fail the job when the pack is on
Empty / `""` / whitespace `spotify_token` MUST be missing. Empty / `""` / whitespace `SPOTIFY_CLIENT_ID` or `SPOTIFY_CLIENT_SECRET` MUST be missing. When yaml enables pack `spotify` and the refresh token or client credentials are missing, the Action MUST `fail_job` and MUST NOT send the token request or resource requests. When pack `spotify` is absent, missing credentials MUST NOT fail the job. Playground and docs preview MUST use fixtures or skip live oauth-refresh and MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: Missing spotify_token with pack on fails the job
- **WHEN** yaml enables pack `spotify` and `spotify_token` is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send unauthenticated Spotify requests

#### Scenario: Missing client credentials fail the job when pack on
- **WHEN** yaml enables pack `spotify` and `SPOTIFY_CLIENT_ID` or `SPOTIFY_CLIENT_SECRET` is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send the token request

#### Scenario: Pack absent does not require Spotify credentials
- **WHEN** yaml omits `plugins.spotify`
- **THEN** missing `spotify_token` or client credentials MUST NOT fail the job

#### Scenario: Playground is not an embed API
- **WHEN** the docs playground previews a Spotify widget
- **THEN** it MUST use fixtures or skip live oauth-refresh and MUST NOT treat `POST /api/preview` as a public embed API

### Requirement: Spotify client credentials are named env not yaml
Client id MUST come from named env `SPOTIFY_CLIENT_ID`. Client secret MUST come from named env `SPOTIFY_CLIENT_SECRET`. They MUST NOT appear in yaml. They MUST NOT become flattened `plugin_<plugin>_<widget>_<option>` Action inputs or extra Marketplace Action inputs. Action `spotify_token` MUST remain optional with **no default**. Yaml `plugins.spotify.token_env` MUST remain an env **name** (http pattern), not a token value, and MUST NOT be `INPUT_*`.

#### Scenario: Client credentials are not yaml
- **WHEN** Spotify is configured
- **THEN** yaml MUST NOT contain client id, client secret, or a refresh token value

#### Scenario: No flattened Action inputs
- **WHEN** Spotify is specified
- **THEN** the system MUST NOT add `plugin_spotify` or `plugin_<plugin>_<widget>_<option>` inputs
