---
name: render
description: >-
  Consumer skill. Write/update `.github/profile-bits.yml` and thin workflow YAML, run `just render` or `pnpm render -- --json --no-input`, paste relative `![](./profile-bits/…)` README embeds. NOT for authoring packages/**, MCP, Marketplace flatten, plugin marketplace, local plugin loaders, GitHub App, VS Code, or documenting POST /api/preview as an embed API.
license: MIT
compatibility: Requires the profile-bits repo and the profile-bits CLI (`just render` / `pnpm render`); yaml SSOT `.github/profile-bits.yml`; thin Action inputs.
metadata:
  author: profile-bits
  version: "0.1.0"
---

# Render (consumer)

Consumer README helper. Write yaml and thin workflow YAML, run the **existing**
local CLI, paste relative README embeds. Do **not** fetch, render, or invent a
second engine. README delivery in production is the Action committing widget
files; `just render` / `pnpm render` is the same engine locally.

## Do this

1. Write or update `.github/profile-bits.yml` (config SSOT,
   `additionalProperties: false`).
2. Write or update a thin GitHub Actions workflow (thin `with:` keys only).
3. Run `just render` or `pnpm render`. Agents and CI should pass
   `-- --json --no-input --quiet`.
4. Paste relative README embeds for the files the CLI wrote.
5. Stop. Do not author `packages/**`.

## Run the local CLI

Default CLI `output_action` is `none`: write files under yaml `output_dir`
(default `profile-bits/`). Do not commit, open a pull request, or update a gist
unless the user asked. Do not invent a second renderer. Do not call
`POST /api/preview` (docs layout preview only, not an embed API).

```bash
just render
pnpm render
```

Agent / CI (JSON on stdout, no prompts, quiet stderr):

```bash
just render -- --json --no-input --quiet
pnpm render -- --json --no-input --quiet
```

`--json` stdout is `{ files, skipped, did_commit }`. Tokens must never appear
in stdout, stderr, JSON, yaml, README, or command logs.

Gist only when the user asked:

```bash
just render -- --output-action gist
pnpm render -- --output-action gist
```

`--output-action` values are `none` | `commit` | `pull-request` | `gist`.
Action Marketplace default `commit` is unchanged; local CLI default is `none`.

## Yaml SSOT

Committed `.github/profile-bits.yml` is the option SSOT. Widget options live
here, never as flattened Action inputs. Yaml present beats `plugin_github`.
Unknown keys fail parse.

Default github-only shape:

```yaml
version: 1
format: svg
theme: dark
output_pair: false
animated: false
timezone: UTC
output_dir: profile-bits
plugins:
  github:
    widgets:
      stats:
        filename: stats
        include: [followers, repos, stars]
        hide_rank: true
        avatar: true
        animate: false
        include_private: false
        include_forks: false
        include_archived: false
      languages:
        filename: languages
        limit: 8
        min_pct: 1
        exclude: []
        animate: false
        include_private: false
        include_forks: false
        include_archived: false
```

Customize with **first-party** packs already in the product, not a user plugin
loader:

| Pack | Widgets | Notes |
| --- | --- | --- |
| `github` | `demo`, `stats`, `languages` | Default committed yaml. |
| `wakatime` | `coding` | Needs `WAKATIME_TOKEN`. Empty `plugins.wakatime: {}` enables `coding`. |
| `rss` | `feed` | Required `widgets.feed.url`. |
| `http` | `json`, `chips` | `{}` is widget-less. `json` needs https `url`. `chips` needs `preset` + `types`. Optional `http_token_env` is an **env var name**, not a token. |

Do not add a fifth first-party pack. Do not invent a local plugin loader.

## Thin workflow YAML

Workflow `with:` keys must be thin Action inputs only (`user`, `github_token`,
`committer_token`, `config`, `output_action`, `dry_run`, optional
`format` / `theme` / `output_pair` / `animated`, optional `plugin_github`,
optional `wakatime_token`, optional `http_token_env`, plus `committer_branch`,
`committer_gist`, `output_condition`, `timezone`, `allow_skipped`). Never
`plugin_<plugin>_<widget>_<option>`. Never `plugin_wakatime`, `plugin_rss`, or
`plugin_http` bools.

Pin `@v1` (orphan release tag), not `main`:

```yaml
name: Profile Bits
on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:
permissions:
  contents: write
jobs:
  profile-bits:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: wyatt/profile-bits@v1
        with:
          user: ${{ github.repository_owner }}
          github_token: ${{ github.token }}
          committer_token: ${{ github.token }}
          config: .github/profile-bits.yml
          output_action: commit
```

Use `${{ secrets.WAKATIME_TOKEN }}` / `${{ secrets.* }}` for extra tokens.
Never paste token literals into yaml.

## README embeds

Default delivery is **relative committed files**. After a local render:

```md
![](./profile-bits/stats.svg)
![](./profile-bits/languages.svg)
```

Match `output_dir` + widget `filename` + format. Dark pair files are
`filename-dark` when `output_pair: true`. Do not use gist URLs as a CDN. Do
not treat `/generate/catalog` as an embed host. Gist is an optional
`output_action`, not a CDN.

## Tokens

Never put tokens in yaml, README, workflow literals, or command logs.

| Secret | Where |
| --- | --- |
| GitHub API | env `GITHUB_TOKEN` then `GH_TOKEN`; workflow `${{ github.token }}` |
| WakaTime | env `WAKATIME_TOKEN`; workflow secret; required only when the wakatime pack is on |
| HTTP Bearer | `http_token_env` names a process env var; the value stays in env |

Empty / `""` / whitespace github token fails. Never unauthenticated GitHub.

## Catalog is not a marketplace

`/generate/catalog` is a first-party visual gallery (currently github widgets
`demo`, `stats`, and `languages`). It is not a plugin marketplace or a store.
Product yaml packs remain `github` / `wakatime` / `rss` / `http`.
Customization is yaml plus first-party `http` / `rss` / `chips`, not a user
plugin loader. Do not add the word `yaml` to the catalog page.

## Refuse (NOT-for)

Do not use this skill to:

- Author `packages/**` (integrations, widgets, packs). Point at sibling plugin
  `.agents/profile-bits` skills `author` / `author-bit` /
  `author-palette` / `author-integration` / `author-widget` /
  `author-plugin`.
- Reimplement fetch, Takumi render, or a second CLI engine
- Add MCP (`mcp.json`) or Marketplace flattened `plugin_*_*_*` inputs
- Build a plugin marketplace, local plugin loader, GitHub App, or VS Code
  extension
- Document `POST /api/preview` as a public embed API
- Treat gist as a CDN or the docs catalog as a store

Redirect those requests. Do not implement them here.

## Proof

From the plugin root:

```bash
bash scripts/validate.sh
pnpm dlx skills-ref@0.1.5 validate skills/render
```
