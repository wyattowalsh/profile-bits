## Why

GitHub pack widgets already paint user-level stats and language bytes from the owner-repo crawl, but consumers still need a yaml-opt-in card for one repository (`owner/name`) without a fifth pack, a new integration id, or http `chips` badge chrome. This change adds widget `repo` on the existing `github` pack so a Primer 480×160 REST card can render stars, forks, watchers, issues, license, and the repo object `language` string from authenticated `GET /repos/{owner}/{repo}` only.

## What Changes

- Stay on first-party pack `github` and integration `github`. Add widget id `repo` (new widget, not a new plugin or integration). Do **not** invent a fifth first-party pack. Catalog remains `github`, `wakatime`, `rss`, and `http`. Http widget `chips` stays a different surface (shieldcn / shields badge row on pack `http`).
- Opt-in like `demo`. Pack defaults remain `stats` + `languages`. `plugin_github: true` without yaml still enables only those defaults. Widget `repo` MUST NOT become a pack default. Github v0 widget set remains `demo`, `stats`, and `languages` (repo is additive post-v0, same pack).
- Yaml-only enablement. Repo is on only when `plugins.github.widgets.repo` is present with required `repo: owner/name`. No `plugin_github_repo` Action input. No flattened `plugin_github_repo_*` Marketplace inputs.
- Frozen options: required `repo` (`owner/name`); `include` tokens `stars`, `forks`, `watchers`, `issues`, `license`, `language` (defaults `stars`, `forks`, `issues`, `license`); `filename` default `repo`; `avatar` default true; `animate` default false.
- Authenticated `GET /repos/{owner}/{repo}` only. Never REST `/languages`. Language MUST be the REST repo object `language` string only (not GraphQL `nodes(ids:)` bytes and not `GET /repos/{owner}/{repo}/languages`). 401 MUST `fail_run`. 404 MUST `fail_widget`. Empty payload MUST render “No repo data”.
- Skip the user crawl (`GET /users/{login}` + paginated owner repos) for `demo` and `repo`. Crawl remains `stats` / `languages` only.
- Playground fixtures for github widget `repo`; `POST /api/preview` remains layout preview, not a public embed API.
- Example yaml:

```yaml
plugins:
  github:
    widgets:
      repo:
        filename: repo
        repo: wyattowalsh/profile-bits
        include: [stars, forks, issues, license]
```

## Capabilities

### New Capabilities

- (none — repo is a widget on the existing `github` pack / `github` integration; not a fifth pack and not a new integration id)

### Modified Capabilities

- `plugin-contract`: Github pack widgets include opt-in `repo`. Github v0 set `demo` / `stats` / `languages` unchanged. Pack defaults remain `stats` + `languages`; `repo` does not become a pack default. No `plugin_github_repo` Action input. No flattened `plugin_github_repo_*` inputs.
- `widget-contract`: ADDED frozen `repo` options, empty “No repo data” card, and fetch none in the template.
- `integration-contract`: ADDED single-repo authenticated GET; crawl still stats/languages only; never REST `/languages`; demo and repo skip the user crawl.

## Impact

- Specs: MODIFIED deltas under this change for `plugin-contract`, `widget-contract`, and `integration-contract`. After archive/sync those become the contract SSOT. Do **not** edit `openspec/specs/**` from this planning change. Do **not** edit `openspec/changes/marketplace-release/**`.
- Code (apply later; implementation is in-flight): catalog `repo` in `packages/core/src/types.ts`; `GET /repos/{owner}/{repo}` plus demo/repo crawl skip in `packages/integrations/src/github/`; widget under `packages/plugins/src/github/widgets/repo/`; engine + github render adapter; docs playground fixtures; examples; tests; AGENTS.md. No flattened `plugin_github_repo_*`. No `plugin_github_repo` thin input. No extra first-party packs.
- Consumer pin stays `wyattowalsh/profile-bits@v1` (orphan `release/v1` tree). Mention only — this change MUST NOT edit marketplace-release artifacts.
- Out of scope: fifth plugin pack; http `chips` chrome or shieldcn URLs; REST `/languages`; tagging `v1` at `main`; committing `dist/`; git commit; editing `openspec/changes/marketplace-release/**`.
