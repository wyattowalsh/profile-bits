## Context

See `proposal.md` Why. Synced contracts currently freeze first-party ids as `github` only and yaml as a github-only document. `packages/core/AGENTS.md` and `packages/plugins/AGENTS.md` forbid editing `packages/core/**` after schema freeze — this change is an authorized post-v0 exception for wakatime/`coding` only. `decideAllGithubWidgetsSkipped` filters via `WIDGET_INTEGRATIONS[widgetId]` including `"github"`; wakatime must not join that rule. `classifyGithubHttp` MUST NOT be reused (GitHub 403 is `fail_run` unless secondary; WakaTime 403 is always `fail_after_backoff`).

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Takumi 2.9.2 via `@profile-bits/renderer` only, Zod 4 already in catalog, Vitest 4, Biome 2.5. Thin `action.yml`. Never REST `/languages`. Never unauthenticated GitHub. No `plugin_wakatime` Action bool. No flattened `plugin_<plugin>_<widget>_<option>` inputs. No new npm deps beyond catalog.

## Goals / Non-Goals

**Goals:**

- Ship first-party pack `wakatime` (widget `coding`, integration `wakatime`) enabled only by yaml `plugins.wakatime`.
- One shared client in `packages/integrations` for Cloud (`wakatime.com`) and Wakapi-compat hosts, RFC Basic `base64(api_key + ":")`, SSRF-closed `api_domain`, mocked HTTP.
- Keep github v0 widgets, `DEFAULT_YAML`, `plugin_github`, and GitHub crawl unchanged. Thin `action.yml` gains optional `wakatime_token` only (no default).
- Prove the 480×160 baked SVG card with fixtures and a thin `renderSvg`.

**Non-Goals:**

- http json widget, rss, extra wakatime widgets, Nango, Hakatime native adapter.
- Flattened Action inputs, `plugin_wakatime` bool, consumer `README.md` patches.
- GitHub crawl policy changes, Fumadocs playground UI, full renderer format matrix (gif/apng/webp animation).
- Applying archive or git commit in this propose workflow.

## Decisions

### 1. MODIFIED three-layer deltas, not a new capability

- **Choice:** Delta `plugin-contract`, `widget-contract`, and `integration-contract`. No fourth capability. Skip `action-public-api` (not synced). Thin `wakatime_token` lands via plugin-contract + codegen.
- **Why:** An ADDED-only catalog would contradict “no other first-party plugin ids” after archive. WakaTime is a pack/widget/integration, not a new layer.
- **Alternative:** New `wakatime` capability — rejected; would fork the three-layer model.

### 2. Layout: client in integrations; widget under plugins; schema split

- **Choice:**
  - Client: `packages/integrations` wakatime module (`api-domain.ts`, `cache.ts`, `payload.ts`, `http.ts`, `client.ts`, `index.ts`, `fixtures/`)
  - Widget: `packages/plugins/src/wakatime/widgets/coding/` (`view-model.ts`, `template.ts`, `render.ts`) plus pack `packages/plugins/src/wakatime/plugin.ts`
  - Schema: `packages/core/src/wakatime-schema.ts` for coding option constants/schemas; `packages/core/src/types.ts` only adds enum members + re-exports
- **Why:** `types.ts` is a write bottleneck. Coding options stay out of the github freeze file except enums. Widgets consume cached payloads and do no HTTP.
- **Alternative:** Put all schemas in `types.ts` — rejected; collides with github freeze writers.

### 3. Path split (Cloud vs Wakapi compat)

