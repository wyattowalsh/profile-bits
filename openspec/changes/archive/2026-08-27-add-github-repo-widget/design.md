## Context

See `proposal.md` Why. Pack `github`, widgets `demo` / `stats` / `languages`, and integration `github` already exist. Synced SSOT catalogs freeze github v0 as `demo`, `stats`, and `languages` with pack defaults `stats` + `languages`. Http widget `chips` is a different pack (`http`) and a different chrome (shieldcn / shields Chip row). This change **adds widget `repo` only**: never add a fifth plugin id; never add a new integration id; never make `repo` a pack default; never alias `repo` to `chips`.

Live tree is in-flight: `packages/core/src/types.ts` already catalogs `repo` and `RepoOptionsSchema`; flatten already bans `plugin_github_repo_include`. Apply MUST complete remaining surfaces (REST GET, crawl skip, widget, engine/render, docs fixtures, examples, tests, AGENTS.md) without regressing stats/languages crawl or http chips. Exclusive planning glob: `openspec/changes/add-github-repo-widget/**` only. Do **not** edit `openspec/specs/**`. Do **not** edit `openspec/changes/marketplace-release/**`.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Takumi 2.9.2 via `@profile-bits/renderer` only, Vitest 4, Biome 2.5. Thin `action.yml`. No flattened `plugin_<plugin>_<widget>_<option>` inputs. No `plugin_github_repo` Action input. Widgets perform no HTTP. Zero live network in tests. Never REST `/languages`. Never unauthenticated GitHub. Consumer pin `wyattowalsh/profile-bits@v1` (orphan `release/v1` tree; never tag `v1` at `main`) — mention only; marketplace-release stays a sibling change.

## Goals / Non-Goals

**Goals:**

- Ship widget `repo` on pack `github` / integration `github` as yaml opt-in like `demo`: required `repo: owner/name`, frozen include tokens, Primer 480×160 REST card.
- Fetch with authenticated `GET /repos/{owner}/{repo}` only. Skip the user crawl for `demo` and `repo`. Keep crawl + GraphQL `nodes(ids:)` for `stats` / `languages`.
- Keep http `chips` as the badge-row surface. Distinct chrome, pack, and transport.
- Playground fixtures for github `repo`; `POST /api/preview` stays layout preview, not an embed API.
- Prove parse, flatten ban, crawl skip, single-repo GET, empty card, and engine enablement with fixtures and injected `renderWidget`.

**Non-Goals:**

- A fifth first-party pack or a new integration id.
- Making `repo` a pack default or a `plugin_github` implicit widget.
- Flattened `plugin_github_repo_*` or a `plugin_github_repo` thin input.
- REST `/languages`, GraphQL language bytes for this widget, or owner-list crawl for `repo`.
- Http chips preset expander, shieldcn/shields URLs, or split-Chip badge chrome on `repo`.
- Editing `openspec/changes/marketplace-release/**` or publishing the Marketplace listing.
- Tagging `v1` at `main`. Committing `dist/`. Git commit.

## Decisions

### 1. MODIFIED three-layer deltas, not a fifth pack

- **Choice:** Delta `plugin-contract`, `widget-contract`, and `integration-contract`. No fourth capability folder. No new plugin or integration id. Catalog stays `github`, `wakatime`, `rss`, `http`. Github v0 widget set stays `demo`, `stats`, `languages`.
- **Why:** A new `repo` pack would fight the plugin-is-a-pack lock. `repo` is one more github widget, the same way `chips` is one more http widget.
- **Alternative:** Fifth pack `repo` — rejected. Alternative: hang repo stats on http chips types — rejected (different pack, transport, and chrome).

### 2. Yaml opt-in like demo; types catalog append widget id only

- **Choice:** Off unless `plugins.github.widgets.repo` is present with required `repo: owner/name` (`GithubRepoFullNameSchema` / `owner/name`). `RepoOptionsSchema` strictObject: `filename`, `repo`, `include` (closed tokens, default stars/forks/issues/license, min 1, dedupe preserve order), `avatar` (default true), `animate` (default false). **No `url`. No `headers`. No `bits`. No `include_private` / `include_forks` / `include_archived`.** `GITHUB_PACK_DEFAULT_WIDGETS` stays `["stats","languages"]`. `WIDGET_INTEGRATIONS.repo = ["github"]`. `plugin_github: true` without yaml still enables only pack defaults.
  - Exclusive file: `packages/core/src/types.ts`. Read first. Append widget id if missing; do not replace id arrays; keep chips/json/feed/coding.
  - Constants: `REPO_FILENAME_DEFAULT = "repo"`, `REPO_INCLUDE_TOKENS`, `REPO_INCLUDE_DEFAULT`, `REPO_AVATAR_DEFAULT = true`, `REPO_ANIMATE_DEFAULT = false`.
