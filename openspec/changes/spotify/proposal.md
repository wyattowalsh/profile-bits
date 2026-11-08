## Why

Wave 3 elbow pack `spotify` is already named in `elbow-catalog` (`now-playing`,
`top`, integration auth `required`, Action `spotify_token` with no default).
Dest `packages/integrations/src/spotify/client.ts` is absent, so Wave 3 may
run `author-integration add spotify` against scheme `oauth-refresh`. Widgets
need a complete currently-playing / recently-played / top-tracks dump with
album art URLs; cards must not HTTP. Client id/secret stay named env, not
yaml. Refresh tokens must never be logged. `docs-full-catalog-playground`
stays in place.

## What Changes

- OpenSpec for Spotify fetch/render behavior on existing catalog ids (do not
  append `FIRST_PARTY_*`; pack agents MUST NOT edit `packages/core/src/types.ts`).
- Scheme `oauth-refresh` (not `oauth2`): refresh token + client credentials →
  access token at `https://accounts.spotify.com/api/token`, then Bearer access
  on resource GETs. Copy `auth.oauth-refresh.ts.template` onto dest `auth.ts`
  only because dest `client.ts` is absent.
- Named env `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` (not yaml, not extra
  Marketplace flatten). Thin Action `spotify_token` already exists with **no
  default**. Yaml `token_env` stays the http env-name pattern.
- Complete dump of currently-playing, recently-played, and top tracks. Widgets
  `now-playing` (currently-playing, recently-played fallback) and `top` (limit
  widget-side) read the cache. Album art URLs stay in the model; Image bit
  renders them. No HTTP in widgets.
- Fixtures default for docs/playground. `POST /api/preview` is not a public
  embed API. Missing token or client credentials with pack on is `fail_job`.
- No `plugin_spotify` bool. No `plugin_<plugin>_<widget>_<option>` inputs.
  Wave 2 MUST NOT `author-integration add` github / wakatime / rss / http.

## Capabilities

### New Capabilities

- (none — Spotify completes existing plugin / widget / integration / author
  contracts; scheme `oauth-refresh` is already named)

### Modified Capabilities

- `integration-contract`: Spotify oauth-refresh runtime, pinned token URL,
  complete dump, secrets never log or persist, pack-on `fail_job`.
- `plugin-contract`: pack `spotify` with widgets `now-playing` and `top`;
  defaults omit extra cards; no extra pack bools.
- `widget-contract`: dump readers, recently-played fallback, widget-side
  `top` limit, Image cover art, no HTTP.
- `author-plugin`: complete-existing catalog ids; `author-integration add
  spotify` only when dest `client.ts` is absent.

## Impact

- Specs: ADDED deltas under this change. Do not edit `openspec/specs/**`
  until archive. Do not rewrite `docs-full-catalog-playground`,
  `oauth-refresh`, `elbow-catalog`, or `action-token-env`.
- Code (this node): `packages/integrations/src/spotify/**`,
  `packages/plugins/src/spotify/**`, `auth.oauth-refresh.ts.template`,
  exclusive tests. Do not edit `packages/core/src/types.ts`, root
  `action.yml`, shared barrels, live github/wakatime/rss/http `client.ts`,
  or author-integration `SKILL.md`.
- Out of scope: Playwright in the Action, tagging `v1` at `main`,
  `npx skills add`, git commit, unauthenticated GitHub, REST `/languages`.
