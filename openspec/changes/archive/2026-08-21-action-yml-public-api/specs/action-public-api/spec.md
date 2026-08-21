## Purpose

Defines the GitHub Marketplace public API for profile-bits: a thin root `action.yml` (inputs, outputs, Node 24 runtime), yaml-vs-`plugin_github` config precedence, commit/PR/gist delivery without README patching, and the orphan `@v1` tag policy.

## ADDED Requirements

### Requirement: Thin Marketplace inputs
Root `action.yml` MUST expose only these inputs. Breaking a thin input MUST be semver major. Widget options MUST NOT appear as Action inputs.

| Input | Contract |
| --- | --- |
| `user` | GitHub login to render. Default `github.repository_owner`. |
| `github_token` | API token. Default `${{ github.token }}` when the input is **omitted**. |
| `committer_token` | Git token for commit, pull-request, and gist. Default `${{ github.token }}`. |
| `config` | Path to yaml SSOT. Default `.github/profile-bits.yml`. |
| `plugin_github` | Optional bool. Pack defaults (`stats`, `languages`) only when the config file is absent. |
| `format` | Optional override of yaml `format`. |
| `theme` | Optional override of yaml `theme`. |
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

### Requirement: Empty github_token fails the job
Empty, `""`, or whitespace-only `github_token` MUST be treated as missing, not as an omitted input. The Action MUST fail the job. The Action MUST NOT substitute `${{ github.token }}` and MUST NOT call GitHub unauthenticated.

#### Scenario: Empty secret is not omitted
- **WHEN** `github_token` is provided as empty, `""`, or whitespace
- **THEN** the Action MUST fail the job rather than using the omitted-input default

#### Scenario: Whitespace token fails
- **WHEN** `github_token` is only spaces or tabs
- **THEN** the Action MUST fail the job

### Requirement: Yaml SSOT over plugin_github
When the config file exists at the `config` path, yaml MUST be the source of truth for plugin, widget, and option configuration. `plugin_github` MUST be ignored while that file exists. `plugin_github: true` MUST enable github pack defaults (`stats`, `languages`; `demo` remains opt-in) **only** when the config file is absent.

#### Scenario: Existing config ignores plugin_github
- **WHEN** the file at `config` exists and `plugin_github` is also set
- **THEN** configuration MUST come from yaml and `plugin_github` MUST have no effect

#### Scenario: plugin_github defaults only without config
- **WHEN** the config file is absent and `plugin_github` is true
- **THEN** the Action MUST enable github pack defaults `stats` and `languages`

### Requirement: No flattened plugin option inputs
The system MUST NOT generate Action inputs of the form `plugin_<plugin>_<widget>_<option>`, including `plugin_github_stats_include`, `plugin_github_widgets` CSV, and `plugin_github_filename_*`. Codegen `--check` MUST fail if a generated input matches `plugin_github_stats_include` or another flattened option name.

#### Scenario: Codegen check rejects flattened include
- **WHEN** generated `action.yml` contains an input named `plugin_github_stats_include` or another `plugin_<plugin>_<widget>_<option>` name
- **THEN** `generate-action --check` MUST fail

#### Scenario: Thin action.yml has no plugin_star inputs
- **WHEN** generated `action.yml` is validated
- **THEN** it MUST NOT declare any input whose name matches `plugin_*_*_*`

### Requirement: Node 24 runtime entry
`runs.using` MUST be `node24` only. `runs.main` MUST be `dist/index.js`.

#### Scenario: node24 runtime
- **WHEN** root `action.yml` is generated or validated
- **THEN** `runs.using` MUST be `node24` and `runs.main` MUST be `dist/index.js`

### Requirement: Action outputs
The Action MUST declare outputs `files`, `did_commit`, and `skipped`.

- `files` MUST list widget files written this run.
- `did_commit` MUST be true only when a git commit was created.
- `skipped` MUST list skipped widget identifiers for the run.

`dry_run: true` MUST leave `did_commit` false. A skipped widget MUST NOT appear in `files` and MUST NOT count as `data-changed`.

#### Scenario: Declared outputs
- **WHEN** the Action completes a run
- **THEN** it MUST set outputs `files`, `did_commit`, and `skipped`