- **Why:** User forbade a fifth pack, flattened inputs, and pack-default repo. Required `owner/name` at parse (unlike chips, where `repo` may omit and expand later).
- **Alternative:** Short repo name filled from Action `user` — rejected; yaml lock is `owner/name`. Alternative: `plugin_github_repo` bool — rejected.

### 3. Single-repo GET; skip user crawl for demo and repo

- **Choice:** Add `GET /repos/{owner}/{repo}` on the existing github REST module (alongside `crawlGithubRest`). `GITHUB_REST_DEPENDENT_WIDGETS` stays `["stats","languages"]`. `loadPayload` (or a dedicated `loadRepo`) MUST skip `crawlGithubRest` when `widget` is `demo` or `repo`. Repo path: identity probe MAY still run once per client; then one cached REST GET. Stats/languages keep filter-then-cap 500 + GraphQL `nodes(ids:)` batches of 100.
- **Lock:** Never `GET /repos/{owner}/{repo}/languages`. Repo `language` is the repository JSON `language` string. Watchers = `subscribers_count` (not `watchers_count`, which aliases stargazers). Stars = `stargazers_count`. Forks = `forks_count`. Issues = `open_issues_count`. License = `license.spdx_id` ?? `license.name`. 401 → `fail_run` (existing `classifyGithubHttp`). 404 → `fail_widget`. Missing `full_name` on 200 → widget empty card “No repo data”. Http module MUST NOT grow a github client. Github module MUST NOT import the http chips expander.
- **Why:** Owner crawl is the expensive stats/languages path. One repo card must not list 500 owner repos. Demo does not need that crawl either.
- **Alternative:** Reuse crawl and pick one repo by name — rejected (rate limit + wrong language source). Alternative: GraphQL `repository(owner,name)` — rejected; lock is REST GET. Alternative: keep demo crawl and only skip for repo — rejected; lock is demo+repo skip.

### 4. Primer 480×160 REST card, not chips badge row

- **Choice:** Widget folder `packages/plugins/src/github/widgets/repo/` mirroring stats (`widget.tsx` + render helper). Chrome: `Theme` / `Frame` / `Stack` / `Row` / `Text` / `Muted` / `Avatar` / `Divider` / `Chip` wrapping `Stat` (same as stats). Optional avatar from `owner.avatar_url`. Include tokens become chips. Do **not** use http split Chip (`label` + `message` + `messageColor`). Card 480×160 baked still. Template fetch none.
- **Why:** DESIGN.md Primer-adjacent github cards. Chips is http pack shorthand for badge JSON. Mixing those chromes would collapse two product surfaces.
- **Alternative:** Reuse chips template with github types — rejected.

### 5. Engine and github render adapter

- **Choice:** `EnabledWidget` += `{ id: "repo"; options: RepoOptions }`. `enabledWidgets` reads `config.plugins.github?.widgets?.repo`. `hasEnabledGithubWidget` includes repo. `preflightWidget` treats repo like demo (`render`, skip `include_private`). `createGithubRenderWidget` handles `repo`. `createRenderWidget` github branch includes `repo`. Engine stays a port (injected `renderWidget`; no HTTP). Github `fail_widget` keeps the current throw. Repo 404 is `fail_widget`; repo 401 is `fail_run`.
- **Why:** Unlike http chips (which deferred `main.ts` while json wiring landed), github already has an Action renderer. Repo MUST paint in production in this change.
- **Alternative:** Library-only widget without Action wiring — rejected; github render path already exists.

### 6. Playground fixtures; POST is not an embed API

- **Choice:** Add `repo` to docs github `PREVIEW_WIDGET_IDS`. Fixture JSON under the github integration (playground wraps it; zero live GitHub without an App token). `/playground/github/repo` uses the existing `[widget]` route. Keep `POST /api/preview` as layout/time-axis preview (`Cache-Control: no-store`, no GET embed). Do not add `repo` to http playground. Do not document preview as a CDN.
- **Why:** User locked playground fixtures in this change (chips deferred http UI; github playground already exists).
- **Alternative:** Live `GET /repos` from the docs app with the visitor token as the only path — rejected as the no-token default; fixtures first.

### 7. Flatten ban and thin Action surface

