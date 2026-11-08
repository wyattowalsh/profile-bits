## ADDED Requirements

### Requirement: Optional required-auth Action tokens have no default
`ActionInputsSchema` MUST include optional `wakatime_token`, `spotify_token`, and `steam_token` as strings with **no default** (wakatime_token pattern). `http_token_env` MUST remain an optional environment variable **name** with no default. Generated `action.yml` MUST omit `default:` for those four inputs. Pack-off MUST NOT require `spotify_token` or `steam_token`. This change MUST NOT add `plugin_spotify`, `plugin_steam`, `plugin_wakatime`, `plugin_rss`, or `plugin_http` bools. This change MUST NOT add first-party plugin, widget, or integration ids.

#### Scenario: Optional spotify_token has no default
- **WHEN** root `action.yml` is generated or validated
- **THEN** it MUST declare `spotify_token` with no `default` and MUST NOT declare `plugin_spotify`

#### Scenario: Optional steam_token has no default
- **WHEN** root `action.yml` is generated or validated
- **THEN** it MUST declare `steam_token` with no `default` and MUST NOT declare `plugin_steam`

#### Scenario: Existing wakatime_token and http_token_env keep no default
- **WHEN** root `action.yml` is generated or validated
- **THEN** it MUST declare `wakatime_token` and `http_token_env` with no `default`

#### Scenario: Schema keys equal generated action.yml
- **WHEN** `generate-action --check` runs
- **THEN** `ActionInputsSchema` keys MUST equal generated thin input names and MUST NOT include flattened `plugin_*_*_*` names

## MODIFIED Requirements

### Requirement: Thin Marketplace inputs
Root `action.yml` MUST expose only these inputs. Breaking a thin input MUST be semver major. Widget options MUST NOT appear as Action inputs. Optional `wakatime_token` (no default), optional `http_token_env` (no default, env **name**), optional `spotify_token` (no default), and optional `steam_token` (no default) are part of this thin set.

| Input | Contract |
| --- | --- |
| `user` | GitHub login to render. Default `github.repository_owner`. |
| `github_token` | API token. Default `${{ github.token }}` when the input is **omitted**. |
| `committer_token` | Git token for commit, pull-request, and gist. Default `${{ github.token }}`. |
| `config` | Path to yaml SSOT. Default `.github/profile-bits.yml`. |
| `plugin_github` | Optional bool. Pack defaults (`stats`, `languages`) only when the config file is absent. |
| `wakatime_token` | Optional WakaTime API key. No default. Required when yaml `plugins.wakatime` is on; empty/`""`/whitespace then fails the job. Pack off MUST NOT require it. |
| `http_token_env` | Optional **name** of a process environment variable holding an HTTP Bearer token (not a token value, not `INPUT_*`). No default. Unset or whitespace name sends no Authorization. |
| `spotify_token` | Optional Spotify refresh token. No default. Reserved for a later oauth-refresh pack; pack off MUST NOT require it. Empty/`""`/whitespace is missing. |
| `steam_token` | Optional Steam Web API key. No default. Reserved for a later query-key pack; pack off MUST NOT require it. Empty/`""`/whitespace is missing. MUST NOT be sent as Bearer. |
| `format` | Optional override of yaml `format`. |
| `theme` | Optional named catalog id override of yaml `theme`. `theme: custom` as an Action input fails. |
| `output_pair` | Optional override of yaml `output_pair`. |
| `animated` | Optional override of yaml `animated`. |
| `output_action` | `none` \| `commit` \| `pull-request` \| `gist`. Default `commit`. |
| `committer_branch` | Optional branch for widget-file commits. |
| `committer_gist` | Optional gist id when `output_action` is `gist`. |
| `output_condition` | `always` \| `data-changed`. |
| `timezone` | Optional IANA timezone override. |
| `dry_run` | When true, render without commit, pull-request, or gist. |
| `allow_skipped` | When true, the job MUST NOT fail solely because every github widget was skipped. Default `false`. |

#### Scenario: Allowed input names
- **WHEN** root `action.yml` is generated or validated
- **THEN** it MUST declare exactly the thin inputs listed above (no additional Marketplace option inputs)

#### Scenario: Omitted github_token uses workflow token
- **WHEN** the consumer omits `github_token` from the workflow
- **THEN** the Action MUST use `${{ github.token }}` as the API token

#### Scenario: Optional wakatime_token has no default
- **WHEN** root `action.yml` is generated or validated
- **THEN** it MUST declare `wakatime_token` with no `default` and MUST NOT declare `plugin_wakatime`

#### Scenario: Optional http_token_env is an env name
- **WHEN** root `action.yml` is generated or validated
- **THEN** it MUST declare `http_token_env` with no `default` as an environment variable **name** (not a token value) and MUST NOT declare `plugin_http`
