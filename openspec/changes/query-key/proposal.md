## Why

Steam (later YouTube / Last.fm) authenticate with a Web API key in the query string (`?key=`). The only optional-token scheme today is `http-optional`, which sends `Authorization: Bearer`. Bearer cannot transmit Steam keys, and author-integration **stops** on unknown schemes. Wave 2 must name `query-key` in OpenSpec before Wave 3 can `author-integration add steam`.

## What Changes

- Name auth scheme `query-key`: catalog auth `required`; inject the secret as query parameter `key`; send no `Authorization` header (never Bearer, never Basic, never raw scheme).
- Missing / empty / whitespace token when a query-key pack is on is `fail_job` and MUST NOT send. Pack absent does not require the token.
- REST cache key uses auth `"query-key"` (never the secret). The cached URL and params MUST omit `key`. Logs MUST pass the token to `redactSecrets`.
- `http-optional` Bearer MUST NOT be used for query-key sources. Do not fold Steam into integration `http`.
- author-integration allowed `{{scheme}}` set gains `query-key`. Copy `assets/templates/auth.query-key.ts.template` (literal filename; never interpolate `auth.{{scheme}}.ts.template`). Unknown schemes (including the name `oauth2`) still **stop**. Dest `client.ts` exists still **stops**.
- Shared runtime helpers under `packages/integrations/src/query-key/` (not a first-party integration id). Wave 2 does not `author-integration add` github / wakatime / rss / http.
- Out of scope: `steam` / `youtube` ids, `ActionInputsSchema` `*_token`, yaml `token_env`, `oauth-refresh`, flattened `plugin_*_*_*`, tagging `v1` on `main`.

## Capabilities

### New Capabilities

- (none — `query-key` is a header/fail scheme on the existing integration and authoring contracts, not a fifth pack)

### Modified Capabilities

- `integration-contract`: ADDED scheme `query-key` (`?key=`, no Authorization, pack-on missing token `fail_job`, cache auth `"query-key"`, never the secret). `http-optional` MUST NOT send query-key secrets as Bearer.
- `author-plugin`: ADDED `query-key` as a named allowed author-integration scheme that copies `auth.query-key.ts.template`. Unknown scheme names still stop. Live dest `client.ts` still stops.

## Impact

- Specs: MODIFIED deltas under this change for `integration-contract` and `author-plugin`. Do not edit `openspec/specs/**` until archive. Do not rewrite `docs-full-catalog-playground` or `oauth-refresh`.
- Code (this change): `packages/integrations/src/query-key/**` helpers + tests; author-integration template `auth.query-key.ts.template`. Do not edit live `packages/integrations/src/{github,wakatime,rss,http}/client.ts`. Do not edit `packages/core/src/types.ts` (`ActionInputsSchema` is W2-A-03). Do not edit author-integration `SKILL.md` / `references/auth.md` / evals in this node (parallel W2-A-01 owns oauth-refresh on those same files).
- Later: W2-A-03 thin `*_token` + yaml `token_env`; Wave 3 steam dest `client.ts` applies `?key=` at send time.
