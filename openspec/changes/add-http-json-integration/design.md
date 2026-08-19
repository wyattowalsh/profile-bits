## Context

See `proposal.md` Why. Synced contracts freeze first-party ids without `http`. Sibling in-flight changes (`add-rss-feed-integration`, `add-wakatime-integration`) already MODIFY the same three capabilities and may already have unfrozen `types.ts` for `rss`/`feed` and `wakatime`/`coding`. This change **adds** `http` additively: never replace id arrays with `["github","http"]`; never write “github and http only”. `packages/integrations/src/rss/` and `packages/renderer/src/index.ts` may already exist — do not clobber them. `decideAllGithubWidgetsSkipped` filters via `WIDGET_INTEGRATIONS[widgetId]` including `"github"`; json must not join that rule.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Takumi 2.9.2 via `@profile-bits/renderer` only, Zod 4.4.3 already in catalog, Vitest 4, Biome 2.5. Thin `action.yml`. Never REST `/languages`. Never unauthenticated GitHub. No `plugin_http` Action bool. No flattened `plugin_<plugin>_<widget>_<option>` inputs. No extra `undici` or `p-retry`.

## Goals / Non-Goals

**Goals:**

- Ship first-party pack `http` (widget `json`, integration `http`) enabled only by yaml `plugins.http`.
- Implement injectable `createHttpClient({ fetch, lookup, token })` with SSRF (ssrfcheck + ipaddr unicast), single-flight cache, 1 MiB cap, BOM-strip JSON, local 3-attempt backoff.
- Keep github v0 widgets, `DEFAULT_YAML`, `plugin_github`, and GitHub classifiers unchanged. Thin `action.yml` gains only `http_token_env`.
- Prove the 480×160 card with fixture JSON and renderer `container`/`text`/`style` re-exports.
- Wire json through the Action: `enabledWidgets` collects json independently of github; `main.ts` (or adapter) injects one `createHttpClient({ token })` `renderWidget` per run; `engine.ts` stays a port (no HTTP).

**Non-Goals:**

- POST/PUT, extra first-party plugins.
- Flattened Action inputs, `plugin_http` bool, consumer or repo `README.md` patches.
- GitHub crawl/render (`createGithubClient`, stats/languages crawl), `/playground/http` UI, live docs URL fetch, `packages/bits`.
- rss `feed` / wakatime `coding` Action wiring in this change (leave sibling `feed` enablement if already present; do not add `coding`).
- Extra `undici` / `p-retry` / MSW. Changing `packages/renderer/src/render-svg.ts`. Applying other in-flight OpenSpec folders.

## Decisions

### 1. MODIFIED three-layer deltas, not a new capability

- **Choice:** Delta `plugin-contract`, `widget-contract`, and `integration-contract`. No fourth capability. Catalog text **adds** `http`. It MUST NOT say “github and http only”.
- **Why:** An exclusive catalog would delete `rss` (and `wakatime`) on archive. Http is a pack/widget/integration, not a new layer.
- **Alternative:** New `http-json` capability — rejected; would fork the three-layer model. Alternative: “github and http only” — rejected; fights sibling packs.

### 2. Yaml-only enablement; no pack defaults; types.ts is additive

- **Choice:** Off unless yaml `plugins.http` is present. `plugins.http: {}` parses and enables **zero** json widgets (unlike rss, which requires feed url at pack presence). Json on only when `plugins.http.widgets.json` is present. Missing `url` fails parse. `http://` fails parse (`z.url({ protocol: /^https$/ })`, protocol regex **without colon**). Unknown keys fail (`z.strictObject`). `DEFAULT_YAML` stays github-only; optional `http` is additive on `PluginsConfigSchema`.
- **Exclusive file:** [`packages/core/src/types.ts`](packages/core/src/types.ts) only for B1. **Read first.** If `rss`/`feed` (or `wakatime`/`coding`) already exist, **append** `http`/`json`/`http`; never replace arrays with `["github","http"]`.
  - `FIRST_PARTY_PLUGIN_IDS += "http"`
  - `FIRST_PARTY_WIDGET_IDS += "json"`
  - `FIRST_PARTY_INTEGRATION_IDS += "http"`
  - `INTEGRATION_AUTH.http = "optional"`
  - `WIDGET_INTEGRATIONS.json = ["http"]`
  - Constants: `JSON_FILENAME_DEFAULT`, `JSON_JMESPATH_DEFAULT = "@"`, `JSON_TIMEOUT_MS_DEFAULT = 10000`, `JSON_TIMEOUT_MS_MAX = 20000`, `JSON_TIMEOUT_MS_MIN = 1`, `JSON_METHOD = "GET"`, `JSON_ANIMATE_DEFAULT = false`, `HTTP_RESPONSE_MAX_BYTES = 1048576`
  - `JsonOptionsSchema` strictObject; url required; headers optional record + superrefine; `JSON_OPTION_DEFAULTS` without url
  - `HttpWidgetsConfigSchema` / `HttpPluginConfigSchema`; `PluginsConfigSchema` optional `http`
  - `ActionInputsSchema.http_token_env` optional string
  - Freeze comment: post-v0 exceptions are whatever ids are in the array (github + http [+ rss/wakatime if present])
