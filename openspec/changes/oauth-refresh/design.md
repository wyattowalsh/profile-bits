## Context

See `proposal.md` Why. Today’s author-integration copy map is four files.
OpenSpec does not yet name `oauth-refresh`, so a new id whose scheme is
`oauth2` or `oauth-refresh` stops. `INTEGRATION_AUTH` in
`packages/core/src/types.ts` stores catalog `none | optional | required`,
not `{{scheme}}`. Github and http are both catalog `optional` with
different schemes — do not infer Bearer from `optional`.

Constraints: Node 24, pnpm, OpenSpec 1.9.0. Thin Action. No
`plugin_*_*_*`. Never unauthenticated GitHub. Never REST `/languages`.
Same-file exclusive with W2-A-02 (`query-key`): this change MUST NOT
edit `.agents/profile-bits/skills/author-integration/SKILL.md`,
`references/auth.md`, `evals/evals.json`, or
`packages/plugins/src/author-skill-templates.test.ts`. W2-A-03 owns
`ActionInputsSchema`. Wave 3 owns Spotify ids.

## Goals / Non-Goals

**Goals:**

- Land an OpenSpec-first contract so `{{scheme}}` `oauth-refresh` is a
  named, copyable auth scheme for a later new dest (Spotify, later Strava).
- Specify refresh-then-Bearer runtime, required-auth `fail_job`, and
  secret handling without adding a pack or Action input in this change.

**Non-Goals:**

- `query-key` (`?key=`). That is W2-A-02.
- Updating the author-integration four-file table in `SKILL.md` (after
  both scheme specs exist).
- Adding `auth.oauth-refresh.ts.template` in this node (skill apply).
- `spotify` / `strava` catalog ids, widgets, or live `client.ts`.
- `ActionInputsSchema` `*_token` / yaml `token_env` (W2-A-03).
- Flattened Marketplace inputs, `plugin_spotify` bool, tagging `v1` at
  `main`, `npx skills add`.

## Decisions

### 1. Scheme id is `oauth-refresh`, not `oauth2`

- **Choice:** OpenSpec names `{{scheme}}` `oauth-refresh`. Alias `oauth2`
  remains unknown and still stops.
- **Why:** The stop on `oauth2` is the current lock against inventing a
  fifth template by interpolating `auth.{{scheme}}.ts.template`. A new
  **named** scheme is the allowed extension. Spotify-class auth is
  refresh-token exchange, not a generic OAuth2 grab-bag (auth code,
  client-credentials, implicit).
- **Alternative:** Treat `oauth2` as the scheme id — rejected; would
  collapse distinct grants and bypass the unknown-scheme stop without a
  dedicated template.

### 2. ADDED deltas on existing capabilities, not a new capability

- **Choice:** ADDED requirements on `author-plugin` and
  `integration-contract`. No `openspec/specs/oauth-refresh/`.
- **Why:** Auth schemes are author-integration copy policy plus
  integration runtime, not a fourth contract layer. First-party pack ids
  stay frozen until a later pack OpenSpec.
- **Alternative:** New capability `oauth-refresh` — rejected; would fork
  auth out of `integration-contract`. Alternative: MODIFY the four-scheme
  allowlist as one closed set — rejected; W2-A-02 would dual-write the
  same requirement.

### 3. http-optional cannot express refresh

- **Choice:** New scheme. Resource `Authorization` is Bearer **access**
  token after `grant_type=refresh_token`. Refresh token never goes in
  `Authorization` or `?key=` / `?api_key=`. Catalog auth is `required`
  (`fail_job` when the pack is on and credentials are missing).
- **Why:** `http-optional` sends the provided secret as Bearer/raw on the
  resource GET and uses `fail_widget` for whitespace. Spotify-class
  clients need a token endpoint, client id/secret env, and job-level fail
  when the pack is enabled.
- **Alternative:** Reuse `http-optional` and document a pre-step —
  rejected; author-integration would copy the wrong template.
  Alternative: GitHub `decideActionToken` — rejected; GitHub-only.

### 4. Client id/secret are named env; token names wait for W2-A-03

- **Choice:** This spec forbids yaml and Marketplace flatten for client
  credentials. Thin refresh-token Action names (`*_token` no default,
  yaml `token_env`) are required of the scheme but **not invented here**.
- **Why:** W2-A-03 owns `ActionInputsSchema`. Wave 3 names `spotify_token`
  when the pack is added. Skills MUST read live `types.ts`.
- **Alternative:** Add `spotify_token` in this change — rejected;
  silently expands the Action surface without generate-action.

### 5. Token endpoint is consumer-named

- **Choice:** The consumer integration OpenSpec names the token URL.
  This scheme does not hardcode `accounts.spotify.com`.
- **Why:** The same scheme serves Spotify then Strava. The template stays
  id-agnostic (`{{id}}` / `{{Id}}` / `{{ID}}` / `{{auth}}` / `{{scheme}}`).
- **Alternative:** Bake Spotify’s token URL into the scheme — rejected.

### 6. Skill-table apply is after both A0 specs

- **Choice:** This node writes only `openspec/changes/oauth-refresh/**`
  plus exclusive tests. It does not edit `SKILL.md`.
- **Why:** W2-A-01 and W2-A-02 run in parallel. One writer per file.
- **Alternative:** Update the four-file table now — rejected; conflicts
  with `query-key`.

## Risks / Trade-offs

- [Skill stays four-file until apply] → Wave 3 `author-integration add
  spotify` still stops until the scheme table and template land. Mitigate
  by keeping those as later tasks on this change, serialized after
  `query-key`.
- [Refresh vs access token mix-up] → Spec requires
  `{{id}}AuthorizationHeader` to take the **access** token; refresh
  token never in `Authorization` or query.
- [Secrets in cache keys] → Spec forbids secret values in cache keys,
  dumps, logs, and on-disk persistence. In-run memory may hold the
  access token.

## Migration Plan

- Spec-only until W2-A-02’s `query-key` spec exists, then one serialized
  author-integration apply adds **both** scheme files and table rows.
- Archive after apply. Do not archive from this node.
- Rollback is deleting this in-flight change; main specs are untouched
  until archive.

## Open Questions

- (none — consumer token URL, Action input names, and Spotify ids are
  deferred to later OpenSpec changes by design, not left unspecified
  for this scheme)
