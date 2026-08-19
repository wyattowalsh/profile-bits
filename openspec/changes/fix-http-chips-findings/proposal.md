## Why

Widget `chips` is already enumerated in `enabledWidgets`, but production compose plus the http Action adapter still miss a complete chips path: compose fallthrough used to send chips to the github dispatcher (`UnhandledActionWidgetError`), and `createHttpRenderWidget` still throws `UnhandledHttpWidgetError` before a chips branch. `runEngine` has no try/catch around `render()`, so that throw skips `writeFiles` and drops pending json/github blobs. At the same time the preset expander can walk `..` off `/npm` and `/github`, chips GETs can inherit the json Bearer token onto CDN hosts, and `renderChipsFromClient` can drop `request.theme`. Close those holes now; do not reopen `add-http-json-integration` or uncheck `add-http-chips-widget`.

## What Changes

- **P0 dispatch.** `composeRenderWidgets` MUST route `id === "json" || id === "chips"` to the existing `adapters.json` (reuse that key; do **not** rename it). `createHttpRenderWidget` MUST branch **chips before `jsonOptions`**. Call `renderChipsFromClient(client, options, { user: request.inputs.user ?? "", theme: request.theme })`. Adapter files MUST be `{ path: \`${options.filename}.${request.config.format}\`, contents: svg }` — **no** `-dark`. Catch `ChipsWidgetError` → `fail_widget`. Json catch stays `JsonWidgetError || HttpClientError`. Unknown ids still `UnhandledHttpWidgetError`. Mixed json+chips MUST NOT throw `UnhandledActionWidgetError`. This change **MUST NOT** edit `packages/action/src/main.ts`.
- **P1 path lock.** Expander MUST reject whole-segment `""` / `.` / `..` on package, owner, and repo (exact `.`/`..` workflow). Keep `@scope/name` (1 segment or 2 with first `@[^/]+`). After `new URL(pathname, origin)`, `url.pathname === pathname` (exact equality, not a prefix). Empty search/hash. Origin allowlist unchanged. Deny-prefix is belt-only. New code `forbidden_path` on `ChipsExpandErrorCode` in `presets.ts` (not `types.ts`). Do not overload `forbidden_origin`. SSRF checks MUST remain unchanged (`ssrf.ts` is forbidden).
- **P2 auth none.** `HttpJsonRequest.auth?: "none"`. `fetchJson` MUST skip the missing-token throw, set `authorization: undefined`, and key cache `"none"` when `request.auth === "none"`. Json callers that omit `auth` keep the existing throw + Bearer. `loadChipsPayloads` MUST always pass `{ url, timeout_ms, auth: "none" }` and **no** `headers`. Pack `INTEGRATION_AUTH.http` MUST stay `"optional"`. Do **not** set pack auth to `none`.
- **P2 theme.** `renderChipsFromClient` ctx MUST include optional `theme` and MUST pass it to `renderChipsSvg`. `{ user: "vercel" }` stays valid.
- **P3 pack metadata / AGENTS.** Http `bitsUsed` MUST be `["Theme","Frame","Muted","Chip"]`. Integrations AGENTS: keep fixtures-only / zero live URLs (drop playground-freeze wording). Action Ports: compose joins json **and** chips. Docs AGENTS: drop “in this change” on rss-no-route. No `DESIGN.md`.
- Do **not** edit `main.ts`, `render.ts`, `engine.ts`, `types.ts`, `ssrf.ts`, `action.yml`, the lockfile, `openspec/changes/add-http-json-integration/**`, `openspec/changes/add-http-chips-widget/**`, or `openspec/specs/**`.
- Do **not** catch renderer throws in `engine.ts`. Do **not** add a `chips:` compose key or a second `createHttpClient`. Do **not** put http ids in `render.ts`.

## Capabilities

### New Capabilities

- (none — chips already exists on pack `http` / integration `http`; this change closes Action dispatch, expander identity, per-request auth none, and theme forwarding)

### Modified Capabilities

- `integration-contract`: Exact path identity after URL resolution; `forbidden_path` (not `forbidden_origin`); chips `fetchJson({ auth: "none" })` with per-request cache/`Authorization`; pack `http` auth stays `optional`; SSRF unchanged.
- `widget-contract`: Action http adapter renders chips; `request.theme` forwarded; filename is `filename.format` only; one type fail → entire `fail_widget` via `ChipsWidgetError`.
- `plugin-contract`: Compose routes chips to `adapters.json`; mixed json+chips MUST NOT throw `UnhandledActionWidgetError`; this change MUST NOT edit `main.ts`.

## Impact

- Specs: MODIFIED deltas under this change only for `plugin-contract`, `widget-contract`, and `integration-contract`. Do **not** edit `openspec/specs/**`. Do **not** reopen or uncheck `add-http-json-integration` or `add-http-chips-widget`.
- Code (apply later, not this planning change): exclusive globs from the locked graph — presets, http client `auth?: "none"`, chips load/theme, plugin `bitsUsed`, three AGENTS.md one-liners, `render-widgets.ts`, `render-http.ts`, `main-http.test.ts`. Json already injected in `runMain`; chips is missing from compose + `createHttpRenderWidget`, not from the Action entrypoint.
- Out of scope: `wire-action-renderers` beyond json/chips already in `main.ts`; chips in `render.ts`; live playground / `POST /api/preview` fetches; `url=` gadgets on chips yaml; renaming `adapters.json`; `INTEGRATION_AUTH.http = none`; extra flatten names; OpenSpec archive/sync; `DESIGN.md`; restyling chips onto `Row`; json 3xx Bearer-forward to other public hosts; mixed github via `runMain`; tagging `v1`; committing `dist/`; git commit.
