## 1. t0 presets, client, theme, plugin, agents, compose

- [x] 1.1 T-presets-seg exclusive `packages/integrations/src/http/presets.ts` + `presets.test.ts`. Reject whole-segment `""` / `.` / `..` on package, owner, repo; exact `.` / `..` workflow. Keep `@scope/name`, `next.js`, `ci.yml`. `forbidden_path` on `ChipsExpandErrorCode` in presets.ts, not `types.ts`. Do not overload `forbidden_origin`. FORBIDDEN: `ssrf.ts`, `types.ts`, prefix identity.
- [x] 1.2 T-presets-url same glob. After `new URL(pathname, origin)` require `url.pathname === pathname` (exact equality, not a prefix), empty search/hash. Happy URLs hostname `shieldcn.dev` | `img.shields.io`.
- [x] 1.3 T-presets-deny same glob. Deny-prefix belt (`/badge`, `/endpoint`, `/https/`, `/memo`, `/discord`, `/reddit`, `/nba`, `/views`, `/watchers`) is not the only check.
- [x] 1.4 T-presets-happy same glob. Keep existing tables (`react`, `vercel/next.js`, `@scope/name`, `release.yml`, `octocat/hello-world`). Happy URLs have empty search/hash. Zero network.
- [x] 1.5 T-presets-adv same glob. Adversarial: `../badge/dynamic/json`, `../../badge/dynamic/json`, `foo/../bar` (must not silently fetch `bar`), `@scope/../../badge/dynamic/json`, `repo: ../hello`, owner `..`, workflow `.` / `..`, shields ci `repo: ".."`, `%2e%2e` stays encoded (not `/badge`).
- [x] 1.6 T-client-type exclusive `packages/integrations/src/http/client.ts` + `client.test.ts`. `HttpJsonRequest.auth?: "none"`; json callers that omit `auth` typecheck. Queue if http_client_findings holds `client.ts`. Do not edit `auth.ts` / `cache.ts` / integrations `index.ts`. Pack `INTEGRATION_AUTH.http` stays `"optional"`.
- [x] 1.7 T-client-skip same glob. `request.auth === "none"` **before** the missing-token throw.
- [x] 1.8 T-client-cache same glob. Per-request `auth: "none"` + `authorization: undefined`; json omit keeps client-level bearer/missing. Cache auth is per request, not the `createHttpClient` closure.
- [x] 1.9 T-client-hops same glob. No `Authorization` on hop 0 or hop 1 when `auth: "none"`.
- [x] 1.10 T-client-tests same glob. token + none → no header; `token: ""` + none still GET; omitted auth + empty token still `fail_widget` and **no GET**; json + token still Bearer; same URL default then none → two cache keys / two GETs; redact still holds. Zero live network.
- [x] 1.11 T-theme-ctx exclusive `packages/plugins/src/http/widgets/chips/index.ts` + `index.test.ts`. Optional `ctx.theme`. Not `load.ts` / `widget.tsx` / `accept.test.ts`.
- [x] 1.12 T-theme-pass same glob. `renderChipsSvg({ badges, theme: ctx.theme })`.
- [x] 1.13 T-theme-test same glob. Light vs dark SVG differ; keep `{ user: "vercel" }` 404 wrap test.
- [x] 1.14 T-plugin-bits exclusive `packages/plugins/src/http/plugin.ts` + `plugin.test.ts`. `HTTP_BITS_USED = ["Theme","Frame","Muted","Chip"]`; widgets still `["json","chips"]`. Do not restyle chips onto `Row`.
- [x] 1.15 T-plugin-test same glob. Replace Stack/Row/Text expectation.
- [x] 1.16 T-agents-int exclusive `packages/integrations/AGENTS.md`. Drop playground freeze; keep fixtures-only / zero live URLs.
- [x] 1.17 T-agents-action exclusive `packages/action/AGENTS.md`. Ports names chips in compose (not `render.ts`).
- [x] 1.18 T-agents-docs exclusive `apps/docs/AGENTS.md`. Drop “in this change” on rss-no-route.
- [x] 1.19 T-compose-route exclusive `packages/action/src/render-widgets.ts` **only**. `json || chips` → `adapters.json`; stats still github; feed unchanged. **No tests in this glob.** Do not rename `adapters.json`. Do not add a `chips:` compose key. MUST NOT edit `main.ts`.

