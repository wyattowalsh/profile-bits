## 1. Preview plugin id append

- [ ] 1.1 Exclusive: `apps/docs/src/preview/types.ts`. Append `"http"` to `PREVIEW_PLUGIN_IDS` so it equals `["github", "http"]`. Do **not** replace or reorder. Keep `PREVIEW_PLUGIN_ID` / `DEFAULT_PREVIEW_REQUEST.plugin` as `github`. Do **not** add `json` or `chips` to `PREVIEW_WIDGET_IDS`. Keep `http_token_env` and `http_token` in `PREVIEW_TOKEN_QUERY_KEYS`. Update the github-only comment so catalog vs http playground is accurate.
- [ ] 1.2 Update `apps/docs/app/generate/catalog/page.test.ts` so `PREVIEW_PLUGIN_IDS` equals `["github", "http"]` while `CATALOG_PLUGIN_ID` stays `github` and `CATALOG_WIDGET_IDS` stays `demo` / `stats` / `languages`. Do not add http widgets to the catalog page.
- [ ] 1.3 Extend `apps/docs/src/preview/types.test.ts`: assert plugin ids, `isPreviewPluginId("http")`, `isPreviewWidgetId("chips") === false`, and http token query keys remain denied. Keep `PLAYGROUND_PLUGIN` `"github"` (do not change `apps/docs/src/codegen/constants.ts` unless the union forces a compile).

## 2. Http playground explorer

- [ ] 2.1 Exclusive new `apps/docs/app/playground/http/**`. Server page at `/playground/http` (`data-slot`, no `use client`). Local `HTTP_PLAYGROUND_WIDGET_IDS = ["json", "chips"]` (explorer focuses chips). GET tuners: preset `shieldcn|shields`, type checkboxes, package/repo/workflow fields. Preview from `chipFixture` + `renderChipsFromPayloads` / `renderChipsSvg`. Dual pane baked SVG. Codegen rail: yaml `plugins.http.widgets.chips` + README `![](./profile-bits/chips.svg)`. Primary CTA Copy. FORBIDDEN: live vendor fetches; `expandChipsRequest`; adding chips to `PREVIEW_WIDGET_IDS`; editing landing `page.tsx`; editing `render-preview.ts`; editing `docs-playground`.
- [ ] 2.2 Update `apps/docs/AGENTS.md`: ALLOW `/playground/http` fixture UI; still zero live URLs; still no shieldcn/shields fetches; `PREVIEW_PLUGIN_IDS` includes `http`; do not add chips to github `PREVIEW_WIDGET_IDS`. Keep rss/wakatime fixture notes.

## 3. Tests and verify

- [ ] 3.1 New tests under `apps/docs/app/playground/http/`. Spy `fetch` unused. Page source MUST NOT contain `shieldcn.dev` or `img.shields.io` as fetch targets. Assert yaml rail, relative README embed, `data-plugin="http"`, local widget ids, baked SVG, zero outbound HTTP. Do not weaken `apps/docs/app/playground/page.test.ts` landing redirect.
- [ ] 3.2 `pnpm exec vitest run apps/docs/app/playground/http apps/docs/app/generate/catalog/page.test.ts apps/docs/src/preview/types.test.ts`. Confirm `PREVIEW_PLUGIN_IDS` is `["github", "http"]` and zero live URLs. Do not commit.
