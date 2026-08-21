## Context

See `proposal.md` Why. `openspec/specs/` is empty; this change is the first delta. Implementation later lands in `packages/core` (types, auth-policy, yaml parse, thin `action.yml` codegen), `packages/integrations` (static + github clients), `packages/plugins` (github pack), `packages/action` (engine), and `packages/renderer` (Takumi). This design freezes approach so those packages do not invent a competing public surface.

Constraints: yaml SSOT; never unauthenticated GitHub; `GITHUB_TOKEN` is 1,000 REST/h and 1,000 GraphQL points/h per repo; Takumi SVG is a baked still; Action does not patch README.md.

## Goals / Non-Goals

**Goals:**

- One change, three spec files (`plugin-contract`, `widget-contract`, `integration-contract`) as the Wave 0–1 implementation contract.
- Make T030t/a/b/c/d (types, auth-policy, parse-config, thin codegen + `--check`, barrel) implementable without inventing options, inputs, or crawl strategies.
- Keep skip/fail, yaml precedence, and REST-then-`nodes(ids:)` filter-then-cap as testable behavior.

**Non-Goals:**

- Implementing packages, applying, or archiving this change (T031+).
- Additional OpenSpec changes (`action-yml-public-api`, `github-api-fetch-policy`, `docs-playground`, `author-plugin`, `marketplace-release`).
- Flattened `plugin_*_*_*` Action inputs, REST `/languages`, extra plugins, README auto-edit, or a public image CDN.

## Decisions

### 1. Three layers in one change, not three proposes

- **Choice:** One change folder with three spec files.
- **Why:** Plugin, widget, and integration are one model. Splitting would let later work drift (e.g. widgets assuming one-API-per-plugin).
- **Alternative:** Plus-proposal-split per layer — rejected; peak propose fan-out is 1 and the plan forbids splitting this model.

### 2. Yaml SSOT + thin action.yml, not metrics-style flattened inputs

- **Choice:** Widget options live in `.github/profile-bits.yml` (`additionalProperties: false`). Root `action.yml` stays thin. Codegen `--check` fails on `plugin_github_stats_include` and similar.
- **Why:** Marketplace input changes are semver-major; yaml options must be able to evolve without a Marketplace bump. Flattened inputs also explode combinatorially.
- **Alternative:** Generate `plugin_<plugin>_<widget>_<option>` like metrics — rejected.

### 3. Config file beats `plugin_github`

- **Choice:** If the config file exists, yaml wins and `plugin_github` is ignored. `plugin_github: true` applies pack defaults only when the file is absent.
- **Why:** Zero-config onboarding without two conflicting SOT.
- **Alternative:** Merge bool + yaml — rejected; unknown keys already fail-closed.

### 4. Capability matrix, not 403-myth

- **Choice:** One identity probe per run (`GET /user` or `viewer { login }`) sets `canPrivate` / `canContributions` / `canGist`. Empty token fails the job. Probe login ≠ `user` → public REST only; do not render 0 for unavailable fields. `include_private: true` without `canPrivate` fails that widget. `gist` without `canGist` fails the run.
- **Why:** Installation tokens look like they “work” then return public-only or 403; silent public charts are worse than a failed widget.
- **Alternative:** Try private, catch 403, draw zeros — rejected.

### 5. REST crawl + `nodes(ids:)`, never REST `/languages`

- **Choice:** `GET /users/{login}` + paginated `/repos?type=owner&per_page=100`; **filter forks/archived first, then cap 500**; GraphQL `nodes(ids:)` batches of 100 for language bytes. Cache REST by `(method, url, params)` and GraphQL by `(query, variables)`.
- **Why:** 500 per-repo GraphQL language calls would exhaust the 1,000-pt hour; REST `/languages` is N extra REST calls; capping before filter would mix fork ids into stars vs languages.
- **Alternative:** `repositories(first:100)` pagination as a second 500, or REST `/languages` — rejected.

### 6. GraphQL 200 + `errors[]` is exhaustion, not skip

- **Choice:** HTTP 200 with `errors[]` or remaining 0 is fail-after-backoff, same family as 429 / secondary 403.
- **Why:** Skipping would commit partial language cards that look complete.
- **Alternative:** Skip widget on GraphQL errors — rejected.

### 7. Delivery: commit files, baked SVG, node24

- **Choice:** Action writes widget files only; default SVG is Takumi still; `runs.using: node24`; `dist/` gitignored on `main`.
- **Why:** README stays user-owned; Camo/sanitize is not a CSS animation runtime; Node 20 is deprecated on Actions.
- **Alternative:** Patch README, ship CSS/SMIL in SVG, or `node20` — rejected.

## Risks / Trade-offs

- [Silent public charts when PAT/login mismatch] → Fail widget / omit contributions chip; never invent 0.
- [GraphQL point exhaustion on languages] → REST-ordered ids + `nodes(ids:)` batches (~5 pts for 500 repos), not 500 calls.
- [Cap-before-filter skews stars vs languages] → Filter forks/archived first, then cap 500 so both share ids.
- [Marketplace input churn] → Thin `action.yml`; options in yaml; `--check` rejects flattened names.
- [Empty secret vs omitted input] → Whitespace/`""` is missing → fail job; omitted uses `${{ github.token }}`.
- [All widgets skipped still “green”] → Fail job unless `allow_skipped: true`; skipped widgets do not write files.

## Migration Plan

Greenfield. No existing main specs to migrate. After T030d, T031 archives/syncs these deltas into `openspec/specs/`. Follow-on proposes MUST NOT rewrite this three-layer model.

Rollback: delete the change folder before archive; no production Action exists yet.
