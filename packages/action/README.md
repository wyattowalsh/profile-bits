# Profile Bits widgets

GitHub Action that renders profile widgets and **commits widget files**. Config SSOT is committed yaml at `.github/profile-bits.yml`. The Action does **not** patch consumer `README.md`.

Pin the orphan release tag:

```yaml
- uses: wyatt/profile-bits@v1
```

`v1` / `@v1` is the orphan `release/v1` tree only. Never tag `v1` at `main`. `dist/` is gitignored on `main`. Runtime is Node 24 (`runs.using: node24`).

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
      - uses: wyatt/profile-bits@v1
        with:
          github_token: ${{ github.token }}
          committer_token: ${{ github.token }}
          config: .github/profile-bits.yml
          output_action: commit
```

## Thin inputs

Widget options live in yaml. There are **no** flattened `plugin_<plugin>_<widget>_<option>` Action inputs.

| Input | Notes |
| --- | --- |
| `user` | GitHub login. Default repository owner. |
| `github_token` | API token. Omitted uses `${{ github.token }}`. Empty / `""` / whitespace **fails the job**. Never unauthenticated GitHub. |
| `committer_token` | Token for commit, pull-request, and gist. |
| `config` | Yaml path. Default `.github/profile-bits.yml`. |
| `output_action` | `none` \| `commit` \| `pull-request` \| `gist`. Default `commit`. |
| `dry_run` | Render without publish. |
| `format` / `theme` / `output_pair` / `animated` | Optional overrides. |
| `plugin_github` | Optional. Yaml **beats** `plugin_github` when the config file exists. |
| `wakatime_token` | Optional. No default. Required only when yaml enables `plugins.wakatime`. |
| `http_token_env` | Optional. Env **name** (not a token value). No default. |

## First-party packs

| Plugin | Widgets |
| --- | --- |
| `github` | `demo`, `stats`, `languages` |
| `wakatime` | `coding` |
| `rss` | `feed` |
| `http` | `json`, `chips` |
