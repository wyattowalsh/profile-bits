## 1. Proposal artifacts

- [x] 1.1 Write `openspec/changes/add-github-repo-widget/.openspec.yaml` with `schema: spec-driven`.
- [x] 1.2 Write `proposal.md` (Why / What Changes / Capabilities / Impact).
- [x] 1.3 Write `design.md` (Context, Goals / Non-Goals, Decisions, Risks, Migration).
- [x] 1.4 Write `specs/plugin-contract/spec.md` (opt-in `repo`; v0 set unchanged; pack defaults stats+languages; no `plugin_github_repo_*`).
- [x] 1.5 Write `specs/widget-contract/spec.md` (frozen repo options, empty “No repo data” card, fetch none).
- [x] 1.6 Write `specs/integration-contract/spec.md` (single-repo GET; crawl stats/languages only; never REST `/languages`; demo+repo skip crawl).

## 2. Types catalog

- [x] 2.1 Types exclusive: `packages/core/src/types.ts` only. **Read first.** Append `FIRST_PARTY_WIDGET_IDS += "repo"` and `WIDGET_INTEGRATIONS.repo = ["github"]` if missing. Do **not** add plugin or integration ids. Do **not** replace id arrays. Keep `demo` / `stats` / `languages` / `coding` / `feed` / `json` / `chips`. Keep `GITHUB_PACK_DEFAULT_WIDGETS = ["stats","languages"]`. Add `REPO_FILENAME_DEFAULT = "repo"`, `REPO_INCLUDE_TOKENS` (`stars`, `forks`, `watchers`, `issues`, `license`, `language`), `REPO_INCLUDE_DEFAULT = ["stars","forks","issues","license"]`, `REPO_AVATAR_DEFAULT = true`, `REPO_ANIMATE_DEFAULT = false`, `GITHUB_REPO_FULL_NAME` / `GithubRepoFullNameSchema` (`owner/name`). `RepoOptionsSchema` strictObject: required `repo`, `filename`, `include` (min 1, superrefine unique / dedupe preserve order), `avatar`, `animate`. **No `url`. No `headers`. No `bits`. No `include_private` / `include_forks` / `include_archived`.** `GithubWidgetsConfigSchema`: optional `repo` beside demo/stats/languages. FORBIDDEN: `plugin_github_repo` bool; fifth first-party pack; making `repo` a pack default; editing `openspec/specs/**`; editing `openspec/changes/marketplace-release/**`.
- [x] 2.2 Parse exclusive: `packages/core/src/parse-config.ts` + `parse-config.test.ts` (and `config.ts` only if needed). Parse `plugins.github.widgets.repo`. Required `repo: owner/name`. Missing `repo` or no `/` fails. Unknown include token fails. Empty include fails. Extra keys (`url`, `headers`, `bits`, `include_private`) fail. Default yaml stays stats+languages without repo. `plugin_github: true` without config file does not enable repo. PLAN_DEFAULT_YAML still equals DEFAULT_CONFIG. FORBIDDEN: pack defaults that auto-enable repo.
- [x] 2.3 Flatten exclusive: `packages/core/src/codegen/flatten.ts` + generate-action tests. `BANNED_FLATTENED_INPUT_NAMES += "plugin_github_repo_include"`. No `plugin_github_repo` thin input. `just generate-action --check`.

## 3. REST / client

