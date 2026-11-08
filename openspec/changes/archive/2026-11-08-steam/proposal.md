## Why

Wave 3 elbow pack `steam` is catalogued (`player`, `recent`, Action
`steam_token`) but has no dest client, dump, or cards. Steam Web API
keys travel as `?key=`; Bearer (`http-optional`) cannot send them.
W3-ST-01 names the fetch/render contract so later ST nodes can
`author-integration add steam` only while dest `client.ts` is absent.

## What Changes

- Integration `steam` authenticates with scheme `query-key` (`?key=`),
  never `Authorization` Bearer/Basic. Catalog auth stays `required`.
- Pack-on missing / empty / whitespace `steam_token` is `fail_job` and
  MUST NOT send. Pack absent does not require the token.
- Cached dump is the complete JSON from GetPlayerSummaries,
  GetRecentlyPlayedGames, and ResolveVanityURL. Widgets select.
  Include/limit stay widget-side.
- REST cache auth is `"query-key"`. The cache key URL/params MUST omit
  `key`. Logs MUST redact the token. The key MUST NOT persist.
- Widgets `player` and `recent` consume that dump on Stat + Image (Cover
  maps to Image). They MUST NOT perform HTTP.
- Yaml `plugins.steam` MAY set `token_env` (env **name**) and `user`
  (vanity or steamid64). No `plugin_steam` bool. No
  `plugin_<plugin>_<widget>_<option>` inputs.
- Wave 3 MAY `author-integration add steam` only when dest `client.ts`
  is absent, copying `auth.query-key.ts.template`. Wave 2 MUST NOT add
  github / wakatime / rss / http. Pack agents MUST NOT edit `types.ts`.

## Capabilities

### New Capabilities

- (none — steam is a first-party pack/widget/integration on the existing
  contracts; `elbow-catalog` already named the ids)

### Modified Capabilities

- `integration-contract`: ADDED steam query-key client, complete Web API
  dump, pack-on `fail_job`, secret-free cache/logs.
- `widget-contract`: ADDED `player` / `recent` select from the dump on
  Stat + Image; no HTTP; recent `limit` is widget-side.
- `plugin-contract`: ADDED steam yaml `token_env` / `user`, pack default
  `player`, no extra pack bools or flatten.
- `author-plugin`: ADDED `author-integration add steam` copies
  query-key when dest `client.ts` is absent; MUST NOT edit `types.ts`.

## Impact

- Specs: ADDED deltas under this change. Do not edit
  `openspec/specs/**` until archive. Finish
  `docs-full-catalog-playground` in place (do not mint a new docs id).
  Do not rewrite `elbow-catalog`, `query-key`, or `action-token-env`.
- Code (this node): exclusive tests in `scripts/steam.test.ts`. No dest
  `client.ts`, plugin, or widget sources in W3-ST-01.
- Later apply (not this node): W3-ST-02 dest `packages/integrations/src/steam/`
  via `author-integration add steam` if `client.ts` is absent; W3-ST-03
  payload types + fixtures; W3-ST-04 plugin; W3-ST-05 widgets.
- Out of scope: editing `packages/core/src/types.ts`, Playwright in the
  Action, tagging `v1` at `main`, `POST /api/preview` as an embed API,
  `npx skills add`, git commit, `plugin_*_*_*` inputs, unauthenticated
  GitHub, REST `/languages`.
