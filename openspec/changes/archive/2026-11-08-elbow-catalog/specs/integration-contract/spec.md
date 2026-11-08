## ADDED Requirements

### Requirement: Elbow integration ids and auth
`FIRST_PARTY_INTEGRATION_IDS` MUST include `spotify`, `leetcode`, `chesscom`, `lichess`, and `steam` in addition to `static`, `github`, `wakatime`, `rss`, and `http`. `INTEGRATION_AUTH` MUST be `required` for `spotify` and `steam`, and `none` for `leetcode`, `chesscom`, and `lichess`. There MUST NOT be an integration id `chess`. Catalog auth MUST NOT add `plugin_*_*_*` inputs. Empty GitHub tokens MUST still fail the job. REST `/languages` MUST stay forbidden. Playwright MUST NOT enter the Action runtime.

#### Scenario: Integration catalog includes elbow ids
- **WHEN** live `FIRST_PARTY_INTEGRATION_IDS` is read
- **THEN** it MUST contain `spotify`, `leetcode`, `chesscom`, `lichess`, and `steam` and MUST NOT contain `chess`

#### Scenario: Auth requirements
- **WHEN** `INTEGRATION_AUTH` is read
- **THEN** `spotify` and `steam` MUST be `required` and `leetcode`, `chesscom`, and `lichess` MUST be `none`

#### Scenario: Locks stay
- **WHEN** elbow integrations are catalogued
- **THEN** the system MUST NOT call GitHub unauthenticated, MUST NOT call REST `/languages`, MUST NOT add `plugin_<plugin>_<widget>_<option>` inputs, and MUST NOT put Playwright in the Action

### Requirement: Required-auth elbow tokens stay thin
Spotify MUST use Action `spotify_token` (refresh, no default) plus yaml `token_env` (http pattern) and named env client id/secret (not yaml). Steam MUST use Action `steam_token` (no default) plus yaml `token_env` and query-key `?key=` (not Bearer). Missing token with that pack on MUST `fail_job`. Pack absent MUST NOT require the token. Secrets MUST NOT persist in dumps, logs, or cache keys.

#### Scenario: Missing spotify token with pack on fails the job
- **WHEN** yaml enables pack `spotify` and `spotify_token` is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send unauthenticated Spotify requests

#### Scenario: Missing steam token with pack on fails the job
- **WHEN** yaml enables pack `steam` and `steam_token` is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send a request

#### Scenario: Pack absent does not require elbow tokens
- **WHEN** yaml omits `plugins.spotify` and `plugins.steam`
- **THEN** missing `spotify_token` or `steam_token` MUST NOT fail the job
