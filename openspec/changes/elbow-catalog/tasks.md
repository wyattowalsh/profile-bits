## 1. Proposal artifacts

- [x] 1.1 Write `openspec/changes/elbow-catalog/.openspec.yaml` with `schema: spec-driven`.
- [x] 1.2 Write `proposal.md` (Why / What Changes / Capabilities / Impact).
- [x] 1.3 Write `design.md` (single types.ts writer, collision ids, option maps).
- [x] 1.4 Write `specs/plugin-contract/spec.md` (elbow packs, no extra pack bools, no flatten).
- [x] 1.5 Write `specs/widget-contract/spec.md` (unique widget ids and `WIDGET_INTEGRATIONS`).
- [x] 1.6 Write `specs/integration-contract/spec.md` (elbow integration ids and auth).
- [x] 1.7 Write `specs/author-plugin/spec.md` (complete-existing; pack agents do not edit types.ts).

## 2. Types catalog (this node)

- [x] 2.1 Types exclusive: `packages/core/src/types.ts`. Append plugin ids `spotify`, `leetcode`, `chess`, `steam`. Append widget ids `top-repos`, `contributions`, `editors`, `projects`, `os`, `langs`, `latest`, `now-playing`, `top`, `solved`, `heatmap`, `ratings`, `game`, `player`, `recent`. Append integration ids `spotify`, `leetcode`, `chesscom`, `lichess`, `steam`. Fill `INTEGRATION_AUTH` and `WIDGET_INTEGRATIONS`. Keep shipped eight widgets and github pack defaults `stats` + `languages`. Add yaml option maps and `PluginsConfigSchema` keys. No `plugin_*_*_*`. No extra pack bools. Do not change `ActionInputsSchema` token keys. Do not enumerate bits in core.
- [x] 2.2 WakaTime widgets exclusive: `packages/core/src/wakatime-schema.ts` slice option keys `editors`, `projects`, `os`, `langs` (not `languages`, not `stats`).
- [x] 2.3 Tests: `packages/core/src/types.test.ts` plus `scripts/elbow-catalog.test.ts`. Catalog membership, uniqueness, auth maps, no flatten, no extra pack bools, OpenSpec change stays unarchived, `docs-full-catalog-playground` stays in place.

## 3. Out of scope for this node

- [x] 3.1 Pack agents implement clients/plugins/widgets after this catalog lands. They MUST NOT edit `types.ts`.
- [x] 3.2 Do not run `author-integration add`. Do not run `npx skills add`. Do not commit. Do not tag `v1` on `main`.
