## Why

The three-layer contract freezes first-party ids as `github` only (`demo`, `stats`, `languages`). Consumers have no first-party way to render WakaTime (or Wakapi-compat) coding stats on a profile card. Adding that surface as a yaml-enabled pack with one shared client for Cloud + Wakapi compat — not a flattened Action input, not a public unauthenticated scrape — requires **MODIFIED** catalog and yaml-shape requirements.

## What Changes

- Post-v0 exception: first-party plugin ids become `github` and `wakatime`. GitHub v0 widgets (`demo`, `stats`, `languages`) stay unchanged. Do not invent further first-party packs in this change.
- Add first-party pack `wakatime`: widget `coding`, integration `wakatime`. Off unless yaml `plugins.wakatime` is present. Empty `plugins.wakatime: {}` enables default widget `coding`. No `plugin_wakatime` Action bool.
- Yaml optional coding options: `filename` default `wakatime`; `range` enum `last_7_days | last_30_days | last_6_months | last_year`; `include` `languages|editors|projects|os` default `[languages, editors]`; `limit` 1–16 default 8; `api_domain` hostname only default `wakatime.com`; `animate` default false. Default committed yaml remains github-only.
- Thin `action.yml` gains optional `wakatime_token` (no default). `--check` rejects flattened `plugin_wakatime_coding_*`. Do not add a `plugin_wakatime` bool.
- Widget `coding` uses integration `wakatime` only, one Takumi template, 480×160, default svg (baked still), theme tokens only, no HTTP. Empty after filters → “No coding data”. MUST NOT invent 0 for omitted include tokens. Skip without write still uses existing `widgetOutputFlags`.
- Integration `wakatime` uses `auth: required`. Empty/whitespace token when the pack is on fails the job. Never send without `Authorization`. Never public unauthenticated scrape. Shared client per run. Cache `(method, url, params)`. HTTP matrix includes 202/302. SSRF-closed `api_domain`.
- Playground uses fixtures or skips live WakaTime. Do not patch consumer `README.md`. Do not touch GitHub crawl policy.

## Capabilities

### New Capabilities

- (none — wakatime is a first-party pack/widget/integration on the existing three-layer contracts, not a fourth capability)

### Modified Capabilities

- `plugin-contract`: First-party catalog becomes `github` + `wakatime` (github pack unchanged). Yaml document shape accepts optional `plugins.wakatime` as a sibling of `plugins.github`. ADDED pack `wakatime` (`widgets: [coding]`, `integrations: [wakatime]`), yaml-only enablement, default widget `coding`, thin `wakatime_token`, no `plugin_wakatime` Action bool, forbid flattened `plugin_wakatime_coding_*`.
- `widget-contract`: ADDED widget `coding` (id MUST be `coding`, never `stats`/`languages`; integration `wakatime` only; 480×160; one Takumi template; theme tokens; baked still; options filename/range/include/limit/api_domain/animate; no HTTP; empty copy; no invented zeros; skip without write).
- `integration-contract`: ADDED integration `wakatime` (`auth: required`; empty token when pack on fails job; never send without Authorization; never public unauth scrape; shared client; path split; cache `(method, url, params)`; HTTP matrix including 202/302; SSRF).

Skip creating `openspec/changes/add-wakatime-integration/specs/action-public-api/spec.md` (`action-public-api` is not synced). Thin `wakatime_token` still lands via plugin-contract + codegen.

## Impact

- Specs: MODIFIED deltas under this change for `plugin-contract`, `widget-contract`, and `integration-contract`. After archive/sync those become the contract SSOT. Do not delta `action-public-api`.
- Code (later apply): `packages/integrations` wakatime module; widget `packages/plugins/src/wakatime/widgets/coding/`; extend `packages/core/src/types.ts` plus `wakatime-schema.ts`; thin `wakatime_token` on `action.yml` via codegen; playground fixtures or skip live; AGENTS.md updates for github + this wakatime pack. No new npm deps beyond catalog.
- Out of scope: http json widget, rss, extra wakatime widgets, Nango, Hakatime native adapter, Action git/gist engine, Fumadocs playground UI, flattened inputs, consumer README patch, GitHub crawl, `plugin_wakatime` bool.
