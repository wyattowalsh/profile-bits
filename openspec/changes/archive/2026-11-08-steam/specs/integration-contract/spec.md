## ADDED Requirements

### Requirement: steam client authenticates with query-key ?key=
Integration `steam` MUST use auth scheme `query-key`. Catalog auth MUST
be `required`. Every Steam Web API request MUST set URL query parameter
`key` to the trimmed Action `steam_token` (yaml `token_env` names the
process env that may supply that secret). The client MUST NEVER send
`Authorization` (not Bearer, not Basic, not a raw scheme prefix). The
client MUST NEVER put the secret in a header. `http-optional` Bearer
MUST NOT transmit a Steam key. The client MUST NOT fold Steam into
integration `http`. Empty / `""` / whitespace `steam_token` MUST be
treated as missing. When yaml enables pack `steam` and the token is
missing, the Action MUST fail the job (`fail_job`) and MUST NOT send.
When the pack is absent, the token MUST NOT be required. Requests MUST
use `https://api.steampowered.com` only. The system MUST NEVER call
GitHub unauthenticated and MUST NEVER call REST
`/repos/{owner}/{repo}/languages` on this path. Playground and docs
preview MUST use fixtures or skip live Steam fetches. `POST /api/preview`
remains layout preview, not a public embed API.

#### Scenario: steam request uses ?key= and no Authorization
- **WHEN** the steam integration performs HTTP with a non-empty
  `steam_token`
- **THEN** the request URL MUST include query parameter `key` set to the
  trimmed token and MUST NOT include an `Authorization` header

#### Scenario: Bearer is not used for steam keys
- **WHEN** the steam integration is given a token that would be valid as
  an http-optional Bearer value
- **THEN** the client MUST still send that value only as `?key=` and
  MUST NOT send `Authorization: Bearer`

#### Scenario: missing steam_token with pack on fails the job
- **WHEN** yaml enables pack `steam` and `steam_token` is empty, `""`,
  or whitespace
- **THEN** the job MUST fail and MUST NOT send a request

#### Scenario: pack absent does not require steam_token
- **WHEN** yaml omits `plugins.steam`
- **THEN** a missing `steam_token` MUST NOT fail the job

#### Scenario: steam host is api.steampowered.com
- **WHEN** the steam client constructs a Web API URL
- **THEN** the origin MUST be `https://api.steampowered.com` and MUST
  NOT call GitHub or REST `/repos/{owner}/{repo}/languages`

#### Scenario: Playground never live steam by default
- **WHEN** the docs playground previews a steam widget
- **THEN** it MUST use fixtures or skip live fetches and MUST NOT treat
  `POST /api/preview` as a public embed API

### Requirement: steam cache and logs never store the Web API key
A steam REST cache key MUST be `(method, url, params, auth)` where
`auth` is `"query-key"` (never the token). The URL and params in the
cache key MUST omit query parameter `key`. Same-run cache hits MUST skip
fetch. Logs MUST pass the token to the existing secret redactor and MUST
NOT print the raw key. Typed dumps, widget payloads, and fixtures MUST
NOT contain `steam_token`. Callers MUST NOT put `key` in yaml headers.
Yaml `token_env` MUST be a process environment variable name, not a
token value, and MUST NOT be `INPUT_*`.

#### Scenario: cache auth is query-key never the secret
- **WHEN** a steam REST request is cached
- **THEN** the cache key MUST include `auth` `"query-key"` and MUST NOT
  include the token value

#### Scenario: cache url and params omit key
- **WHEN** a steam request is sent with `?key=` and other query
  parameters
- **THEN** the cached URL and params MUST omit `key` and MUST still
  distinguish other params

#### Scenario: logs redact the steam token
- **WHEN** a steam client logs a URL, error, or header dump
- **THEN** the log MUST NOT contain the raw `steam_token`

#### Scenario: dumps omit the key
- **WHEN** the steam dump is written to cache or fixtures
- **THEN** it MUST NOT contain `steam_token` or query parameter `key`