- **Choice:** Hostname `wakatime.com` (exact, lowercase) → `https://wakatime.com/api/v1/users/current/stats/{range}`. Any other **allowed** hostname → `https://{api_domain}/api/compat/wakatime/v1/users/current/stats/{range}`. Range in path only: `last_7_days | last_30_days | last_6_months | last_year`. Do not silently rewrite to `api.wakatime.com`. `api.wakatime.com` as yaml domain uses the Wakapi compat path (likely 404 `fail_widget`). Default yaml `api_domain: wakatime.com`.
- **Why:** Official Cloud prefix is `https://api.wakatime.com/api/v1/` but `https://wakatime.com/api/v1/` also serves JSON; yaml default stays `wakatime.com` as specified. Wakapi speaks `/api/compat/wakatime/v1`. GRS interpolates user `api_domain` into `/api/v1/...` with no key and no `{range}` path — we take only the hostname-swap idea.
- **Alternative:** Always `/api/v1/` like GRS — rejected; Wakapi needs compat prefix. Alternative: special-case `api.wakatime.com` — rejected; default host is `wakatime.com`.

### 4. RFC Basic empty password; never query key; never Bearer

- **Choice:** `Authorization: Basic ${Buffer.from(`${token}:`, "utf8").toString("base64")}` (RFC 7617 empty password; key as user). Never `?api_key=`. Never Bearer for the personal API key. Never log the token.
- **Why:** Docs example is `Basic base64(api_key)` with no colon. This change requires the RFC empty-password form. If a later live 401 appears, that is a follow-up, not a dual-path in v0 of this client.
- **Alternative:** Match docs without colon — rejected for this change. Alternative: GRS unauthenticated public scrape — rejected.

### 5. SSRF: hostname Zod + IP reject + DNS private-IP reject + no redirect follow

- **Choice:** `assertSafeApiDomain` + `resolveStatsUrl`. Hostname only (Zod pattern; reject `z.ipv4`/`z.ipv6`; reject if `z.url().safeParse` succeeds; reject `localhost` / `.local` / metadata hosts; no `:`, `/`, `?`, `#`, `@`). Path always client-constructed; never interpolate user path. Fetch `redirect: "error"`. DNS lookup all A/AAAA; deny private/link-local/metadata IPs before fetch. Tests mock `node:dns/promises`.
- **Why:** Hostname regex alone does not stop `evil.example` resolving to `127.0.0.1`. Native `fetch` follows redirects by default → SSRF if `api_domain` 302s to metadata. WakaTime 302 is sometimes sent instead of 429.
- **Alternative:** Follow GRS redirects blindly — rejected. Alternative: add ipaddr.js — not required; catalog already has zod; Node DNS + explicit private ranges suffice for this client.

### 6. HTTP matrix is WakaTime-specific (`classifyWakatimeHttp`)

- **Choice:** 401 `fail_run`; 403/429/302/202/5xx `fail_after_backoff`; 404/400 `fail_widget`; 200 + `is_up_to_date === false` `fail_after_backoff`. Bounded retry max 3 only for `fail_after_backoff`. Do not change `classifyGithubHttp` or `decideActionToken`.
- **Why:** Stats may return 202 (`is_up_to_date: false`). GitHub 403 is fail_run unless secondary; WakaTime 403 is always fail_after_backoff.
- **Alternative:** Reuse `classifyGithubHttp` — rejected.

### 7. Token policy is pack-gated (`decideWakatimeToken`)

- **Choice:** `decideWakatimeToken({ token, packEnabled })`: pack off → `render`; pack on + `isMissingToken` → `fail_job`. Pack absent does not require the token.
- **Why:** Auth is required only when the pack is on. GitHub token policy stays independent.
- **Alternative:** Always require `wakatime_token` — rejected; default yaml is github-only.

### 8. Cache glob vs future T111a

- **Choice:** `packages/integrations/src/wakatime/cache.ts` keyed `(method, url, params)`. Do not steal `packages/integrations/src/github/cache.ts` (in-flight github-api-fetch-policy T111a).
- **Why:** Same REST key shape, separate module so github and wakatime writers do not collide.
- **Alternative:** Shared cache helper — rejected for this change.

### 9. Payload: requested include slices only; `os` ← `operating_systems`

