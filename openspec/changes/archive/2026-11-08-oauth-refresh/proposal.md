## Why

`author-integration` copies auth from a closed four-file scheme table
(`none`, `github-bearer`, `wakatime-basic`, `http-optional`). Unknown
scheme `oauth2` **stops**. Spotify (later Strava) needs a refresh-token
exchange: client id/secret as named env, refresh token as a run secret,
then `Authorization: Bearer ${access_token}` on resource requests.
`http-optional` cannot do that — it sends the secret as Bearer/raw on the
resource request and treats a missing optional token as `fail_widget`.
Wave 3 cannot `author-integration add spotify` until OpenSpec names a
copyable scheme. This change names that scheme `oauth-refresh` (not
`oauth2`) before any pack id, Action input, or skill-table apply.

## What Changes

- Name `oauth-refresh` as an allowed `{{scheme}}`. When OpenSpec names it
  for a **new** dest (no `client.ts`), `author-integration` MUST copy
  `auth.oauth-refresh.ts.template` and MUST NOT stop as unknown.
- Alias `oauth2` stays unknown and still **stops**. Do not invent
  `auth.oauth2.ts.template` or a default `auth.ts.template`.
- Runtime: refresh token + client credentials → access token at a
  consumer-named token endpoint (`grant_type=refresh_token`); resource
  calls use Bearer access token. Catalog auth is `required`. Missing
  refresh token or client credentials with the pack on is `fail_job`.
- Client id/secret stay named env, not yaml, not extra Marketplace flatten.
- No flattened `plugin_<plugin>_<widget>_<option>` inputs. No
  `plugin_spotify` bool. No first-party pack/widget/integration id in
  this change. No `ActionInputsSchema` keys here (later W2-A-03).
- Wave 2 MUST NOT `author-integration add` github / wakatime / rss / http.

## Capabilities

### New Capabilities

- (none — `oauth-refresh` is a named author-integration scheme and
  integration auth policy on the existing contracts, not a new layer)

### Modified Capabilities

- `author-plugin`: named `{{scheme}}` `oauth-refresh` is copyable;
  `oauth2` still stops; no flatten; no live-dest clobber.
- `integration-contract`: `oauth-refresh` refresh-then-Bearer runtime,
  required-auth `fail_job`, secrets never persist or log, client
  credentials named env not yaml.

## Impact

- Specs: ADDED deltas under this change for `author-plugin` and
  `integration-contract`. After archive/sync those become the contract
  SSOT.
- Later apply (not this node): `auth.oauth-refresh.ts.template`;
  author-integration scheme table **after** the sibling `query-key`
  spec exists (do not dual-write `SKILL.md` with W2-A-02). Thin
  `*_token` / yaml `token_env` land in a later `ActionInputsSchema`
  change. Spotify pack is wave 3.
- Out of scope: `query-key`, flattening Action inputs, tagging `v1` at
  `main`, unauthenticated GitHub, REST `/languages`, Playwright in the
  Action, `POST /api/preview` as an embed API, `npx skills add`, git
  commit, extending live `client.ts` for github/wakatime/rss/http.