- **Why:** User forbade http pack defaults. Rss fails empty pack because feed url is required at presence; copying that would auto-enable json.
- **Alternative:** `plugin_http` Action bool — rejected. Alternative: flatten `plugin_http_json_url` — rejected; `--check` must fail that name.

### 3. Client layout: package-level cache + http module; collision protocol with rss

- **Choice:**
  - Client: `packages/integrations/src/http/` (`client.ts`, `ssrf.ts`, `headers.ts`, `auth.ts`)
  - Package-level cache: `packages/integrations/src/cache.ts` (RSS keeps `src/rss/cache.ts`; do not edit it; later github T111a should import shared cache)
  - Widget: `packages/plugins/src/http/widgets/json/` (`index.ts`, `template.ts`, `jmes.ts`) plus pack `packages/plugins/src/http/plugin.ts`
  - Barrels: merge additively if rss already exported (`packages/integrations/src/index.ts`, `packages/plugins/src/index.ts`)
- **Lock:** `createHttpClient({ fetch, lookup, token })` one instance per Action / playground / generate preview run. Production `createHttpClient({ token })` omits `fetch` (pinned `https.request`; never `fetch: globalThis.fetch`). Lookup MAY still default to `dns.promises.lookup`. Injectable `fetch`/`lookup` are test-only. Pin-path tests MUST mock `node:https.request` and MUST use zero live network. Order: token decision → cache/single-flight → ssrf → GET (`redirect: "manual"`) → hops → size cap → BOM-strip `JSON.parse` → `classifyHttp` → backoff. Http module MUST NOT import octokit.
- **Identity:** `defaults.widgets: ["json"]` is metadata only vs yaml apply no-op. `docsPath: "/playground/http"`. `bitsUsed` string literals `Theme/Frame/Stack/Row/Text/Muted` (do not create `packages/bits`).
- **Why:** Matches github: widgets consume cached payloads. Shared cache is for http (and later github), not a rewrite of rss. Yaml extra headers MUST be forwarded on GET and MUST be part of the cache key so two GETs to the same URL with different headers cannot share a body. Required `Accept` and `User-Agent` MUST win over yaml extras of those names (any casing); the cache key MUST stay the yaml headers, not the merged wire headers.
- **Alternative:** Extra undici + MockAgent — rejected; fights Node 24 global fetch and Action ncc. Alternative: steal `rss/cache.ts` — rejected; do not modify rss modules.

### 4. JMESPath in the widget, not the client

- **Choice:** Catalog pin `@jmespath-community/jmespath@1.3.0`. Widget calls `search()` only. No eval. No user JS. Client returns parsed JSON. Empty after **successful** search (`null`/`undefined`/`""`/`[]`/`{}`) → “No data”. `0` and `false` render. Invalid jmespath → `fail_widget` not skip. Truncation: keys 16 chars, values 48 chars, max 3 object rows; hostname muted label or `"JSON"`.
- **Why:** Classic `jmespath@0.16.0` is unmaintained. Fetch none in the widget (`vi.spyOn(globalThis, "fetch")` unused).
- **Alternative:** Client-side jmespath — rejected; two widgets could not share one GET then diverge expressions.

### 5. SSRF: ssrfcheck then ipaddr allow-unicast; no extra undici

