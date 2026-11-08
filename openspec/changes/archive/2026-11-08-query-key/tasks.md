## 1. OpenSpec contract

- [x] 1.1 Exclusive: `openspec/changes/query-key/proposal.md` names scheme `query-key` (`?key=`), deltas `integration-contract` + `author-plugin`, and does not rewrite `docs-full-catalog-playground`.
- [x] 1.2 Exclusive: `specs/integration-contract/spec.md` ADDED `?key=` / no Authorization / pack-on `fail_job` / cache auth `"query-key"`.
- [x] 1.3 Exclusive: `specs/author-plugin/spec.md` ADDED literal `auth.query-key.ts.template` copy; unknown `oauth2` still stops; live dest `client.ts` still stops.
- [x] 1.4 Exclusive: `design.md` records helpers vs live client locks and defers SKILL.md to a serial apply (W2-A-01 owns oauth-refresh on the same skill files).

## 2. Runtime helpers and tests

- [x] 2.1 Exclusive: `packages/integrations/src/query-key/auth.ts` apply/strip/assert/cache helpers. Not a first-party integration id. Do not edit github/wakatime/rss/http `client.ts`.
- [x] 2.2 Exclusive: `packages/integrations/src/query-key/auth.test.ts` — `?key=` present, no Bearer, missing pack-on `fail_job`, cache omits the secret.
- [x] 2.3 Exclusive: `packages/integrations/src/query-key/index.ts` re-exports the helpers.

## 3. Author-integration template

- [x] 3.1 Exclusive: `.agents/profile-bits/skills/author-integration/assets/templates/auth.query-key.ts.template` (literal filename, shared export names, header `{}`, `RequiresAuthorization` true).
- [x] 3.2 Tests assert the template file is that literal path and does not send Bearer.

## 4. Verify

- [x] 4.1 `pnpm exec openspec validate --strict --change query-key` and `pnpm exec openspec status --change query-key --json`.
- [x] 4.2 `pnpm exec vitest run` in `@profile-bits/integrations` for `src/query-key`.