- [x] 3.1 REST exclusive: `packages/integrations/src/github/rest.ts` + `rest.test.ts`. Add authenticated `GET /repos/{owner}/{repo}` helper that reuses the run-scoped REST cache `(method, url, params)`. Map `stargazers_count`, `forks_count`, `subscribers_count` (watchers), `open_issues_count`, `license.spdx_id` ?? `license.name`, `language` string, `owner.avatar_url`, `full_name`. `GITHUB_REST_DEPENDENT_WIDGETS` stays `["stats","languages"]`. NEVER call REST `/languages`. NEVER unauthenticated. 401 → `fail_run`. 404 → `fail_widget`. Unit tests with injected fetch, **zero network**. FORBIDDEN: owner-list crawl inside the repo GET; GraphQL `nodes(ids:)` for repo language; http chips expander.
- [x] 3.2 Client exclusive: `packages/integrations/src/github/client.ts` + `client.test.ts`. Skip user crawl (`GET /users/{login}` + paginated owner repos) when `widget` is `demo` or `repo`. Repo loads via the single-repo GET. Stats/languages keep crawl + GraphQL languages. Demo MUST NOT crawl to render. Probe `GET /user` MAY still run once per client. Tests: demo/repo issue no `/users/{login}/repos`; repo hits `/repos/{owner}/{repo}` only; never `/languages`. Zero network.
- [x] 3.3 Fixtures exclusive: github repo fixture JSON for playground/tests (200 with counts + language + license; 200 missing `full_name`; 404/401 shapes as needed). Hand-authored. Zero live GETs.

## 4. Widget

- [x] 4.1 Plugin registry exclusive: `packages/plugins/src/github/plugin.ts` + `plugin.test.ts`. `widgets: ["demo","stats","languages","repo"]`. `integrations: ["static","github"]`. `defaults.widgets` stays `["stats","languages"]`. `bitsUsed` includes Theme/Frame/Stack/Row/Text/Muted/Avatar/Divider/Chip/Stat as needed for repo. Do not create a new pack.
- [x] 4.2 Widget exclusive new `packages/plugins/src/github/widgets/repo/{index,template,widget,render}.ts(x)` as needed. Primer 480×160 GitHub REST card (Chip wrapping Stat, optional Avatar). Consume cached repo payload only. Template/widget: no `fetch`. fromJsx + `assertTakumiTree` + `renderSvg`. Empty / missing `full_name` → “No repo data”. Zeros render for included counts. Null license/language omit those chips. Import bits + renderer only. No `takumi-js` / `@takumi-rs/*` in widgets. No http split Chip. No shieldcn/shields URLs.
- [x] 4.3 Barrel exclusive: `packages/plugins/src/index.ts` after 4.2. Export repo render helpers additively. Do not clobber demo/stats/languages/json/chips/feed/coding exports.

## 5. Action engine / render

- [x] 5.1 Engine exclusive: `packages/action/src/engine.ts` + `engine.test.ts`. `EnabledWidget` union += `{ id: "repo"; options: RepoOptions }`. `enabledWidgets` reads `config.plugins.github?.widgets?.repo`. Repo skips `include_private` preflight (`render`). Github `fail_widget` keeps current throw. Repo MUST NOT join http-only `decideHttpOnlyRunFailed`. Engine MUST NOT import integrations/plugins or perform HTTP. Tests with injected `renderWidget` (no network): yaml repo enabled; pack defaults omit repo; repo-only is not “no github widgets”. FORBIDDEN: flattened Action inputs; constructing a second github client.
- [x] 5.2 Clients exclusive: `packages/action/src/clients.ts` (+ tests). `hasEnabledGithubWidget` is true when `widgets.repo` is present (also demo/stats/languages). At most one github client per run. Repo-only yaml still constructs the github client.
- [x] 5.3 Render exclusive: `packages/action/src/render-github.ts` + `render.ts` (+ tests). Dispatch widget id `repo`. Pass yaml `repo` into the client load. Map client errors: 401 `fail_run`, 404 `fail_widget`. Do not send `repo` to the http adapter. Do not put http ids in `render.ts`. FORBIDDEN: REST `/languages` from the Action; live GitHub in tests.

## 6. Docs preview