- **Choice:** Catalog pins `ssrfcheck@1.4.0` and `ipaddr.js@2.5.0` (reuse if rss already added ipaddr). `assertSafeHttpUrl` + `assertSafeResolvedAddresses`. Order: `isSSRFSafeURL(url, { allowedProtocols: ["https"], allowUsername: false })` → ipaddr `parse` / `range()` / `isIPv4MappedAddress()` / `toIPv4Address()` → **allow only `unicast` after mapping**. `lookup({ all: true })`; **any** non-unicast fails closed (mixed A/AAAA). Pin IPs into connect lookup; TLS `servername` = original host. `redirect: "manual"`, max 5 hops, reject https→http, re-validate each `Location`, cancel or destroy the 3xx body before following `Location`. Abort if `Content-Length` or accumulated (decompressed) body > 1 MiB. Metadata hostnames: `metadata.google.internal`, `metadata.internal`, `169.254.169.254`. RFC1918 is `192.168.0.0/16` not `/8`.
- **Why:** ssrfcheck covers localhost names, octal/decimal IPs, userinfo, dot-domains — not DNS, not redirects. ipaddr encodes private ranges correctly. Hand-rolled denylist can get `/8` wrong.
- **Alternative:** Extra undici — rejected. Alternative: `private-ip` / `is-ip` — superseded. Alternative: Zod `z.httpUrl()` — rejected; allows `http`.

### 6. HTTP backoff terminal outcome is `fail_widget`

- **Choice:** Local 3-attempt backoff (200/400/800ms, honor `Retry-After` capped at 10s). 401/404 → `fail_widget` no retry; 403/429/5xx → retry then `fail_widget`; 2xx non-JSON → `fail_widget` no retry; JSON/jmespath throw → `fail_widget` not skip; timeout/SSRF → `fail_widget`. `classifyHttp` in auth-policy; never reuse `classifyGithubHttp`. Do **not** change github classifiers. Do **not** fold http into `decideAllGithubWidgetsSkipped`. `usesGithubIntegration` stays github-only. Job-level: json is the **only** enabled widget and outcome is non-render and `allow_skipped` is false → `fail_job` via `decideHttpOnlyRunFailed`. Tests: `minTimeout` 0 / fake timers, no 1.4s sleeps.
- **Why:** GitHub fail-after-backoff fails the **run**. Applying that to JSON would let a TryHackMe 503 fail github `stats`. `p-retry` default 10 retries / 1s minTimeout blows a 10–20s widget budget.
- **Alternative:** `p-retry` / `cockatiel` — rejected; Action bundle + wrong budget. Alternative: `fail_run` like github 429 — rejected.

### 7. Token: env name, Bearer vs raw, redact secrets

- **Choice:** Thin input `http_token_env` is an env **name**. Unset/whitespace name → no `Authorization`. Name set + empty/whitespace value → `fail_widget`. `createHttpClient({ token: "" })` (empty/whitespace string) MUST also `fail_widget` and MUST NOT send an unauthenticated GET; unset/`null` token still sends no `Authorization`. Name set + value → `Bearer ${value}` unless value already has scheme `Bearer`/`token`/`Basic` (case-insensitive prefix) then send raw. Forbidden yaml headers: `Authorization`, `Cookie`, `Set-Cookie`, `Proxy-Authorization`, names `/token/i`, values `/^(Bearer|token|Basic)\s/i`. `packages/core/src/redact.ts` strips Authorization values (including `token` scheme) and env secrets from error strings; barrel `export * from "./redact.js"`. Never log token values. User-Agent `profile-bits-http/0`; `Accept: application/json`. One `AbortSignal.timeout(timeout_ms)` per `httpGet` attempt covering DNS + hops + body.
- **Why:** Optional auth ≠ send Authorization. Value never in yaml.
- **Alternative:** Store token in yaml — rejected.

### 8. Renderer: extend existing exports; plugins never import Takumi

- **Choice:** If `packages/renderer/src/index.ts` is missing, create `renderSvg` stub. If present (rss stub), **extend exports only** — re-export `container`/`text`/`style` from `@takumi-rs/helpers`; do not clobber rss `renderSvg`. Shared `renderSvg` already passes `images: []`, which is the Takumi 2.9.2 remote-image block (no remote bytes). `{ allowUrl: false }` is **not** a valid Takumi 2.9.2 option. Do **not** change `packages/renderer/src/render-svg.ts` in this change (rss/github/json all call it). Register Geist WOFF2 from `packages/renderer/fonts/` (no `googleFonts`). Hex palettes in `packages/renderer/src/themes.ts` (dark/light, seven tokens). Plugins stay TS object nodes; no React/JSX in `@profile-bits/plugins`. Plugins never import `takumi-js` / `@takumi-rs/*`.
- **Why:** Both rss and http want `renderer/src/index.ts`. Exclusive-writer protocol: extend, do not replace. Empty `images: []` already blocks `<image src>` SSRF without a shared-renderer rewrite.
- **Alternative:** Takumi JSX in plugins — rejected. Alternative: invent yaml theme keys — rejected; core has token names only. Alternative: `images: { allowUrl: false }` — rejected; not in Takumi 2.9.2 types.