## 2. t1 load and adapter

- [x] 2.1 T-load-auth exclusive `packages/plugins/src/http/widgets/chips/load.ts` + **new** `load.test.ts` (after 1.6–1.10). `fetchJson({ url, timeout_ms, auth: "none" })` and **no** `headers`. Do not edit `index.test.ts`.
- [x] 2.2 T-load-wrap same glob. Keep `toChipsWidgetError`; `ChipsWidgetError` first; do not wrap twice.
- [x] 2.3 T-load-test same glob. Mock `fetchJson` called with `auth: "none"` and no `headers`; 404/expand → `ChipsWidgetError` not raw `HttpClientError`; recorded GET has `Authorization === undefined` when client has a token.
- [x] 2.4 T-adapter-branch exclusive `packages/action/src/render-http.ts` + `render-http.test.ts` (after 1.11–1.13 ∧ 1.19). Chips **before** `jsonOptions`; `chipsOptions`: `id === "chips"` and `"preset" in options`. MUST NOT edit `main.ts` / `engine.ts` / `render.ts`.
- [x] 2.5 T-adapter-call same glob. user `?? ""`; `theme: request.theme` (not `resolveWidgetTheme`); filename is `filename.format` only (no `-dark`).
- [x] 2.6 T-adapter-catch same glob. `ChipsWidgetError` → `fail_widget`; json catch unchanged (`JsonWidgetError || HttpClientError`).
- [x] 2.7 T-adapter-json same glob. Json tests bit-identical (headers, empty token, `HttpClientError` → `fail_widget`).
- [x] 2.8 T-adapter-chips-200 same glob. 480×160, injected fetch, path `chips.svg`. Happy URLs only (`react`, `vercel/next.js`). Do not put `../badge` cases here.
- [x] 2.9 T-adapter-chips-404 same glob. `outcome === "fail_widget"`, does not throw.
- [x] 2.10 T-adapter-compose same glob. Extend existing `describe("composeRenderWidgets")`: chips → json adapter spy; stats → github; feed unchanged. Do not create `render-widgets.test.ts`.
- [x] 2.11 T-adapter-engine same glob. `runEngine` + real compose + stub github: json then chips 404 does not drop json writes (proves P0 without Octokit).
- [x] 2.12 T-adapter-theme same glob. `theme: "light"` forwarded.
- [x] 2.13 T-adapter-unhandled same glob. stats still `UnhandledHttpWidgetError`; chips must not.

## 3. t2 mainhttp (http-only `runMain`)

- [x] 3.1 T-main-chips-200 exclusive `packages/action/src/main-http.test.ts` only (after 2.4–2.13 ∧ 1.19 ∧ 2.1–2.3 ∧ 1.6–1.10). Chips-only yaml writes `chips.svg`. MUST NOT edit `main.ts`. Do not add mixed github stats via `runMain`.
- [x] 3.2 T-main-404 same glob. Chips-only 404 → `EngineError` `fail_job` unless `allow_skipped` — **not** `UnhandledActionWidgetError`.
- [x] 3.3 T-main-json-chips same glob. json+chips both 200 write both files.
- [x] 3.4 T-main-auth same glob. `http_token_env` set: chips GET **MUST NOT** have `Authorization`; json GET **MUST** still send `Bearer`.
- [x] 3.5 T-main-empty-env same glob. Named empty env: chips still GET; json still `fail_widget`. Cause-walk must not leak the client token.

## 4. t3 verify

- [x] 4.1 T-verify `just lint && just test && just generate-action --check`. Fix on **owning** glob only. Confirm `main.ts`, `render.ts`, `engine.ts`, `types.ts`, `ssrf.ts`, `action.yml`, lockfile, `openspec/changes/add-http-json-integration/**`, `openspec/changes/add-http-chips-widget/**`, and `openspec/specs/**` were not edited. Pack `INTEGRATION_AUTH.http` still `"optional"`. No commit unless asked.