- **Choice:** `BANNED_FLATTENED_INPUT_NAMES += "plugin_github_repo_include"` (already matches `plugin_github_repo_*` via the flatten regex; keep the explicit ban). Generated `action.yml` MUST remain thin: existing `plugin_github` pack bool only. No `plugin_github_repo`. `just generate-action --check`.
- **Why:** Same lock as stats include and chips preset.
- **Alternative:** Thin `plugin_github_repo` bool — rejected.

### 8. Consumer pin mentioned, marketplace-release untouched

- **Choice:** Design and docs/examples MAY show `uses: wyattowalsh/profile-bits@v1`. This change MUST NOT edit `openspec/changes/marketplace-release/**`, MUST NOT tag `v1` at `main`, and MUST NOT commit `dist/`.
- **Why:** Listing pin is a sibling change. Repo widget planning must not collide with it.
- **Alternative:** Update marketplace-release in this folder — rejected by exclusive glob.

### 9. Exclusive-glob apply graph

- **Choice:** One writer per exclusive file. Never two agents on `types.ts`, `parse-config.ts`, `flatten.ts`, `action.yml`, `engine.ts`, `render.ts`, `render-github.ts`, `clients.ts`, `rest.ts`, `client.ts`, `packages/plugins/src/github/plugin.ts`, `packages/plugins/src/index.ts`, `apps/docs/src/preview/types.ts`.
- **Waves:** H0 this folder (planning). H1 types catalog. H2 rest/client. H3 widget + plugin registry + barrel. H4 action engine/render. H5 docs preview. H6 examples. H7 tests. H8 AGENTS.md ×6. H9 parent `just lint && just test && just generate-action --check`.
- **H3.plugin:** `widgets: ["demo","stats","languages","repo"]`; `defaults.widgets` stays `["stats","languages"]`; `integrations` stays `["static","github"]`; `bitsUsed` += Avatar/Chip/Stat as needed.
- **Why:** Disjoint globs; stats/languages crawl and chips must not be clobbered.
- **Alternative:** Serialize all apply — rejected.

### 10. Tests: fixtures, injected client, zero live network

- **Choice:** Hand-authored repo REST fixture (200 with counts + language + license; 200 empty/missing full_name; 404; 401). Widget tests: `vi.spyOn(globalThis, "fetch")` unused in template; empty → “No repo data”; 480×160 baked still. Client tests: demo and repo do not hit `/users/{login}/repos`; repo hits `/repos/{owner}/{repo}` only; never `/languages`. Engine tests: injected `renderWidget`; yaml repo enablement; pack defaults still omit repo. `just generate-action --check` asserts no `plugin_github_repo`.
- **Why:** Live GitHub in CI is flaky and fights never-unauth.
- **Alternative:** Capture live repo JSON in CI — rejected.

## Risks / Trade-offs

- [Fifth pack sneaks in] → Append widget id on `github` only; specs forbid a new plugin id.
- [Repo becomes a pack default] → Keep `GITHUB_PACK_DEFAULT_WIDGETS` as stats+languages; tests for omit-repo and `plugin_github: true`.
- [Demo still crawls] → `loadPayload` skip crawl for demo **and** repo; client tests assert no owner-repo listing.
- [Repo language uses GraphQL bytes or REST `/languages`] → Single GET; map `language` string only; forbid `/languages` in rest tests.
- [watchers_count aliases stars] → Map watchers from `subscribers_count`.
- [401 classified as fail_widget like http] → Reuse `classifyGithubHttp` (401 `fail_run`, 404 `fail_widget`).
- [Chips chrome on repo] → Stats-style Chip+Stat; no split Chip; no shieldcn URLs.
- [Flattened `plugin_github_repo_include`] → Explicit ban + `--check`.
- [Playground treated as embed CDN] → Fixtures; POST only; noindex/no-store already specified.
- [Marketplace-release collision] → Do not edit that change; pin is mention-only.
- [types.ts clobber of chips/json/feed] → Read first; append `repo` only.
- [In-flight types already present] → Types task is complete-or-verify; do not revert catalog fields.

## Migration Plan

Greenfield additive widget on an existing pack. Default committed yaml stays stats+languages; existing github yaml keeps working. Consumers who want the card add `plugins.github.widgets.repo` and pin `wyattowalsh/profile-bits@v1`. Apply follows `tasks.md`. Rollback: omit `widgets.repo`; delete this change folder before archive. Do not archive, tag, or commit unless asked.

## Open Questions

(none — yaml shape, crawl skip, single-repo GET, 401/404, empty card, chips distinction, playground fixtures, and marketplace-release non-edit are locked above)