### Requirement: steam cached payload is the Steam Web API dump
The steam cached typed payload MUST be a complete dump of allowed Steam
Web API JSON, not a leftover widget slice. Widgets MUST select fields
from that dump and MUST NOT perform HTTP. Include/limit MUST stay
widget-side and MUST NOT drop dump fields at fetch. Secrets MUST NEVER
persist. Extra keys the API returns MUST NOT fail parse.

The shared client MUST GET these methods on
`https://api.steampowered.com` with query-key `?key=`:

- `ISteamUser/ResolveVanityURL/v1` when yaml `plugins.steam.user` is
  present and is not a 17-digit steamid64 (request keeps `vanityurl`;
  dump keeps `success`, `steamid`, and `message` when returned)
- `ISteamUser/GetPlayerSummaries/v2` (request keeps `steamids`; dump
  keeps each `players[]` object including `steamid`, `personaname`,
  `profileurl`, `avatar`, `avatarmedium`, `avatarfull`, `avatarhash`,
  `personastate`, `communityvisibilitystate`, `profilestate`,
  `lastlogoff`, `timecreated`, `realname`, `primaryclanid`,
  `loccountrycode`, `gameid`, and `gameextrainfo` when returned)
- `IPlayerService/GetRecentlyPlayedGames/v1` (request keeps `steamid`;
  dump keeps `total_count` and each `games[]` object including `appid`,
  `name`, `playtime_2weeks`, `playtime_forever`, `img_icon_url`, and
  `img_logo_url` when returned)

Yaml `plugins.steam.user` is the Steam vanity or steamid64. Action
`user` is the GitHub login and MUST NOT be used as a Steam identity.
When yaml `user` is already a 17-digit steamid64, ResolveVanityURL MUST
be skipped. One steam client instance MUST be shared per Action or
playground run. Wave 3 MAY run `author-integration add steam` only when
dest `packages/integrations/src/steam/client.ts` is absent. Wave 2 MUST
NOT run `author-integration add` for `github`, `wakatime`, `rss`, or
`http`. This change MUST NOT add flattened
`plugin_<plugin>_<widget>_<option>` Action inputs.

#### Scenario: GetPlayerSummaries dump keeps profile fields
- **WHEN** `ISteamUser/GetPlayerSummaries/v2` returns `personaname`,
  `avatarfull`, `profileurl`, and `personastate`
- **THEN** the cached payload MUST include those fields and MUST NOT
  drop them because widget `player` does not render every key

#### Scenario: GetRecentlyPlayedGames dump keeps games
- **WHEN** `IPlayerService/GetRecentlyPlayedGames/v1` returns
  `total_count` and `games[]` with `appid`, `name`, `playtime_2weeks`,
  and `img_icon_url`
- **THEN** the cached payload MUST include those fields

#### Scenario: ResolveVanityURL dump when user is vanity
- **WHEN** yaml `plugins.steam.user` is a vanity name rather than a
  17-digit steamid64
- **THEN** the client MUST GET `ISteamUser/ResolveVanityURL/v1` and the
  dump MUST keep `success`, `steamid`, and `message` when returned

#### Scenario: steamid64 skips ResolveVanityURL
- **WHEN** yaml `plugins.steam.user` is a 17-digit steamid64
- **THEN** the client MUST NOT call ResolveVanityURL for that run

#### Scenario: Action user is not a Steam id
- **WHEN** Action `user` is set and yaml `plugins.steam.user` is unset
- **THEN** the steam client MUST NOT treat the GitHub login as a Steam
  vanity or steamid64

#### Scenario: Fetch does not apply recent limit
- **WHEN** yaml `plugins.steam.widgets.recent.limit` is `1` and
  GetRecentlyPlayedGames returns more than one game
- **THEN** the cached dump MUST keep the unsliced `games[]` list

#### Scenario: Widgets select from the steam dump
- **WHEN** widgets `player` or `recent` render
- **THEN** they MUST select fields from the cached dump and MUST NOT
  perform HTTP

#### Scenario: Wave 3 adds steam only when dest client.ts is absent
- **WHEN** dest `packages/integrations/src/steam/client.ts` is absent
- **THEN** Wave 3 MAY run `author-integration add steam` with scheme
  `query-key` and MUST NOT run `author-integration add` for `github`,
  `wakatime`, `rss`, or `http`
