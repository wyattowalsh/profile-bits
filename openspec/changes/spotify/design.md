## Context

See `proposal.md` Why. Catalog ids, `INTEGRATION_AUTH.spotify = required`,
yaml `plugins.spotify.token_env`, and Action `spotify_token` (no default)
already landed in `elbow-catalog` / `action-token-env`. W2-A-01 named scheme
`oauth-refresh`. Dest `packages/integrations/src/spotify/client.ts` is absent,
so this node may `author-integration add`. W3-T-01 owns `types.ts`. Parallel
pack agents MUST NOT dual-write shared barrels, `action.yml`, or
`packages/action/**`.

Constraints: Node 24, pnpm, OpenSpec 1.9.0, Vitest 4, Biome 2.5. No
`plugin_*_*_*`. Never unauthenticated GitHub. Never REST `/languages`. Do
not tag `v1` at `main`. Do not run `npx skills add`. Do not commit. Finish
`docs-full-catalog-playground` in place.

## Goals / Non-Goals

**Goals:**

- Land Spotify oauth-refresh client + complete dump + pack widgets
  `now-playing` / `top` against existing catalog ids.
- Name token URL `https://accounts.spotify.com/api/token` and client env
  `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`.
- Fixtures for playground default. Never log the refresh token.

**Non-Goals:**

- Appending `FIRST_PARTY_*` or editing `ActionInputsSchema`.
- Wiring `packages/action/src/clients.ts` / plugin barrels (shared files;
  later fan-in).
- Updating author-integration `SKILL.md` (shared with steam / query-key).
- Playground route expansion (docs stay four-pack).
- Archiving this change from this node.

## Decisions

### 1. Complete-existing ids; this change is fetch/render

- **Choice:** Change id `spotify`. Do not mint new catalog ids. Pack agents
  MUST NOT edit `packages/core/src/types.ts`.
- **Why:** W3-T-01 / `elbow-catalog` already named the pack, widgets, and
  integration. Facts: each workstream is its own OpenSpec change for
  behavior.
- **Alternative:** Append ids here — rejected; seven-way types.ts writers.

### 2. oauth-refresh, not oauth2 or http-optional

- **Choice:** `{{scheme}}` is `oauth-refresh`. Token request uses
  `grant_type=refresh_token` plus Basic client credentials. Resource
  `Authorization` is Bearer **access** token. Alias `oauth2` still stops.
- **Why:** W2-A-01. `http-optional` would send the refresh token as Bearer
  on the resource request.
- **Alternative:** Reuse http-optional — rejected by oauth-refresh spec.

### 3. Client credentials are named env, not yaml

- **Choice:** `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`. Refresh
  token is Action `spotify_token` (no default) and optional yaml
  `token_env` (env **name**). Client id/secret MUST NOT be yaml keys.
- **Why:** Plan / inventory. One Action token cannot carry id+secret.
- **Alternative:** Extra Marketplace inputs — rejected flatten lock.

### 4. Complete dump; widgets only read

- **Choice:** One run fetches currently-playing, recently-played, and top
  tracks after a single in-memory refresh. Widgets apply recently-played
  fallback and `top` limit. Extra dump keys MUST NOT fail parse. Album
  art URLs stay in the model; Image renders them. No HTTP in widgets.
- **Why:** Facts: cache is a complete dump; include/limit are widget-side.
- **Alternative:** Fetch only what the selected widget needs — rejected;
  would drop dump fields at fetch.

### 5. Exclusive dest trees; mention-only barrels

- **Choice:** Write `packages/integrations/src/spotify/**` and
  `packages/plugins/src/spotify/**` plus this change and exclusive tests.
  Do not edit `packages/integrations/src/index.ts`,
  `packages/plugins/src/index.ts`, `packages/action/**`, or `SKILL.md`.
- **Why:** Same-file exclusive with parallel W3-LC / W3-CH / W3-ST.
- **Alternative:** Wire Action clients now — rejected dual-write.

### 6. Playground fixtures, not live OAuth

- **Choice:** Disk fixtures under the integration. Docs preview MUST use
  fixtures or skip live oauth-refresh. `POST /api/preview` is not an embed
  API.
- **Why:** Never leak refresh tokens to a public preview.
- **Alternative:** Live visitor refresh token — rejected.

## Risks / Trade-offs

- [Skill table still four-file until SKILL.md apply] → This node copies
  `auth.oauth-refresh.ts.template` onto dest `auth.ts` by hand because dest
  `client.ts` is absent. Do not interpolate `auth.{{scheme}}.ts.template`.
- [Action does not construct the client yet] → Constructor still
  `fail_job`s on missing credentials; Action pack-gating is later wiring.
- [Empty `plugins.spotify: {}` is widget-less until parse-config defaults]
  → Pack registry `defaults.widgets` is `now-playing`; core parse-config
  fan-in is out of exclusive scope.

## Migration Plan

Land unarchived. Targeted vitest on integrations/spotify, plugins/spotify,
and `scripts/spotify.test.ts`. `pnpm exec openspec validate --strict
--change spotify`. Rollback is delete this change plus dest trees. Do not
edit `openspec/specs/**` until archive.

## Open Questions

None. Token URL, env names, widget ids, and `spotify_token` are specified.
