## Context

See `proposal.md` Why. Widget `chips` and `chipFixture` already exist. In-flight `docs-playground` still owns `/playground` → `/playground/github` and github `PlaygroundShell` in `apps/docs/app/playground/layout.tsx`. This change MUST NOT edit that folder or that layout. Exclusive apply files: `openspec/changes/add-http-chips-playground/**`, `apps/docs/AGENTS.md`, `apps/docs/src/preview/types.ts`, new `apps/docs/app/playground/http/**`, catalog tests that lock `PREVIEW_PLUGIN_IDS`, and `types.test.ts` if plugin-id assertions belong there. `PLAYGROUND_PLUGIN` stays `"github"`.

Constraints: Node 24, pnpm, Vitest 4, Biome 2.5, Takumi via `@profile-bits/renderer` only (already used by chips). Zero live network in tests. Never unauthenticated GitHub. No new plugin/integration ids.

## Goals / Non-Goals

**Goals:**

- Ship `/playground/http` as a small server-rendered chips explorer using `chipFixture` + `renderChipsFromPayloads` / `renderChipsSvg`.
- Append `http` to `PREVIEW_PLUGIN_IDS` without widening github `PREVIEW_WIDGET_IDS` or changing catalog/landing.
- Keep secrets out of permalinks (`http_token_env` / `http_token` already in `PREVIEW_TOKEN_QUERY_KEYS`).

**Non-Goals:**

- New plugin or integration ids; live vendor fetches; proxying shieldcn/shields images.
- Adding `chips`/`json` to `PREVIEW_WIDGET_IDS` or teaching `render-preview.ts` http widgets.
- Changing `/playground` landing redirect or putting `/playground/http` in landing `page.tsx`.
- Editing `docs-playground`, `add-http-json-integration`, `packages/action/src/main.ts`, core types, engine, Chip.tsx, plugins index, `action.yml`, `pnpm-lock.yaml`.
- Replacing github `PlaygroundShell` (parent layout stays).

## Decisions

### 1. New capability, do not rewrite in-flight playground spec

- **Choice:** ADDED `http-chips-playground`. Do not MODIFIED-delta `openspec/specs/` widget/plugin/integration contracts. Do not edit `openspec/changes/docs-playground/`.
- **Why:** Chips widget already exists. Docs-playground still claims github routes and is not archived. A second ADDED `playground` would collide on archive.
- **Alternative:** MODIFIED in-flight playground routes requirement — rejected; exclusive glob forbids that folder.

### 2. Server page + local widget ids; do not widen github preview unions

- **Choice:** `apps/docs/app/playground/http/page.tsx` is a server page (`data-slot`) that reads GET search params and renders fixture SVG. Local `HTTP_PLAYGROUND_WIDGET_IDS = ["json", "chips"]` (explorer focuses chips). `PREVIEW_WIDGET_IDS` stays `demo|stats|languages` so `render-preview.ts` github typing stays intact. Do not edit `render-preview.ts`.
- **Why:** POST `/api/preview` remains github widgets. Http preview is local, no client fetch.
- **Alternative:** Add chips to `PREVIEW_WIDGET_IDS` — rejected; explodes github widget unions. Alternative: client fetch to `/api/preview` — rejected; would need http preview typing or live URLs.

### 3. Fixture payloads, never expander URLs

- **Choice:** Selected `(preset, type[])` maps to `chipFixture(preset, type)` then `renderChipsFromPayloads`. Package/repo/workflow are yaml fields only; they MUST NOT trigger `expandChipsRequest` or `fetch`. Dual pane: layout SVG + README pane of the same baked bytes (data URL), 480×160.
- **Why:** Expander URLs are live CDN targets. Docs AGENTS: zero live URLs.
- **Alternative:** Call expander and GET JSON in docs — rejected.

### 4. Append preview plugin id; catalog index 0 stays github

- **Choice:** `PREVIEW_PLUGIN_IDS = ["github", "http"]`. `CATALOG_PLUGIN_ID = PREVIEW_PLUGIN_IDS[0]` remains github. `PLAYGROUND_PLUGIN = "github"` in codegen constants. Landing still `redirect("/playground/github")`.
- **Why:** Append, do not replace. Catalog tests keep github pack widgets.
- **Alternative:** Replace ids with `["http"]` — rejected.

### 5. Http explorer chrome sits in the existing playground children slot

- **Choice:** Do not add a nested layout that unwraps `PlaygroundShell`. The http page is a self-contained explorer (tuners + dual pane + yaml/README rail) as the github layout `children`. Tests import the http page module, not the parent layout.
- **Why:** `apps/docs/app/playground/layout.tsx` is not in the exclusive glob.
- **Alternative:** Move http outside `/playground` — rejected; `httpPlugin.docsPath` is `/playground/http`.

## Risks / Trade-offs

- [Parent github PlaygroundShell still wraps `/playground/http`] → Accepted; exclusive glob cannot change layout. Page tests isolate the explorer module.
- [POST `/api/preview` accepts `plugin: "http"` after id append] → Keep github widget union; do not route chips through `render-preview.ts`. Http page never POSTs preview.
- [Fixture JSON `link` fields contain npmjs/github URLs] → Do not dump fixture JSON into HTML; render baked SVG only; ignore `link`/`href` (already widget policy).
- [Landing test forbids `/playground/http` in `page.tsx`] → Do not add that string to the landing file.
- [Catalog test equals `["github"]`] → Update that assertion only; catalog remains github pack.
- [Live CDN in CI] → Spy `fetch` unused; assert source has no shieldcn.dev / img.shields.io fetch targets.

## Migration Plan

Additive docs route. Default github playground unchanged. Rollback: delete `apps/docs/app/playground/http/**`, revert `PREVIEW_PLUGIN_IDS` to `["github"]`, restore AGENTS.md freeze. Do not archive or commit unless asked.

## Open Questions

(none — fixtures-only explorer, plugin id append, local widget ids, and landing lock are decided)
