## 1. Proposal artifacts

- [x] 1.1 Write `openspec/changes/github-top-repos/.openspec.yaml` with `schema: spec-driven`.
- [x] 1.2 Write `proposal.md` (complete existing `top-repos` id; owner crawl; no HTTP; no types.ts append).
- [x] 1.3 Write `design.md` (exclusive github pack files; rank stars/forks; List bit; engine out of scope).
- [x] 1.4 Write `specs/widget-contract/spec.md` (frozen options, dump ranking, empty “No repositories”, fetch none).
- [x] 1.5 `pnpm exec openspec validate --strict --type change github-top-repos`. Do not archive. Do not edit `openspec/specs/**`. Do not rewrite `docs-full-catalog-playground`.

## 2. Plugin registry

- [x] 2.1 Exclusive: `packages/plugins/src/github/plugin.ts` + `plugin.test.ts`. Append widget `top-repos`. `integrations` stay `["static","github"]`. `defaults.widgets` stay `["stats","languages"]`. Union `List` into pack `bitsUsed`. Do not register `contributions`. Do not create a new pack. Do not edit `types.ts`.

## 3. Widget

- [x] 3.1 Exclusive new `packages/plugins/src/github/widgets/top-repos/{widget,view-model,render}.ts(x)` plus tests. Rank dump `repositories` by stars, then forks, then name. Apply `limit` widget-side. Consume cached dump only. No `fetch`. Empty → “No repositories”. fromJsx + `assertTakumiTree` + `renderSvg`. Extra dump keys MUST NOT fail parse. Never REST `/languages`.
- [x] 3.2 Barrel exclusive: export `renderTopReposSvg` and `TOP_REPOS_BITS_USED` from `packages/plugins/src/index.ts`. Do not clobber demo/stats/languages/repo exports.
- [x] 3.3 Pack preview exclusive: dispatch `top-repos` from `packages/plugins/src/github/preview.ts`.

## 4. Docs closeout

- [x] 4.1 Update `packages/plugins/AGENTS.md` github widget list: opt-in `top-repos` on pack `github`; no HTTP; empty “No repositories”. Do not copy into `apps/docs/**`. Instruct `just generate-docs` (playground-fields snapshot only) and `just generate-action`.

## 5. Tests / verify

- [x] 5.1 Exclusive: `scripts/github-top-repos.test.ts` plus widget tests. Integration `github` only; no HTTP; no flatten; `docs-full-catalog-playground` stays in place; change stays unarchived.
- [x] 5.2 `pnpm exec vitest run` on this node’s tests. `just generate-docs --check`. Do not commit. Do not tag `v1` at `main`. Do not run `npx skills add`.
