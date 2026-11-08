# Workstream: auth-schemes

Wave 2 prerequisite for Spotify/Steam. OpenSpec + thin Action, then types + `just generate-action`.

## Files

- `packages/core/src/types.ts` `ActionInputsSchema`
- `packages/core/src/codegen/action-yml.ts`
- `packages/action/src/engine.ts`, `clients.ts`
- `.agents/profile-bits/skills/author-integration/` (scheme table after OpenSpec)
- generated `action.yml`

## Steps

1. OpenSpec new auth schemes: `oauth-refresh` (Spotify later Strava) and `query-key` (Steam later YouTube/Last.fm). `http-optional` Bearer cannot send `?key=`.
2. Yaml `token_env` per new integration (http pattern). Optional Action `*_token` with **no default** for required-auth sources (wakatime pattern).
3. Spotify client id/secret stay named env, not yaml, not extra Marketplace flatten.
4. `just generate-action --check`. No `plugin_*_*_*`. No `plugin_wakatime`/`plugin_rss`/`plugin_http` bools.
5. author-integration currently **stops** on unknown `oauth2` — update the skill after the spec, not before.

## Verify

- `pnpm generate-action --check`
- Schema keys ≡ thin action.yml names
- generate-action tests still reject flattened plugin inputs

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W2-A-01 | A0 | — |
| W2-A-02 | A0 | — |
| W2-A-03 | A1 | A-01, A-02 |
| W2-A-04 | A2 | A-03 |