### 9. Catalog pins, vitest configs, AGENTS.md exception

- **Choice:** [`pnpm-workspace.yaml`](pnpm-workspace.yaml) catalog `ipaddr.js: "2.5.0"` (no-op if rss already added it), `ssrfcheck: "1.4.0"`, `@jmespath-community/jmespath: "1.3.0"`. Integrations deps: `workspace:*` core, catalog ipaddr.js + ssrfcheck, keep octokit (http module MUST NOT import octokit). Plugins deps: workspace core + renderer + integrations, catalog jmespath-community. Align plugins tsconfig with core `allowImportingTsExtensions`; keep `.js` specifiers. `pnpm install` once after catalog edit.
- **AGENTS.md (six files after types exist):** root, core, integrations, plugins, action, docs. Http exception; never-unauth GitHub unchanged; docs fixtures only. If rss is already mentioned, keep it and add http.
- **Docs:** no `/playground/http` UI. Add `http_token_env` and `http_token` to `PREVIEW_TOKEN_QUERY_KEYS` only. Do **not** add http to `PREVIEW_PLUGIN_IDS`.
- **Do not** edit repo `README.md`. Do not add npm/yarn scripts.
- **Why:** Next agent will revert the schema unless AGENTS.md is updated in the same apply.
- **Alternative:** Leave AGENTS.md github-only — rejected.

### 10. Exclusive-glob apply graph (B0–B5)

- **Choice:** One writer per file. Same-file edits sequential. Never two agents on `types.ts`, `auth-policy.ts`, `action-yml.ts`, `action.yml`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `packages/renderer/src/index.ts`, `packages/renderer/src/render-svg.ts`, `packages/integrations/src/index.ts`, `packages/action/src/engine.ts`, `packages/action/src/main.ts`.
- **Waves:** B0–B5 library apply and §8 Action json wiring already landed (`tasks.md` §1–§8 stay ticked). Remaining apply is `tasks.md` §9 (HTTP client timeout, pin tests, redirects, headers). No commit.
- **Why:** cache/ssrf/renderer/headers did not need `types.ts` and ran with B1. Remaining work is `tasks.md` §9 HTTP client findings, not a second change.
- **Alternative:** Serialize all apply — rejected; wastes the disjoint globs. Alternative: start a second OpenSpec change for `engine.ts`/`main.ts` — rejected; json Action wiring belongs in this catalog add.

### 11. Action wires json only; engine stays a port

- **Choice:** This change wires **json only** through the Action.
  - `engine.ts` stays a fetch/render **port**: no HTTP, no `createHttpClient`, no integrations/plugins imports. `EnabledWidget` += `{ id: "json"; options: JsonOptions }`. `enabledWidgets` collects github widgets if present **and** `config.plugins.http?.widgets?.json` if present. **No** early `return []` when github is absent.
  - `preflightWidget`: `json` (and existing `demo` / `feed` if a sibling already added `feed`) → `"render"`; do not read `include_private` on json.
  - After the widget loop: keep `decideAllGithubWidgetsSkipped`. Then `decideHttpOnlyRunFailed({ widgets: outcomes, allowSkipped })`. If `"fail_job"`, throw `EngineError` with `"fail_job"`. Throw `fail_widget` only when a **github** widget is `fail_widget`. Json `fail_widget` in a mixed run MUST still write successful github blobs.
  - New adapter [`packages/action/src/render-http.ts`](packages/action/src/render-http.ts): `createHttpRenderWidget({ client })`. Json → `renderJsonFromClient`; map `JsonWidgetError` / `HttpClientError` → `outcome: "fail_widget"` (never `fail_run`). Compositor `composeRenderWidgets({ json, github? })`: json ids → json adapter; other ids → github stub or the existing “not injected” `EngineError`. Production `main` passes json only.
  - [`packages/action/src/main.ts`](packages/action/src/main.ts) (or the adapter it constructs) looks up `process.env[inputs.http_token_env]` (raw env, not `INPUT_*`), constructs **one** `createHttpClient({ token })` per `runMain` with **no** `fetch` (pinned GET; never `fetch: globalThis.fetch` in production), and injects `renderWidget: composeRenderWidgets({ json: createHttpRenderWidget({ client }) })`. Unset/whitespace name → no `Authorization`. Named empty/whitespace env → `fail_widget`. `github_token` still required (`decideActionToken`).
  - Injectable `fetch`/`lookup` only in tests via an optional `RunMainOptions` seam (`httpFetch?`, `httpLookup?`).
