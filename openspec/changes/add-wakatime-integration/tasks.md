## 1. Phase A OpenSpec artifacts

Ids are stable for subagent dispatch. `[P]` = parallel with siblings that do not share a glob. Exclusive: `openspec/changes/add-wakatime-integration/**`. FORBIDDEN during propose: `packages/**` product code, consumer README.md, git commit.

- [x] A1.1 `openspec new change "add-wakatime-integration"`
- [x] A1.2 Write `proposal.md` from instructions JSON
- [x] A2.1 `[P]` plugin-contract spec delta
- [x] A2.2 `[P]` widget-contract spec delta
- [x] A2.3 `[P]` integration-contract spec delta
- [x] A3.1 `design.md` (path split, SSRF, 202/302, GRS vs us, Hakatime native out of scope)
- [x] A4.1 `tasks.md` + `openspec status`

## 2. Wave B0 package scaffolds (`[P]`, no product logic)

- [x] B0.1 `[P]` integrations vitest + package.json deps (`environment: "node"`; depend on `@profile-bits/core`; keep octokit unused on this path). Exclusive: `packages/integrations/package.json`, `packages/integrations/vitest.config.ts`.
- [x] B0.2 `[P]` plugins vitest + package.json deps (`@profile-bits/core`, `@profile-bits/integrations`, `@profile-bits/renderer`). Exclusive: `packages/plugins/package.json`, `packages/plugins/vitest.config.ts`.
- [x] B0.3 `[P]` renderer vitest.config (`environment: "node"`). Exclusive: `packages/renderer/vitest.config.ts`.

## 3. Wave B1 independent (`[P]`)

- [x] B1.1 `[P]` `wakatime-schema.ts` + enum/auth maps in `types.ts`. Exclusive: `packages/core/src/types.ts`, `packages/core/src/wakatime-schema.ts`, `packages/core/src/index.ts`. Add `wakatime`/`coding`; `INTEGRATION_AUTH.wakatime = "required"`; `WIDGET_INTEGRATIONS.coding = ["wakatime"]`; `WAKATIME_PACK_DEFAULT_WIDGETS = ["coding"]`; `CodingOptionsSchema`; optional `PluginsConfigSchema.wakatime`; optional `ActionInputsSchema.wakatime_token` (no default). `usesGithubIntegration("coding")` must be false. Do not change github option defaults.
- [x] B1.2 `[P]` renderer singleton + Geist `registerFont` + `renderSvg`. Exclusive: `packages/renderer/src/**`, `packages/renderer/vitest.config.ts`. `@takumi-rs/core` + helpers; Geist WOFF2 300–800; `renderSvg` 480×160 baked still. No ImageResponse/wasm/googleFonts. Test opening svg tag 480×160 viewBox.
- [x] B1.3 `[P]` `assertSafeApiDomain` + `resolveStatsUrl` + SSRF tests. Exclusive: `packages/integrations/src/wakatime/api-domain.ts` (+ test). Tests: localhost, 127.0.0.1, ::1, http://x, https://x, x/path, x:443, user@x, 169.254.169.254, metadata.google.internal, wakatime.com official path, wakapi.dev compat path, api.wakatime.com compat path.
- [x] B1.4 `[P]` last_7_days + empty fixtures. Exclusive: `packages/integrations/src/wakatime/fixtures/*.json`. Non-zero totals with languages+editors+projects+operating_systems; empty zeros/arrays.

## 4. Wave B2 after B1 (`[P]`)

