## 1. OpenSpec contract

- [x] 1.1 Exclusive: `openspec/changes/action-token-env/proposal.md`. Name thin `*_token` + yaml `token_env`. Do not rewrite `docs-full-catalog-playground`.
- [x] 1.2 Exclusive: `design.md`. Reserved `spotify_token` / `steam_token`; http yaml `token_env`; no FIRST_PARTY ids; no live dest `author-integration add`.
- [x] 1.3 Exclusive: `specs/action-public-api/spec.md`, `specs/plugin-contract/spec.md`, `specs/author-plugin/spec.md`.
- [x] 1.4 `pnpm exec openspec validate --strict --change action-token-env`. Do not archive. Do not edit `openspec/specs/**`.

## 2. Schema and codegen

- [x] 2.1 Exclusive: `packages/core/src/types.ts` — `TokenEnvSchema`, `OptionalActionTokenSchema`, yaml `plugins.http.token_env`, `ActionInputsSchema` optional `spotify_token` / `steam_token` with no default. Keep `wakatime_token` / `http_token_env` without defaults. No pack bools.
- [x] 2.2 Exclusive: `packages/core/src/codegen/action-yml.ts` thin inputs with no `default` for the new tokens. `pnpm generate-action` then `pnpm generate-action --check`.
- [x] 2.3 Do not edit live `packages/integrations/src/{github,wakatime,rss,http}/client.ts`. Do not run `author-integration add`. Do not run `npx skills add`. Do not commit. Do not tag `v1` at `main`.

## 3. Tests

- [x] 3.1 Exclusive: `packages/core/src/types.test.ts` — no-default tokens, no extra pack bools, no flatten keys, yaml `token_env` parse/reject, FIRST_PARTY ids unchanged.
- [x] 3.2 Exclusive: `scripts/action-token-env.test.ts` — change files name the pattern, forbid flatten and extra pack bools, do not add first-party ids.
- [x] 3.3 `pnpm exec vitest run` for core types + generate-action + this script. `pnpm generate-action --check`.
