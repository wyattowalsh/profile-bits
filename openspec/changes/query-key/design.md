## Context

See `proposal.md` Why. Live schemes are `none`, `github-bearer`, `wakatime-basic`, and `http-optional`. `http-optional` prefixes Bearer. WakaTime forbids `?api_key=`. Steam Web API (later YouTube) requires `?key=`. author-integration copies from a static filename table and **stops** on any other scheme, including `oauth2`. Sibling W2-A-01 owns `oauth-refresh` and the shared skill table files. W2-A-03 owns `ActionInputsSchema`. Wave 3 steam owns `packages/integrations/src/steam/`. File locks: do not dual-write `packages/integrations/src/{github,wakatime,rss,http}/**`, `packages/core/src/types.ts`, or author-integration `SKILL.md` / `references/auth.md` / evals.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Vitest 4, Biome 2.5. Never unauthenticated GitHub. Never REST `/languages`. No `plugin_*_*_*`. No Playwright in the Action. Do not run `npx skills add`. Do not tag `v1` on `main`.

## Goals / Non-Goals

**Goals:**

- Contract for scheme `query-key` (`?key=`, no Authorization, pack-on `fail_job`).
- Runtime helpers + tests that lock `?key=` vs Bearer and secret-free cache keys.
- Literal template `auth.query-key.ts.template` so a later skill-table apply can copy it.

**Non-Goals:**

- Steam / YouTube / Last.fm pack ids, widgets, or dest `client.ts`.
- Thin Action `steam_token` / yaml `token_env` (W2-A-03).
- Editing author-integration `SKILL.md`, `references/auth.md`, evals, or `client.ts.template` in this node (parallel oauth-refresh).
- Extending live github / wakatime / rss / http `client.ts`.
- Extending shared `RestCacheAuth` (`"none" | "bearer"`) — query-key clients use `"query-key"` in their own cache key.
- Last.fm `api_key=` (different param name; out of this scheme).

## Decisions

### 1. Scheme id is `query-key`, query param is `key`

- **Choice:** Parameter name is exactly `key`. Overwrite any caller-supplied `key`. Preserve other search params via `URL.searchParams.set`.
- **Why:** Steam and YouTube use `key`. Plan text is `?key=`. WakaTime stays RFC Basic and MUST NOT grow a query-key path.
- **Alternative:** Generic param name in yaml — rejected; would leak secrets into config. Alternative: Last.fm `api_key` alias — rejected; new scheme or option later.

### 2. Shared helpers, not a first-party integration id

- **Choice:** `packages/integrations/src/query-key/` exports apply/strip/cache/assert helpers. Not in `FIRST_PARTY_INTEGRATION_IDS`. Not re-exported from the integrations barrel in this change.
- **Why:** Tests need a runtime now. Steam dest in wave 3 can import the helpers. html-scrape is the precedent for a non-catalog integrations module.
- **Alternative:** Only an OpenSpec delta — rejected; the graph requires tests. Alternative: put helpers in `auth-policy.ts` — rejected; W2-A-01 would collide.

### 3. Template is a fifth literal file; do not interpolate the path

- **Choice:** Add `auth.query-key.ts.template` next to the four existing scheme files. Same shared export names; header returns `{}`; `RequiresAuthorization() === true`; extra `apply{{Id}}QueryKey`.
- **Why:** Skill rule is a static 1:1 copy table. Interpolating `auth.{{scheme}}.ts.template` is already forbidden.
- **Alternative:** Update SKILL.md table in this node — rejected; same-file exclusive with W2-A-01.

### 4. Cache auth string `"query-key"`; strip `key` before hashing

- **Choice:** Local `queryKeyRestCacheKey` JSON of `(method, url-without-key, params-without-key, auth: "query-key")`. Do not widen `packages/integrations/src/cache.ts` `RestCacheAuth` here.
- **Why:** Shared cache is http/html-scrape. WakaTime already has its own cache module. Steam can do the same.
- **Alternative:** Add `"query-key"` to `RestCacheAuth` now — deferred so HTTP dump writers keep that file.

### 5. Pack-gated fail_job, not fail_widget

- **Choice:** `decideQueryKeyToken({ token, packEnabled })` matches `decideWakatimeToken`. Constructor assert is the pack-on path.
- **Why:** steam.md: pack-on missing token `fail_job`. http-optional empty token is `fail_widget`; that MUST NOT be reused.
- **Alternative:** Always require the token even when the pack is off — rejected; default yaml stays github-only.

### 6. Wave 3 dest client applies `?key=` at send time

- **Choice:** Helpers apply the key to the URL **after** the cache key is computed from the stripped URL. Live github/wakatime/rss/http clients stay unchanged. Generic `client.ts.template` still spreads Authorization headers; steam dest client.ts (new) will call `applyQueryKey`.
- **Why:** Extending the shared template would collide with oauth-refresh. Extending http `client.ts` would fake a Steam pack (backlog).
- **Alternative:** Per-request `auth: "query-key"` on `createHttpClient` — rejected; http json stays Bearer/none.

## Risks / Trade-offs

- [Skill table still stops on query-key until a serial apply] → Template file exists; OpenSpec names the scheme; W2-A-03 or a follow-up updates SKILL.md after A-01/A-02.
- [URL.toString() normalization] → Tests compare `searchParams.get("key")`, not raw string equality.
- [Secret in access logs of the upstream API] → Out of our control; we still omit it from cache keys and local logs.

## Migration Plan

Land unarchived. No runtime consumer until steam. Rollback is revert of `openspec/changes/query-key/**`, `packages/integrations/src/query-key/**`, and the new template. Archive after skill-table apply + steam dest.

## Open Questions

None. Last.fm `api_key` is a later scheme or option, not this change.
