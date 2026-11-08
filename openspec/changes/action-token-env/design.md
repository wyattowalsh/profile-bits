## Context

See `proposal.md` Why. W2-A-01 (`oauth-refresh`) and W2-A-02 (`query-key`)
named the schemes and deferred thin `*_token` / yaml `token_env` to this
node. File lock: `packages/core/src/types.ts` `ActionInputsSchema` is
W2-A-03. Wave 3 `W3-T-01` appends FIRST_PARTY plugin/widget ids after this
change — different keys. W2-A-04 re-checks `pnpm generate-action --check`.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Vitest 4, Biome 2.5.
Thin Action. No `plugin_*_*_*`. No extra pack bools. Never unauthenticated
GitHub. Never REST `/languages`. Do not tag `v1` on `main`. Do not run `npx skills add`. Do not commit.

## Goals / Non-Goals

**Goals:**

- Optional Action `*_token` with no default (`wakatime_token`,
  `spotify_token`, `steam_token`) plus yaml `token_env` (http pattern).
- Keep `generate-action --check` green. Schema keys ≡ thin `action.yml`.
- Reject flattened plugin inputs and extra pack bools in schema tests.

**Non-Goals:**

- Adding `spotify` / `steam` / `leetcode` / `chess` to `FIRST_PARTY_*`.
- Extending live github / wakatime / rss / http `client.ts`.
- `author-integration add` on those live dests.
- Engine / CLI lookup of yaml `token_env` (Action `http_token_env` still
  drives HTTP Bearer at runtime).
- Skill-table apply (`SKILL.md` / `references/auth.md` / evals).
- Playwright in the Action. `POST /api/preview` as an embed API.

## Decisions

### 1. Name the reserved thin tokens now; pack ids wait for Wave 3

- **Choice:** `ActionInputsSchema` adds `spotify_token` and `steam_token`
  as `OptionalActionTokenSchema` (`z.string().optional()`, no `.default()`).
  `FIRST_PARTY_PLUGIN_IDS` stays `github | wakatime | rss | http`.
- **Why:** This node owns Action input keys. W3-T-01 owns pack/widget ids.
  query-key design names `steam_token` here; oauth-refresh deferred
  `spotify_token` out of W2-A-01 onto `ActionInputsSchema`.
- **Alternative:** Wait for pack OpenSpec to invent the Action names —
  rejected; pack agents must not edit `ActionInputsSchema`.

### 2. Yaml `token_env` is the http pattern, not a second Action flatten

- **Choice:** `TokenEnvSchema` (trimmed POSIX env name, not `INPUT_*`) is
  optional on `HttpPluginConfigSchema` as `token_env`. Action input
  `http_token_env` stays a loose optional string (existing coerce-to-unset).
- **Why:** Facts: yaml `token_env` (http pattern) plus Action `*_token`
  (wakatime pattern). Putting the env name in yaml keeps secrets out of
  committed config. Validating yaml strictly and Action loosely matches
  today’s `http_token_env` whitespace → unset behavior.
- **Alternative:** Action inputs `spotify_token_env` / `steam_token_env` —
  rejected; would duplicate `http_token_env` flatten-by-another-name.
  Alternative: put token values in yaml — rejected; additionalProperties
  false and secret-in-config.

### 3. Codegen lists the new tokens with no default

- **Choice:** `THIN_ACTION_INPUTS` gains `spotify_token` and `steam_token`
  without `default`. `pnpm generate-action` rewrites root `action.yml`.
- **Why:** `generate-action.test.ts` requires schema keys ≡ generated
  names. `--check` fails if `action.yml` is stale.
- **Alternative:** Schema-only without codegen — rejected; leaves the
  equality test red and W2-A-04 blocked.

### 4. No extra pack bools, no flatten, no live dest add

- **Choice:** Do not add `plugin_spotify` / `plugin_steam` /
  `plugin_wakatime` / `plugin_rss` / `plugin_http`. `plugin_github` remains
  the only pack bool. Wave 2 does not `author-integration add` github /
  wakatime / rss / http.
- **Why:** Config SSOT is yaml. Locks from plan.md lock-auditor.
- **Alternative:** Marketplace enable flags per pack — rejected.

## Risks / Trade-offs

- [Unused Marketplace inputs until Wave 3 packs] → Names are reserved and
  optional; pack-off MUST NOT require them. Mitigate with no default and
  no FIRST_PARTY id in this change.
- [Yaml `plugins.http.token_env` parsed but unused at runtime] → Action
  `http_token_env` remains the live lookup. Wave 3 / a later node may
  prefer yaml when wiring new packs. Tests lock the schema, not HTTP.
- [Closed `action-public-api` list] → This change’s MODIFIED requirement
  extends the list. Do not archive until W2-A-04 is green.

## Migration Plan

Land unarchived. `pnpm generate-action --check` after codegen. Rollback is
revert of this change directory, `types.ts` token fields, `action-yml.ts`,
and generated `action.yml`. Archive after W2-A-04. Do not archive from this
node. Do not edit `openspec/specs/**` until archive.

## Open Questions

None. Client id/secret stay named env (oauth-refresh). Steam `?key=` stays
query-key. LeetCode / chess stay auth `none` (no tokens here).