- [x] 6.1 Docs exclusive: `apps/docs/src/preview/types.ts` and github playground wiring. `PREVIEW_WIDGET_IDS += "repo"`. Schema-derived repo fields (`repo`, `include`, `filename`, `avatar`, `animate`). Fixture-backed preview. `POST /api/preview` remains layout preview (`Cache-Control: no-store`); GET embed MUST stay rejected. Zero live GitHub without an App token. Do **not** add `repo` to http playground. Do **not** add `chips` to github widget ids. FORBIDDEN: documenting preview as a public embed API; editing `openspec/changes/marketplace-release/**`.

## 7. Examples

- [x] 7.1 Examples exclusive under `examples/`. Add yaml showing opt-in github `repo` (`repo: wyattowalsh/profile-bits`, include stars/forks/issues/license). Consumer `examples/profile-bits.yml` stays stats+languages. Toolkit `.github/profile-bits.yml` is demo+repo+chips+rss (Wave 3), not pack defaults. README/example snippets MAY mention consumer pin `wyattowalsh/profile-bits@v1`. MUST NOT edit marketplace-release. MUST NOT tag `v1` at `main`.

## 8. Tests

- [x] 8.1 REST/client tests if not completed in 3.x: crawl skip for demo+repo; single GET `/repos/{owner}/{repo}`; never `/languages`; 401 `fail_run`; 404 `fail_widget`; watchers from `subscribers_count`. Zero network.
- [x] 8.2 Widget tests exclusive under `packages/plugins/src/github/widgets/repo/`. Fixture → SVG 480×160; no `<style>` / `@keyframes` / SMIL / `foreignObject`; `vi.spyOn(globalThis, "fetch")` unused in template; empty → “No repo data”; zeros render; distinct from chips split Chip.
- [x] 8.3 Accept test: yaml repo + injected github fetch map (fixture JSON) → `renderSvg` 480×160. Zero live network.
- [x] 8.4 Engine/parse/flatten tests (if not done in 2.x / 5.x): pack defaults omit repo; missing `repo` fails parse; `plugin_github_repo_include` banned; `plugin_github_repo` absent from generated `action.yml`; `enabledWidgets` includes repo when yaml present.
- [x] 8.5 `just generate-action --check`. Assert generated `action.yml` has no `plugin_github_repo`, no `plugin_github_repo_*`, and still has `plugin_github`.

## 9. AGENTS.md

- [x] 9.1 AGENTS.md ×6 (one writer): root, `packages/core/AGENTS.md`, `packages/plugins/AGENTS.md`, `packages/integrations/AGENTS.md`, `packages/action/AGENTS.md`, `apps/docs/AGENTS.md`. Document widget `repo` on pack `github`; opt-in like demo; pack defaults still stats+languages; authenticated `GET /repos/{owner}/{repo}` only; never REST `/languages`; language string from the repo object; demo+repo skip user crawl; playground fixtures; `POST /api/preview` is not an embed API; no flattened `plugin_github_repo_*`; no `plugin_github_repo` Action input; distinct from http `chips`. MUST NOT edit repo `README.md` unless an examples task owns a snippet. MUST NOT edit `openspec/specs/**` or `openspec/changes/marketplace-release/**`.

## 10. Verify

- [x] 10.1 After tests: `just lint && just test && just generate-action --check`. Fix failures on the owning glob only. Do not commit. Do not push. Never two writers on `types.ts`, `parse-config.ts`, `flatten.ts`, `rest.ts`, `client.ts`, `plugin.ts`, `engine.ts`, `render-github.ts`, `render.ts`, `clients.ts`, `packages/plugins/src/index.ts`, `action.yml`, or `pnpm-lock.yaml`.
- [x] 10.2 Confirm FORBIDDEN files were not edited: `openspec/specs/**`, `openspec/changes/marketplace-release/**`. Confirm no fifth first-party plugin id. Confirm consumer pin mention is `wyattowalsh/profile-bits@v1` and `v1` was not tagged at `main`. Consumer `examples/profile-bits.yml` omits `repo`. Toolkit `.github/profile-bits.yml` is demo+repo+chips+rss (Wave 3 showcase, not pack defaults).
