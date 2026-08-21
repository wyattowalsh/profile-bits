## Why

Later sources (TryHackMe, custom JSON APIs) must not each get a first-party client. Consumers need one yaml-enabled generic HTTPS JSON widget so those sources can be rendered without flattening Action inputs or inventing a new pack per API.

## What Changes

- This change **adds** first-party pack `http` (widget `json`, integration `http`). GitHub v0 widgets (`demo`, `stats`, `languages`) stay unchanged. Do **not** invent further first-party packs in this change. Catalog wording **adds** `http`; it MUST NOT say “github and http only” (would fight sibling packs such as `rss` on archive).
- Pack off unless yaml `plugins.http` is present. **No** `plugin_http` Action bool. **No** yaml pack defaults: `plugins.http: {}` parses and enables **zero** json widgets. Json on only when `plugins.http.widgets.json` is present. Missing `url` fails parse.
- `url` is required, `z.url({ protocol: /^https$/ })` (protocol regex without colon). `http://` fails parse.
- Thin `action.yml` gains optional `http_token_env` (env **name**, default unset). Token **value** never in yaml or logs. `--check` rejects `plugin_http_json_url` and other flattened names.
- `http_token_env`: unset/whitespace name → no `Authorization`. Name set + empty/whitespace value → `fail_widget`. Name set + value → `Bearer ${value}` unless the value already has scheme `Bearer`/`token`/`Basic` (case-insensitive prefix) then send raw.
- Integration `http`: auth `optional` (optional ≠ send Authorization); shared injectable client; cache `(method, url, params, auth, headers)` with single-flight; SSRF https + DNS pin + no private redirects; 1 MiB body cap; HTTP matrix with `fail_widget` (never github `fail_run`).
- Widget `json`: fetch none; JMESPath `search` in the widget; empty after successful search → “No data”; invalid jmespath → `fail_widget`; `0`/`false` render; card 480×160 baked SVG still.
- Job-level: json is the **only** enabled widget and outcome is non-render and `allow_skipped` is false → `fail_job`. Do **not** change `decideAllGithubWidgetsSkipped`. Do **not** fold http into github skip-all.
- Action runtime (this change): wire **json only**. `engine.ts` stays a fetch/render port (no HTTP). `main.ts` or an adapter constructs **one** `createHttpClient({ token })` per run, looks up `process.env[http_token_env]` (raw env, not `INPUT_*`), and injects `renderWidget`. Unset/whitespace name → no `Authorization`; named empty/whitespace env → `fail_widget`. `github_token` still required (`decideActionToken`). This change MUST NOT wire rss `feed` or wakatime `coding`. GitHub crawl/render is not in this change.
- Playground: fixtures only; zero live URLs. No `/playground/http` UI this change. Add `http_token_env` and `http_token` to `PREVIEW_TOKEN_QUERY_KEYS` only.
- Do not patch consumer `README.md`. Do not touch GitHub crawl (never REST `/languages`, never unauthenticated GitHub). Do not edit in-flight OpenSpec folders. Do not change `packages/renderer/src/render-svg.ts` (`images: []` is the Takumi 2.9.2 remote-image block).

## Capabilities

### New Capabilities

- (none — http is a first-party pack/widget/integration on the existing three-layer contracts, not a fourth capability)

### Modified Capabilities

- `plugin-contract`: This change **adds** first-party id `http` (github pack unchanged). Yaml document shape MAY include optional `plugins.http` as a sibling. ADDED pack `http` (`widgets: [json]`, `integrations: [http]`), yaml-only enablement, no pack defaults, thin `http_token_env`, no `plugin_http` bool, forbid flattened `plugin_http_json_url`. Action runtime: `enabledWidgets` collects json independently of github; `main.ts` injects `renderWidget`; engine stays a port.
- `widget-contract`: ADDED widget `json` (integration `http` only; frozen options; fetch none; 480×160; “No data”; 404 fail widget; parse/jmespath errors fail widget not skip).
- `integration-contract`: ADDED integration `http` (auth optional; shared client; cache `(method, url, params, auth, headers)`; SSRF https + DNS + no private redirects; 1 MiB; timeout from widget; HTTP matrix with `fail_widget`). Do not rewrite GitHub crawl/matrix.

## Impact

- Specs: MODIFIED deltas under this change for `plugin-contract`, `widget-contract`, and `integration-contract`. After archive/sync those become the contract SSOT. Catalog text **adds** `http`; it does not claim exclusivity over other first-party ids.
- Code (library landed; remaining apply is Action json wiring): additive `packages/core/src/types.ts` (`http`/`json`/`http` appended; keep existing ids); `packages/integrations/src/http/**` plus package-level `src/cache.ts`; `packages/plugins/src/http/**`; renderer re-export extend; catalog pins `ipaddr.js` 2.5.0, `ssrfcheck` 1.4.0, `@jmespath-community/jmespath` 1.3.0; thin `http_token_env` via codegen; docs token-key denylist; AGENTS.md http exception. Remaining: Action `enabledWidgets` json + `decideHttpOnlyRunFailed`; `render-http` adapter; `main.ts` injects one `createHttpClient({ token })` and `renderWidget`. No extra `undici` or `p-retry`. No `plugin_http` on Action inputs.
- Out of scope: POST/PUT, RSS/WakaTime wiring in this change, extra plugins, consumer README, Nango/Composio, GitHub crawl/client/render, `plugin_http`, flattened `plugin_http_*`, live docs URL fetch, `/playground/http` UI, `packages/bits`, extra `undici`/`p-retry`, tagging `v1`, committing `dist/`, editing other in-flight OpenSpec change folders, changing `packages/renderer/src/render-svg.ts`.
