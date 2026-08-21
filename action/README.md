# Profile Bits widgets

GitHub Action that renders profile widgets and **commits widget files**. Config SSOT is committed yaml at `.github/profile-bits.yml`. The Action does **not** patch consumer `README.md`.

Pin the orphan release tag:

```yaml
- uses: wyattowalsh/profile-bits@v1
```

`v1` / `@v1` is the orphan `release/v1` tree only. Never tag `v1` at `main`. Never pin `main` — `dist/` is gitignored on `main`. Runtime is Node 24 (`runs.using: node24`).

## Usage

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
      - uses: wyattowalsh/profile-bits@v1
        with:
          github_token: ${{ github.token }}
          committer_token: ${{ github.token }}
          config: .github/profile-bits.yml
          output_action: commit
```

For `output_action: pull-request`, also set `permissions: pull-requests: write`.

## Thin inputs

Widget options live in yaml. Root `action.yml` is **thin**. There are **no** flattened `plugin_<plugin>_<widget>_<option>` Action inputs and no `plugin_wakatime` / `plugin_rss` / `plugin_http` bools.

| Input | Notes |
| --- | --- |
| `user` | GitHub login. Default repository owner. |
| `github_token` | API token. Omitted uses `${{ github.token }}`. Empty / `""` / whitespace **fails the job**. Never unauthenticated GitHub. |
| `committer_token` | Token for commit, pull-request, and gist. |
| `config` | Yaml path. Default `.github/profile-bits.yml`. |
| `plugin_github` | Optional. Yaml **beats** `plugin_github` when the config file exists. Without a config file, `true` enables github pack defaults (`stats`, `languages`; `demo` and `repo` stay opt-in). |
| `wakatime_token` | Optional. No default. Required only when yaml enables `plugins.wakatime`. Empty / whitespace with the pack on **fails the job**. |
| `http_token_env` | Optional. Env **name** (not a token value). No default. Unset sends no `Authorization`. |
| `format` | Optional override (`svg`, `png`, `jpeg`, `webp`, `ico`, `gif`, `apng`). |
| `theme` | Optional named theme id override. `theme: custom` as an Action input fails. |
| `output_pair` | Optional override. `true` writes unsuffixed `filename` (light) and `filename-dark` (dark). `false` writes the **selected** flavor only. |
| `animated` | Optional override for animated output. |
| `output_action` | `none` \| `commit` \| `pull-request` \| `gist`. Default `commit`. |
| `committer_branch` | Optional branch for widget-file commits. Default current branch. |
| `committer_gist` | Optional gist id when `output_action` is `gist`. |
| `output_condition` | `always` \| `data-changed`. |
| `timezone` | Optional IANA timezone override (for example `UTC`). |
| `dry_run` | Render without commit, pull-request, or gist. |
| `allow_skipped` | When `true`, the job may succeed if every github widget is skipped. Default `false`. |

`github_token` is still required on http-only / wakatime-only yaml. Never paste token literals into yaml, README, or workflow `with:`.

## Config SSOT

Commit `.github/profile-bits.yml`. Unknown keys fail parse.

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

Github with no widget list defaults to `stats` + `languages`. `demo` and `repo` are opt-in. `repo` requires yaml `repo: owner/name` (for example `wyattowalsh/profile-bits`).

## First-party packs

| Plugin | Widgets |
| --- | --- |
| `github` | `demo`, `stats`, `languages`, `repo` |
| `wakatime` | `coding` |
| `rss` | `feed` |
| `http` | `json`, `chips` |

Enable extra packs in yaml, not as Marketplace flatten. Empty `plugins.wakatime: {}` enables `coding` (`wakatime_token` required). `rss` needs `widgets.feed.url` (`https`). `plugins.http: {}` is widget-less; `json` needs https `url`; `chips` needs `preset` + `types` (no `url` / `headers` / `bits` on chips).

## README embeds

After the Action commits files, paste relatives that match `output_dir` + widget `filename` + format (default `profile-bits/` + `svg`):

```md
![](./profile-bits/stats.svg)
![](./profile-bits/languages.svg)
```

With `output_pair: false` (default), `stats.svg` is the **selected flavor**. With `output_pair: true`, the unsuffixed file is **light** and `filename-dark` is dark.

## Delivery

- `none`: render only (no commit, pull request, or gist).
- `commit`: commit widget files under `output_dir` only.
- `pull-request`: open a pull request with widget files (`contents: write` and `pull-requests: write`).
- `gist`: SVG only, and the token must be able to create gists (`canGist`). Installation `GITHUB_TOKEN` cannot write gists.

Gist is not a CDN. `dry_run: true` leaves the repo and gist unchanged.