- [x] B2.1 `[P]` parse/config pack defaults + parse tests (github unchanged). Exclusive: `packages/core/src/config.ts`, `packages/core/src/parse-config.ts`, `packages/core/src/parse-config.test.ts`. `applyWakatimePackDefaults` when `plugins.wakatime` present and no widget list. Do not put wakatime into `DEFAULT_YAML` / `DEFAULT_YAML_OBJECT`. Tests: github default yaml unchanged; wakatime block parses; unknown include fails; `api_domain` injection fails parse; `plugins.wakatime: {}` → coding defaults; yaml with both github+wakatime.
- [x] B2.2 `[P]` `decideWakatimeToken` + tests. Exclusive: `packages/core/src/auth-policy.ts`, `packages/core/src/auth-policy.test.ts`. Pack off → `render`; pack on + missing token → `fail_job`. Do not change `decideActionToken`.
- [x] B2.3 `[P]` `wakatime_token` thin input + flatten ban + snapshot + write `action.yml`. Exclusive: `packages/core/src/codegen/action-yml.ts`, `packages/core/src/codegen/flatten.ts` (add `plugin_wakatime_coding_range` to `BANNED_FLATTENED_INPUT_NAMES` only), `packages/core/src/codegen/generate-action.test.ts`, snapshot, root `action.yml`. `THIN_ACTION_INPUT_NAMES` must stay equal to `ActionInputsSchema` keys. No `plugin_wakatime` bool.
- [x] B2.4 `[P]` payload Zod + `selectCodingPayload`. Exclusive: `packages/integrations/src/wakatime/payload.ts` (+ test). Requested keys only; map `os`; cap; never add omitted keys; never coerce missing to `0`.
- [x] B2.5 `[P]` wakatime REST cache. Exclusive: `packages/integrations/src/wakatime/cache.ts` (+ test). Map keyed `(method, url, params)`. Same-run hit skips fetch. Do not key as `POST /graphql`. Do not steal github cache glob.

## 5. Wave B3 (`[P]`)

- [x] B3.1 `[P]` client fetch + Basic + DNS + classify + retry + MockAgent matrix. Exclusive: `packages/integrations/src/wakatime/http.ts`, `packages/integrations/src/wakatime/client.ts`, `packages/integrations/src/wakatime/index.ts`, `packages/integrations/src/index.ts`. RFC Basic `base64(api_key + ":")`; `redirect: "error"`; DNS deny private IPs; `classifyWakatimeHttp` 401 fail_run; 403/429/302/202/5xx fail_after_backoff; 404/400 fail_widget; 200 + is_up_to_date false fail_after_backoff. Never log token.
- [x] B3.2 `[P]` `plugin.ts` registry + `bitsUsed`. Exclusive: `packages/plugins/src/wakatime/plugin.ts`, `packages/plugins/src/index.ts`. id `wakatime`, widgets `[coding]`, integrations `[wakatime]`, defaults `{ widgets: ["coding"] }`. `bitsUsed`: Theme, Frame, Stack, Row, Text, Muted, Stat, Bar, Chip, Divider (strings only).
- [x] B3.3 `[P]` coding view-model tests (languages+editors; omit projects/os; empty copy). Exclusive: `packages/plugins/src/wakatime/widgets/coding/view-model.ts` (+ test). MUST NOT invent zeros for omitted keys.

## 6. Wave B4 (`[P]`)

- [x] B4.1 `[P]` coding template + 480×160 `renderSvg` test + no HTTP. Exclusive: `packages/plugins/src/wakatime/widgets/coding/template.ts`, `render.ts` (+ render test). One Takumi tree; theme tokens only; root 100% size; empty-state does not throw; widget performs zero fetch.
- [x] B4.2 generate-action snapshot + `action.yml` only if snapshot conflict remains after B2.3.

## 7. Wave B5 verify (serial)

- [x] B5.1 AGENTS.md six files: root, core, integrations, plugins, action, docs. github + this wakatime pack; core freeze exception is wakatime/coding only; playground fixtures/skip live.
- [ ] B5.2 `just lint && just test`. Mock HTTP. No Playwright. No commit.
  Stays open: neither command is green. `just lint` fails on out-of-scope `apps/docs/**` generate/playground chrome (format/organizeImports) plus concurrent `packages/plugins/src/http/**` and `packages/renderer/src/stylesheets*` noise — not the wakatime client. `just test` fails on `apps/docs` (`source-drop` in generate shell; missing `@profile-bits/bits` / `@profile-bits/plugins` in generate pages). Scoped WakaTime vitest, `generate-action --check`, and `generate-docs --check` pass. Do not format `apps/docs/src/**` in this change.

Forbidden globs this change: `packages/integrations/src/github/**`, REST `/languages`, `apps/docs/src/**`, `packages/action/src/**`, consumer README.md.
