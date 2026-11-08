# Workstream: docs-full-catalog-playground

Wave 1. Finish existing OpenSpec change `docs-full-catalog-playground` (0/9, dirty-started). Do not rewrite the change id. Do not edit marketplace-release.

## Files

- `openspec/changes/docs-full-catalog-playground/tasks.md`
- `packages/core/src/codegen/docs-fields.ts` + snapshot `packages/core/src/codegen/__snapshots__/playground-fields.json`
- `apps/docs/src/preview/types.ts`, `schema-form.tsx`, `codegen/shell.tsx`, `codegen/export-workflow.ts`
- `apps/docs/app/playground/**`, `apps/docs/app/generate/**`, `apps/docs/app/api/preview/route.ts`, `apps/docs/src/preview/server/render-preview.ts`
- `DESIGN.md`, `apps/docs/AGENTS.md`

## Steps

1. Refresh docs-fields snapshot so groups include `coding`, `feed`, `json`, `chips`. Omit token keys. `just generate-docs --check`.
2. Bind github routes to `PREVIEW_GITHUB_WIDGET_IDS` only. Stop mapping the eight-id union onto github playground/generate.
3. PlaygroundShell: four-pack selector, honor route plugin, yaml rails `plugins.<pack>`, per-pack widget checkboxes from `PREVIEW_DEFAULT_WIDGETS_BY_PLUGIN`.
4. Add `/playground/{wakatime,rss}` and `[widget]`. Fold `/playground/http` into the shared shell with json and chips tuners. Landing `/playground` stays github redirect without other pack paths in that page source.
5. `render-preview.ts`: dispatch coding/feed/json/chips with non-empty fixtures. Optional live: GitHub App token, WakaTime preview env, rss/http SSRF, visitor HTML scrape via shared scrape client. GET `/api/preview` stays 405. POST omits token fields. Never unauth GitHub. Not an embed API.
6. Catalog: `/generate/catalog` four packs eight widgets; `/generate/{wakatime,rss,http}` + widget pages; pack `bitsUsed`. Bits index samples. `/generate/themes` from `NAMED_THEME_IDS` / `listFamilies`.
7. Honesty copy in DESIGN.md + apps/docs/AGENTS.md. `just lint` and targeted vitest.

## Verify

- `just generate-docs --check`
- `pnpm exec vitest run` on apps/docs + `packages/core/src/codegen/docs-fields.test.ts`
- `just lint`
- OpenSpec tasks 1.1–5.2 checked; `pnpm exec openspec status --change docs-full-catalog-playground --json`

## Risks

Dirty types already diverge from freeze tests (`http/page.test.ts`, `catalog/page.test.ts`). Fix those tests as part of this change, do not revert four-pack ids.

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W1-D-01 | 0 | — |
| W1-D-02 | 0 | — |
| W1-D-03 | 1 | D-01, D-02 |
| W1-D-04 | 2 | D-03 |
| W1-D-05 | 2 | D-03 |
| W1-D-06 | 1 | D-02 |
| W1-D-07 | 2 | D-06, S-01 |
| W1-D-08 | 1 | D-02 |
| W1-D-09 | 2 | D-08 |
| W1-D-10 | 1 | D-02 |
| W1-D-11 | 1 | D-02 |
| W1-D-12 | 2 | D-04, D-05, D-08, D-10, D-11 |
| W1-D-13 | 3 | D-04…D-12 |
| W1-V | 3 | D-13 |