- **Out of scope here:** rss `feed` / wakatime `coding` wiring in this change (do not add `coding`; do not introduce rss HTTP here; if `feed` is already in `enabledWidgets` from `add-rss-feed-integration`, leave it). GitHub `createGithubClient` / stats/languages crawl. `/playground/http` UI. Env-name allowlist (reject `GITHUB_TOKEN` as `http_token_env`) — accepted security residual.
- **Why:** Http-only production yaml cannot run while `enabledWidgets` omits json. Engine HTTP would break the port and fight ncc/`@takumi-rs/core` externalization. Sibling rss/wakatime changes own those packs; GitHub crawl belongs to `action-yml-public-api`.
- **Alternative:** Keep `engine.ts`/`main.ts` as a non-goal — rejected; json would never render from the Action. Alternative: HTTP inside `engine.ts` — rejected; engine is a port. Alternative: wire rss/wakatime in this change — rejected. Alternative: implement GitHub crawl/render here — rejected.

## Risks / Trade-offs

- [Exclusive “github and http only” catalog deletes rss on archive] → ADD `http`; never claim exclusivity.
- [types.ts clobber of rss/wakatime ids] → Read first; append only.
- [Renderer exclusive-file fight] → Extend exports; do not replace `renderSvg`.
- [DNS rebinding TOCTOU] → Pin validated IPs into connect lookup; TLS `servername` = original host.
- [Redirect to private or http] → `redirect: "manual"`, re-validate each hop, max 5, reject https→http.
- [IPv4-mapped / CGNAT / unique-local / 192.168/8 typo] → ipaddr.js allow-only-unicast after mapping; RFC1918 `/16`.
- [Mixed A/AAAA] → fail closed if any address is non-unicast.
- [Lying or missing Content-Length] → Cap accumulated decompressed bytes at 1 MiB.
- [BOM JSON] → Strip U+FEFF before `JSON.parse`.
- [JSON 503 fails github stats] → Terminal outcome `fail_widget`; do not import github classify; do not join all-skipped.
- [p-retry budget] → Local 3-attempt 200/400/800ms + Retry-After cap 10s.
- [Undici MockAgent misses global fetch] → Injectable `fetch`/`lookup`; `vi.fn`; zero live network.
- [Takumi `<image src>` SSRF] → `images: []` (Takumi 2.9.2 remote-image block). `{ allowUrl: false }` is not a valid option. Do not change `render-svg.ts`.
- [Http-only yaml never runs] → `enabledWidgets` collects json independently of github; inject `renderWidget` from `main.ts`.
- [JSON `fail_widget` fails mixed github+http] → Latch `fail_widget` throw for github widgets only; `decideHttpOnlyRunFailed` for http-only.
- [Live fetch from Action ncc] → Production `createHttpClient({ token })` omits `fetch` (pinned GET). Injectable `fetch`/`lookup` only in tests.
- [Engine grows HTTP] → Adapter + compositor; `engine.ts` stays a port.
- [Permalink round-trips secrets] → Add `http_token_env` / `http_token` to `PREVIEW_TOKEN_QUERY_KEYS`.
- [AGENTS.md freeze reverts types.ts] → Update six AGENTS.md files after types.
- [Flattened `plugin_http_json_url` sneaks in] → `BANNED_FLATTENED_INPUT_NAMES` += that name; `--check`.
- [Live URLs in playground] → Fixtures only; no `/playground/http` UI.
- [octokit imported from http] → http module must not import octokit; github crawl unchanged.

## Migration Plan

Greenfield additive pack. Default committed yaml stays github-only; existing consumers unchanged. Library apply and Action json wiring already landed (`tasks.md` §1–§8). Remaining apply follows `tasks.md` §9 (do not untick §1–§8). Catalog pins already present; `pnpm install` only if Action workspace deps change the lockfile. Rollback: omit `plugins.http` from yaml; delete this change folder before archive. Do not archive or commit unless asked.

## Open Questions

(none — SSRF libraries, backoff, cache location, types.ts append protocol, renderer `images: []`, empty-pack parse, and Action json-only port wiring are locked above)
