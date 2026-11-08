## Why

Wave 3 required-auth packs (Spotify `oauth-refresh`, Steam `query-key`) need
thin Action secrets and a yaml env-name field before those pack ids land.
Today `ActionInputsSchema` has optional `wakatime_token` (no default) and
optional `http_token_env` (env **name**, no default). New required-auth
sources must copy both patterns: Action `*_token` with **no default**, plus
yaml `token_env` (http pattern). Sibling changes `oauth-refresh` and
`query-key` deferred those keys here. Flattened `plugin_*_*_*` inputs and
extra pack bools stay forbidden.

## What Changes

- `ActionInputsSchema` gains optional `spotify_token` and `steam_token` with
  **no default** (wakatime_token pattern). Pack-on missing token remains
  `fail_job` when those packs exist; this change does not add pack ids.
- Yaml `plugins.http.token_env` is the live http pattern: optional process
  env **name** (`TokenEnvSchema`), not a token value, not `INPUT_*`.
- Thin `action.yml` codegen lists the new `*_token` inputs with no `default`.
  Schema keys stay equal to generated input names.
- No `plugin_wakatime` / `plugin_rss` / `plugin_http` / `plugin_spotify` /
  `plugin_steam` bools. No `plugin_<plugin>_<widget>_<option>` inputs.
- No first-party plugin, widget, or integration ids. Wave 2 does not
  `author-integration add` github / wakatime / rss / http.

## Capabilities

### New Capabilities

- (none — thin Action tokens and yaml `token_env` extend existing
  `action-public-api`, `plugin-contract`, and `author-plugin` contracts)

### Modified Capabilities

- `action-public-api`: optional `spotify_token` / `steam_token` (no default)
  join the thin Marketplace set; extra pack bools still forbidden.
- `plugin-contract`: yaml `plugins.http.token_env` (http pattern); thin
  Action `*_token` names; still no flatten.
- `author-plugin`: skills MUST read live `ActionInputsSchema`; MUST NOT
  invent thin names, pack bools, or FIRST_PARTY ids.

## Impact

- Specs: MODIFIED / ADDED deltas under this change. Do not edit
  `openspec/specs/**` until archive. Do not rewrite
  `docs-full-catalog-playground`, `oauth-refresh`, or `query-key`.
- Code: `packages/core/src/types.ts` (`ActionInputsSchema`, `TokenEnvSchema`,
  yaml `plugins.http.token_env`) plus thin `action-yml.ts` / generated
  `action.yml` so `pnpm generate-action --check` stays green. Tests in
  `types.test.ts` and this change’s script test.
- Out of scope: Spotify / Steam packs, live `client.ts` for github /
  wakatime / rss / http, author-integration skill-table apply, CLI flags,
  engine wiring of yaml `token_env`, tagging `v1` at `main`, `npx skills add`,
  git commit.