- **Choice:** Zod envelope `{ data: { total_seconds, human_readable_total, languages?, editors?, projects?, operating_systems? } }`. `selectCodingPayload` returns totals + requested keys only; map `os`; sort desc; cap `limit`; never add omitted keys; never coerce missing to `0`. Empty after filters → render “No coding data” (write the card). 404 → `fail_widget` (no write).
- **Why:** Spec forbids invented zeros for omitted include tokens. Empty is `render`, not skip.
- **Alternative:** Always expose all slices — rejected.

### 10. Thin renderer; playground fixtures

- **Choice:** Singleton `Renderer` from `@takumi-rs/core` + helpers; vendored Geist WOFF2 300–800; `renderSvg(node, { width: 480, height: 160 })`. Vitest `environment: "node"`. No `ImageResponse`, wasm, or `googleFonts()`. Playground: fixtures or skip live WakaTime. `apps/docs` stays a placeholder.
- **Why:** T100-adjacent; SVG-only unblocks acceptance without owning png/gif/apng.
- **Alternative:** Skip renderer and assert JSON only — rejected; acceptance requires 480×160 opening `<svg>` tag.

### 11. Hakatime native is out of scope

- **Choice:** Native Hakatime (`GET /api/v1/users/current/stats?start=&end=` camelCase `totalSeconds`/`platforms`, no `/api/compat/wakatime/v1`) is **out of scope**. Self-host that speaks **Wakapi compat** works via the non-cloud path. Do not add a Hakatime adapter. Do not overclaim GRS “Hakatime” support.
- **Why:** Hakatime is not WakaTime-stats compatible. GRS hostname-swap is not a Hakatime adapter.
- **Alternative:** Dual adapter in v0 — rejected.

### 12. Libraries: catalog only

- **Use:** zod 4, yaml (existing parse), `@takumi-rs/core` + helpers, vitest 4, Node 24 `fetch` / `Buffer` / `URL` / `node:dns/promises` / `node:undici` `MockAgent` (bundled; do not add `undici` to package.json), biome.
- **Do not add / do not use:** axios, octokit on this path, msw, ipaddr.js, p-retry, `takumi-js/response`, `googleFonts()`, `@takumi-rs/wasm` in Action/tests, query-string `api_key`.

## Risks / Trade-offs

- [RFC Basic `key:` vs docs `key`] → Follow empty-password form; live 401 is a follow-up, not a dual-path.
- [`api.wakatime.com` as yaml domain uses compat path] → Default `wakatime.com` is the supported Cloud host; other host 404s `fail_widget`.
- [DNS rebinding] → Lookup all A/AAAA; reject private IPs before fetch.
- [302 follow → SSRF] → `redirect: "error"`; map 302 to `fail_after_backoff`.
- [202 stale stats] → `is_up_to_date false` is `fail_after_backoff`.
- [GitHub 403 classifier reuse] → Separate `classifyWakatimeHttp`.
- [T100 renderer collision] → SVG-only singleton + Geist; no png/gif/apng.
- [T111a cache collision] → WakaTime cache stays under `wakatime/cache.ts`.
- [AGENTS.md freeze reverts types.ts] → Update root + package AGENTS.md in B5.
- [Flattened `plugin_wakatime_coding_*`] → Ban `plugin_wakatime_coding_range` in flatten list; `--check` regex already catches the family.
- [Native Takumi in CI] → linux optional `@takumi-rs/core-linux-x64-gnu`; vitest `environment: "node"`.

## Migration Plan

Greenfield additive pack. Default committed yaml stays github-only; existing consumers unchanged. Apply follows the B0–B5 graph in `tasks.md`. Rollback: omit `plugins.wakatime` from yaml; delete this change folder before archive. Do not archive or commit unless asked.

## Open Questions

(none — path split, RFC Basic, SSRF, HTTP matrix, Hakatime native out of scope, exclusive globs, and types.ts / wakatime-schema.ts split are locked above)
