## ADDED Requirements

### Requirement: chesscom integration is auth-none JSON with User-Agent
Integration `chesscom` MUST use auth `none`. It MUST GET JSON from
`https://api.chess.com` only. Every chess.com request MUST send identifying
header `User-Agent: profile-bits-chesscom/0 (+https://github.com/wyattowalsh/profile-bits)`
and MUST NOT send `Authorization` (including `Authorization: ""`). Yaml MUST
NOT add a chess token or `plugin_*_*_*` inputs. Empty GitHub tokens MUST
still fail the job. REST `/languages` MUST stay forbidden. Playwright MUST
NOT enter the Action runtime. Dest `packages/integrations/src/chesscom/client.ts`
MAY be created only when that file is absent. Wave 2/3 MUST NOT run
`author-integration add` for `github`, `wakatime`, `rss`, or `http`.

#### Scenario: chesscom sends User-Agent and no Authorization
- **WHEN** the chesscom client GETs player, stats, or games JSON
- **THEN** each request MUST include the identifying Chess.com User-Agent and
  MUST omit the Authorization header

#### Scenario: chesscom does not call GitHub
- **WHEN** chesscom loads a dump
- **THEN** it MUST NOT call GitHub, MUST NOT call REST `/languages`, and MUST
  NOT send unauthenticated GitHub requests

### Requirement: chesscom dump is player plus stats plus games
The chesscom cache MUST store the parsed JSON from player, stats, current
games, archives, and recent games as-is. An optional typed schema MUST NOT
drop keys. Widgets MUST read that dump and MUST NOT HTTP. Secrets MUST NEVER
persist in the dump, logs, or cache keys. REST cache keys MUST be
`(method, url, params, auth, headers)` with `auth` `"none"` (never a secret).

#### Scenario: dump keeps extra player and stats keys
- **WHEN** player or stats JSON includes keys the ratings card does not render
- **THEN** the cached dump MUST still include those keys

#### Scenario: dump includes current or recent game fields
- **WHEN** chess.com returns current and/or recent games with `fen` and `pgn`
- **THEN** the cached dump MUST retain `fen` and `pgn` for the game widget

### Requirement: chesscom username is not a fetch URL
Chess.com requests MUST interpolate a validated username into pinned paths
`/pub/player/{username}` (and stats/games suffixes). Usernames MUST match
`^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$` after trim. Path segments MUST use
`encodeURIComponent`. Archive URLs discovered in dump JSON MUST be
`https://api.chess.com` with no userinfo and a `/pub/` path; any other host
MUST `fail_widget` without fetching. The system MUST NOT accept a
user-controlled chess fetch URL in yaml.

#### Scenario: evil username does not leave api.chess.com
- **WHEN** yaml `user` is `https://evil.example/pwn` or contains `/`, `@`, or `:`
- **THEN** the client MUST fail the widget and MUST NOT send HTTP

#### Scenario: foreign archive URL is refused
- **WHEN** an archives list entry is `https://evil.example/games`
- **THEN** the client MUST fail the widget and MUST NOT fetch that URL

### Requirement: lichess integration is auth-none JSON
Integration `lichess` MUST use auth `none`. It MUST GET JSON from
`https://lichess.org` only (`/api/user/{username}`, current game, recent
games). It MUST send a non-empty User-Agent and MUST NOT send
`Authorization`. The dump MUST keep the parsed user object (including
`perfs`) plus current/recent game JSON without dropping extra keys. Missing
current-game (HTTP 404) MUST store an empty current object and MUST NOT fail
the whole dump. Unknown user (HTTP 404 on `/api/user/{username}`) MUST
`fail_widget`. Usernames MUST use the same identifier gate as chesscom.
Playwright MUST NOT enter the Action. REST `/languages` MUST stay forbidden.

#### Scenario: lichess dump keeps perfs extra keys
- **WHEN** the user JSON includes `perfs` plus keys the card does not render
- **THEN** the cached dump MUST still include those keys

#### Scenario: lichess current-game 404 is optional
- **WHEN** Lichess returns 404 for the current-game path and 200 for the user
- **THEN** the dump MUST keep the user object and MUST NOT fail the widget
  solely because no live game exists

#### Scenario: lichess username cannot target another host
- **WHEN** yaml `user` contains `/`, `@`, `:`, or a URL
- **THEN** the client MUST fail the widget and MUST NOT send HTTP