#### Scenario: dry_run does not commit
- **WHEN** `dry_run` is true
- **THEN** `did_commit` MUST be false and the Action MUST NOT commit, open a pull request, or update a gist

### Requirement: output_action modes
`output_action` MUST be one of `none` \| `commit` \| `pull-request` \| `gist` (default `commit`).

- `none`: render only; MUST NOT commit, open a pull request, or update a gist.
- `commit`: commit widget files.
- `pull-request`: open a pull request with widget files.
- `gist`: publish via gist. `gist` MUST require yaml or override `format: svg` **and** `canGist`. Non-svg gist MUST fail with a clear error. `output_action: gist` without `canGist` MUST fail the run.

#### Scenario: gist requires svg and canGist
- **WHEN** `output_action` is `gist` and format is `svg` and `canGist` is true
- **THEN** the Action MUST publish the SVG widget files via gist (update `committer_gist` when that id is set)

#### Scenario: gist without canGist fails the run
- **WHEN** `output_action` is `gist` and the token cannot create gists (`canGist` is false)
- **THEN** the run MUST fail

#### Scenario: gist with non-svg format fails
- **WHEN** `output_action` is `gist` and format is not `svg`
- **THEN** the run MUST fail with a clear error

#### Scenario: none does not publish
- **WHEN** `output_action` is `none`
- **THEN** the Action MUST render widgets and MUST NOT commit, open a pull request, or update a gist

### Requirement: Action commits widget files only
The Action MUST commit widget files under `output_dir` only. The Action MUST NOT patch consumer `README.md`. Playground and examples are allowed to emit markdown for the user to paste; that emission is not an Action write to `README.md`.

#### Scenario: README is not patched
- **WHEN** the Action runs with `output_action: commit`
- **THEN** widget files MUST be written under `output_dir` and `README.md` MUST NOT be modified by the Action

### Requirement: Consumer workflow permissions
Documented consumer workflows MUST set `permissions: contents: write`. When `output_action` is `pull-request`, they MUST also set `permissions: pull-requests: write`.

#### Scenario: Commit needs contents write
- **WHEN** a consumer uses `output_action: commit`
- **THEN** the documented workflow MUST include `permissions: contents: write`

#### Scenario: Pull request needs pull-requests write
- **WHEN** a consumer uses `output_action: pull-request`
- **THEN** the documented workflow MUST include `permissions: contents: write` and `permissions: pull-requests: write`

### Requirement: Consumer example triggers
Documented consumer examples MUST use `on: schedule` plus `workflow_dispatch`. Examples MUST NOT use bare `on: push` as the trigger.

#### Scenario: Example uses schedule and workflow_dispatch
- **WHEN** a consumer workflow example is published
- **THEN** it MUST declare `on: schedule` and `on: workflow_dispatch` and MUST NOT use bare `on: push`

### Requirement: Commit message skip ci
The default widget commit message MUST include `[skip ci]`. When `committer_token` is a user PAT that should retrigger downstream workflows, the commit message MUST omit `[skip ci]`. Installation-token commits MUST include `[skip ci]`.

#### Scenario: Default commit message skips CI
- **WHEN** the Action commits widget files with the default workflow `committer_token`
- **THEN** the commit message MUST include `[skip ci]`

#### Scenario: Retrigger PAT omits skip ci
- **WHEN** `committer_token` is a user PAT that should retrigger workflows
- **THEN** the commit message MUST NOT include `[skip ci]`

### Requirement: dist gitignore and orphan v1 tag
`dist/` MUST be gitignored on `main` and committed only on the orphan `release/v1` tree. Floating tag `v1` / consumer pin `@v1` MUST point at that orphan tree. The project MUST NOT tag `v1` at `main`.

#### Scenario: dist gitignored on main
- **WHEN** sources live on `main`
- **THEN** `dist/` MUST be gitignored and MUST NOT be required for the contract to be valid on `main`

#### Scenario: v1 never points at main
- **WHEN** consumers pin `uses: <owner>/profile-bits@v1`
- **THEN** `@v1` MUST resolve to the orphan `release/v1` tree and MUST NOT point at `main`
