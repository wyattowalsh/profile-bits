## Context

See `proposal.md` Why. Three-layer specs are already synced (`plugin-contract`, `widget-contract`, `integration-contract`). T030c already generated thin root `action.yml` (`runs.using: node24`, `main: dist/index.js`, no flattened plugin options). This change specs the Marketplace public API as capability `action-public-api`; it does not rewrite `action.yml` or implement `packages/**`.

Constraints that shape the remaining work: yaml SSOT; empty/`""`/whitespace `github_token` fails the job; Action commits widget files only; `gist` is SVG + `canGist`; `dist/` gitignored on `main`; `@v1` never points at `main`.

## Goals / Non-Goals

**Goals:**

- Make T120* (load-config, engine + output ports, main) implementable against a frozen Marketplace contract (inputs, outputs, output_action, skip-ci, dry_run).
- Keep T400 as `--check` only: fail closed if flattened `plugin_*_*_*` names reappear; do not regenerate or restyle `action.yml`.
- Keep T410 as the slim orphan tree that `@v1` can point at, without tagging `main`.

**Non-Goals:**

- Implementing packages, applying, or archiving this change in the same workflow.
- Other OpenSpec changes (`github-api-fetch-policy`, `docs-playground`, `author-plugin`, `marketplace-release`).
- Fetch/auth crawl details (already in `integration-contract`).
- Hand-editing or regenerating `action.yml` unless a spec delta needs a doc-only markdown clarification (none).
- Flattened `plugin_*_*_*` inputs, README auto-edit, or a public image CDN.

## Decisions

### 1. Dedicated capability, not a plugin-contract rewrite

- **Choice:** New `action-public-api` spec. Do not MODIFIED-delta `plugin-contract` / `widget-contract` / `integration-contract`.
- **Why:** Plugin-contract already locks yaml SSOT and a thin input list. Marketplace outputs, consumer triggers, `[skip ci]`, permissions, and `@v1` orphan-tag policy are a separate public surface. Peak propose is 1; rewriting the three-layer model would mix concerns.
- **Alternative:** Expand `plugin-contract` in place — rejected; user asked for one new capability at `action-public-api`.

### 2. Empty token is missing, omitted token is github.token

- **Choice:** Action input default remains `${{ github.token }}` for omitted. Runtime treats empty/`""`/whitespace as missing and fails the job (auth-policy).
- **Why:** GitHub Actions substitutes omitted defaults; an empty secret is still “provided.” Unauthenticated 60/h/IP is forbidden.
- **Alternative:** Treat empty as omitted default — rejected; plan lock.

### 3. Config file beats plugin_github

- **Choice:** If the file at `config` exists, yaml wins and `plugin_github` is ignored. `plugin_github: true` applies pack defaults only when the file is absent.
- **Why:** Zero-config onboarding without two sources of truth. Unknown yaml keys already fail-closed.
- **Alternative:** Merge bool + yaml — rejected.

### 4. Outputs are part of the public API even if T030c omitted them

- **Choice:** Spec requires `files`, `did_commit`, `skipped`. T120* engine sets them; T030c `action.yml` is not rewritten in this change. A later `--check`/codegen pass (T400 is check-only) may add the `outputs:` block without introducing flattened inputs.
- **Why:** Consumers and tests need a stable job result surface. Adding outputs is not a flattened-option regression.
- **Alternative:** Encode outputs only in engine without declaring them in `action.yml` — rejected; Marketplace consumers read declared outputs.

### 5. gist is svg + canGist, not a binary dump

- **Choice:** `output_action: gist` fails unless format is `svg` and `canGist` is true. Raster/animated gist is a clear error. `GITHUB_TOKEN` cannot write gists.
- **Why:** GitHub gist API is not binary-friendly; installation tokens lack gist scope.
- **Alternative:** Upload PNG/GIF to gist — rejected.

### 6. [skip ci] unless PAT retrigger

- **Choice:** Installation-token widget commits use message `chore: update profile-bits widgets [skip ci]`. User PAT `committer_token` that should retrigger omits `[skip ci]`. Signal is token class `user_pat` (from the existing capability probe), not a new Action input.
- **Why:** `GITHUB_TOKEN` commits already skip `push` retrigger; `[skip ci]` is extra loop protection. A PAT used to commit *will* retrigger unless skipped — consumers who chose a PAT as committer want that loop. No new thin input for “retrigger.”
- **Alternative:** Always `[skip ci]`, or a new `retrigger` input — rejected; would either block PAT retrigger or thicken `action.yml`.

### 7. Consumer examples are schedule + workflow_dispatch

- **Choice:** Documented examples MUST NOT use bare `on: push`. Permissions: `contents: write`; add `pull-requests: write` for PR output.
- **Why:** Push-on-commit loops even with `[skip ci]` are a common metrics-class footgun. Schedule + manual dispatch is the intended README delivery cadence.
- **Alternative:** Show `on: push` with `[skip ci]` — rejected.

### 8. @v1 is the orphan tree, not main

- **Choice:** `dist/` gitignored on `main`. `@v1` points at orphan `release/v1` (T410). Never tag `v1` at `main`. Full Marketplace listing/release UI is T036 `marketplace-release` after T400.
- **Why:** `uses: owner/profile-bits@v1` downloads the tagged tree; tagging `main` would ship Fumadocs + lockfile.
- **Alternative:** Nested `packages/action@v1` or sparse-checkout — rejected; they do not shrink the download.

## Risks / Trade-offs

- [Empty secret silently becomes github.token] → Fail job on empty/whitespace; omitted-only default.
- [Flattened inputs reappear in codegen] → T400 `--check` fails on `plugin_github_stats_include` and `plugin_*_*_*`.
- [Gist with installation token looks configured] → Fail run without `canGist`; svg-only.
- [PAT commit retriggers CI loops] → Default `[skip ci]` on installation token; PAT omits skip only when token class is `user_pat`.
- [v1 accidentally tagged on main] → Spec + T410: orphan tree only; never tag `main`.
- [Outputs missing from current action.yml] → Spec requires them; T120* implements; do not hand-edit `action.yml` in this planning change.

## Migration Plan

Greenfield public API. T030c thin `action.yml` already matches the input/runtime subset. Remaining apply (later request): T120* engine/outputs, T400 check-only, T410 slim tree. Archive/sync then copies `action-public-api` into `openspec/specs/`.

Rollback: delete this change folder before archive; no Marketplace listing exists yet.

## Open Questions

None. Token empty-vs-omitted, yaml precedence, gist svg/`canGist`, `[skip ci]` vs PAT retrigger, and `@v1` orphan tag are locked by the plan.
