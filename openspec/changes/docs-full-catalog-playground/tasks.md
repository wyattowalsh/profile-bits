## 1. Contracts and ids

- [x] 1.1 Exclusive: `packages/core/src/codegen/docs-fields.ts` (+ tests/snapshot). Add playground field groups `coding`, `feed`, `json`, `chips` from existing Zod option schemas. Omit token fields. Do not add flattened Action inputs.
- [x] 1.2 Exclusive: `apps/docs/src/preview/types.ts` (+ tests). `PREVIEW_PLUGIN_IDS = ["github", "wakatime", "rss", "http"]`. Per-pack widget lists. Union `PREVIEW_WIDGET_IDS` for POST `widget`. Keep `PREVIEW_TOKEN_QUERY_KEYS`. Do not add `chips` to github ids.

## 2. Playground shell and codegen

- [x] 2.1 Exclusive: PlaygroundShell + permalink + schema-form + pack-emitter + export-workflow. Honor route plugin; selector lists four packs; yaml rails emit `plugins.<pack>`.
- [x] 2.2 Exclusive: `/playground/{wakatime,rss,http}` and `[widget]` routes. Fold http explorer into the shell (keep URL). Landing still redirects to github and MUST NOT mention other pack paths in that page source.

## 3. Preview render

- [x] 3.1 Exclusive: `render-preview.ts` (+ fixtures). Dispatch `coding` / `feed` / `json` / `chips`. Non-empty fixtures default. Optional live via App token / WakaTime preview env / SSRF clients. GET preview stays rejected. Never unauth GitHub.

## 4. Catalog / library

- [x] 4.1 Exclusive: `/generate/catalog`, `/generate/widgets`, `/generate/{wakatime,rss,http}` (+ widget pages). All packs and eight widgets. bitsUsed per pack.
- [x] 4.2 Exclusive: bits index shows samples (not names-only). `/generate/themes` from `NAMED_THEME_IDS` / `listFamilies`.

## 5. Honesty

- [x] 5.1 Exclusive: `DESIGN.md` + `apps/docs/AGENTS.md`. Catalog and playground are all four packs. Preview is not an embed API.
- [x] 5.2 Tests + `just generate-docs --check` after docs-fields snapshot. `just lint` / targeted vitest. Do not commit. Do not tag `v1`. Do not edit marketplace-release.
