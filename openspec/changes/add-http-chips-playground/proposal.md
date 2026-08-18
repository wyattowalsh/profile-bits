## Why

Widget `chips` already exists on pack `http`, but docs still have no `/playground/http` explorer. Without this follow-on, visitors cannot tune preset/types and copy yaml/README from **fixture** chips, and `PREVIEW_PLUGIN_IDS` stays github-only even though `httpPlugin.docsPath` is `/playground/http`.

## What Changes

- Add a fixtures-only `/playground/http` chips explorer (preset `shieldcn|shields`, type checkboxes, package/repo/workflow fields). Preview MUST call `renderChipsFromPayloads` / `renderChipsSvg` with `chipFixture` JSON. **Zero live URLs.** No shieldcn.dev or img.shields.io fetches. No vendor image proxy.
- Append `http` to docs `PREVIEW_PLUGIN_IDS` (`["github", "http"]`). `CATALOG_PLUGIN_ID = PREVIEW_PLUGIN_IDS[0]` stays `github`. Do **not** add `chips`/`json` to github-only `PREVIEW_WIDGET_IDS`. Local `HTTP_PLAYGROUND_WIDGET_IDS` on the http page.
- Keep `http_token_env` and `http_token` in `PREVIEW_TOKEN_QUERY_KEYS`. Keep `PLAYGROUND_PLUGIN = "github"`. Landing `/playground` still redirects to `/playground/github` (do not put `/playground/http` in landing `page.tsx`).
- Codegen rail on the http page: yaml `plugins.http.widgets.chips` plus README `![](./profile-bits/chips.svg)`. Dual pane baked SVG from fixtures. Copy remains the primary CTA.
- Update `apps/docs/AGENTS.md`: ALLOW `/playground/http` fixture UI; still zero live URLs; still no vendor fetches.
- No new plugin or integration ids. Pack stays `http`, widget stays `chips`. Do not edit `docs-playground`, `add-http-json-integration`, Action `main.ts`, core `types.ts`, engine, Chip.tsx, plugins barrel, `action.yml`, or `pnpm-lock.yaml`. Prefer not to edit `render-preview.ts`.

## Capabilities

### New Capabilities

- `http-chips-playground`: Fixtures-only `/playground/http` chips explorer — preset/types tuners, baked Takumi SVG from `chipFixture`, yaml/README copy rail, `PREVIEW_PLUGIN_IDS` append `http`, github catalog unchanged, zero live vendor fetches. Dedicated docs-surface capability so this change MUST NOT rewrite in-flight `docs-playground` / `playground`.

### Modified Capabilities

- (none — do not MODIFIED-delta `plugin-contract`, `widget-contract`, `integration-contract`, or the in-flight `playground` spec. Chips widget and http integration already exist. This change is docs explorer + preview plugin id append only.)

## Impact

- Specs: ADDED `openspec/changes/add-http-chips-playground/specs/http-chips-playground/spec.md`. After archive/sync that becomes `openspec/specs/http-chips-playground/spec.md`. Do not edit sibling change folders.
- Code: `apps/docs/AGENTS.md`, `apps/docs/src/preview/types.ts` (`PREVIEW_PLUGIN_IDS` append), new `apps/docs/app/playground/http/**`, catalog test that locks `PREVIEW_PLUGIN_IDS`, optional `types.test.ts` assertions. `PLAYGROUND_PLUGIN` stays `"github"`.
- Out of scope: new plugin/integration ids; live shieldcn/shields fetches; adding chips to `PREVIEW_WIDGET_IDS`; changing landing redirect; `POST /api/preview` http widget typing; `packages/action/src/main.ts`; editing `openspec/changes/docs-playground/**` or `openspec/changes/add-http-json-integration/**`; tagging `v1`; git commit.
