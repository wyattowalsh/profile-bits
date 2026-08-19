## Purpose

Defines the local profile-bits command-line runner: a typed argv/env shell around the Action engine that writes widget files from committed yaml without treating preview, gist, or the docs catalog as public embed or marketplace surfaces.

## ADDED Requirements

### Requirement: Local render command
The system MUST ship a local command `profile-bits render` that renders widgets from the same yaml config SSOT as the Action (default path `.github/profile-bits.yml`). Invoking `profile-bits` with no subcommand or with `--help` MUST print usage and MUST NOT render. Unknown subcommands MUST fail as invalid invocation.

#### Scenario: render subcommand runs the engine
- **WHEN** a user runs `profile-bits render` with a valid config and a github token
- **THEN** the system MUST load yaml from the configured path and MUST write widget files under `output_dir` using the Action engine

#### Scenario: bare binary prints usage
- **WHEN** a user runs `profile-bits` with no subcommand
- **THEN** the system MUST print usage and MUST NOT write widget files

#### Scenario: unknown subcommand fails usage
- **WHEN** a user runs `profile-bits` with a subcommand other than `render` (and other than help/version)
- **THEN** the system MUST fail as invalid invocation and MUST NOT write widget files

### Requirement: CLI default output_action is none
When `--output-action` is omitted on the CLI, the runner MUST pass `output_action: none` to the engine. The Action Marketplace default `commit` MUST remain unchanged. `commit`, `pull-request`, and `gist` MUST remain allowed CLI flags and MUST use the existing Action output ports.

#### Scenario: omitted output-action writes files only
- **WHEN** `profile-bits render` is invoked without `--output-action`
- **THEN** the engine MUST run with `output_action` `none` and MUST NOT commit, open a pull request, or update a gist

#### Scenario: Action default commit is unchanged
- **WHEN** the GitHub Action runs without an `output_action` input
- **THEN** the Action MUST still default to `commit`

### Requirement: Thin-input flags only
CLI flags that configure the engine MUST map one-to-one to existing thin Action input names in kebab-case (`--github-token`, `--output-action`, `--dry-run`, and the rest of the thin input list). The CLI MUST NOT accept flattened `plugin_<plugin>_<widget>_<option>` flags. The CLI MUST NOT add new Marketplace Action inputs.

#### Scenario: kebab flags map to thin inputs
- **WHEN** a user passes `--config .github/profile-bits.yml` and `--dry-run`
- **THEN** the engine MUST receive thin inputs `config` and `dry_run` with those values

#### Scenario: flattened plugin option flags are rejected
- **WHEN** a user passes `--plugin-github-stats-include` or another `plugin_<plugin>_<widget>_<option>` flag
- **THEN** the CLI MUST fail as invalid invocation

### Requirement: Presentation flags
The CLI MUST support `--json`, `--quiet`, `--verbose`, `--no-input`, and `--no-color`. `--json` MUST write machine-readable results to stdout and MUST NOT mix spinner or progress into stdout. `--no-input` MUST NOT prompt and MUST fail clearly when required information is missing. Non-TTY and `NO_COLOR` MUST suppress color. `--no-input` MUST be the default when stdin is not a TTY.

#### Scenario: json stdout is pipeable
- **WHEN** a user passes `--json` and the run succeeds
- **THEN** stdout MUST contain JSON with `files`, `skipped`, and `did_commit` and MUST NOT contain spinner or progress text

#### Scenario: no-input does not prompt
- **WHEN** `--no-input` is set or stdin is not a TTY, and a required token is missing
- **THEN** the CLI MUST fail without prompting and MUST NOT write a token prompt to stdout

### Requirement: Token env fallbacks and redaction
`--github-token` MUST fall back to `GITHUB_TOKEN` then `GH_TOKEN`. `--wakatime-token` MUST fall back to `WAKATIME_TOKEN`. `http_token_env` MUST continue to resolve a named process env var inside the engine. Empty / `""` / whitespace github token MUST fail. Token values MUST NOT appear in stdout, stderr, JSON output, or error messages.

#### Scenario: GITHUB_TOKEN supplies github_token
- **WHEN** `--github-token` is omitted and `GITHUB_TOKEN` is set to a non-empty value
- **THEN** the engine MUST receive that value as `github_token`

#### Scenario: tokens are redacted
- **WHEN** a run fails or succeeds
- **THEN** stdout and stderr MUST NOT contain the github, wakatime, or http token values

### Requirement: Engine wrap, not a second renderer
The CLI MUST invoke the Action `runMain` entry (or an equivalent injection of the same engine, clients, and output ports). The CLI MUST NOT implement a second fetch/render path and MUST NOT treat `POST /api/preview` as a delivery API.

#### Scenario: missing yaml uses the same parse rules
- **WHEN** the config file is absent and `plugin_github` is not set
- **THEN** parse MUST fail or apply the same Action rules as `loadConfig` and MUST NOT invent a docs-preview code path

### Requirement: Stdout stderr and exit codes
Stdout MUST carry command results only (human file lists or `--json`). Stderr MUST carry warnings, diagnostics, and progress. Exit codes MUST be: `0` success, `1` operational engine failure, `2` invalid invocation, `130` SIGINT. SIGINT/SIGTERM MUST stop progress UI and cancel in-flight work. EPIPE on stdout MUST NOT crash with an uncaught exception.

#### Scenario: engine failure is exit 1
- **WHEN** `runMain` throws or returns a fail_job outcome
- **THEN** the process MUST exit `1` and MUST NOT exit `2`

#### Scenario: bad flags are exit 2
- **WHEN** the user passes an unknown flag
- **THEN** the process MUST exit `2`

### Requirement: Consumer skill shells out
A consumer Agent Plugin 1.0.0 MUST live at `.agents/profile-bits-readme` with skill `render`. That skill MUST instruct agents to write yaml/workflow and run `just render` or `pnpm render`. It MUST NOT reimplement fetch or render. It MUST NOT include `mcp.json`. The authoring plugin at `.agents/profile-bits` MUST remain four skills and MUST NOT grow a fifth skill for this runner.

#### Scenario: consumer plugin has no MCP
- **WHEN** `.agents/profile-bits-readme` is validated
- **THEN** `mcp.json` MUST be absent and validation MUST fail if it is present

#### Scenario: author plugin stays four skills
- **WHEN** the authoring plugin is inventoried after this change
- **THEN** it MUST still ship only `author`, `author-integration`, `author-widget`, and `author-plugin`

### Requirement: Docs distinguish local runner from embed and marketplace
Published `llms.txt` and the docs home/docs pages MUST describe the CLI as a local engine runner. `/generate/catalog` MUST remain a first-party visual gallery and MUST NOT be described as a plugin marketplace. Default README embeds MUST remain relative committed files. Gist MUST be described as an optional `output_action`, not a CDN. Customization MUST be described as yaml plus first-party `http` / `rss` / `chips`, not a user plugin loader.

#### Scenario: llms.txt names the local runner
- **WHEN** `llms.txt` is generated
- **THEN** it MUST state that README delivery is the Action, the CLI is a local runner, and the playground is not a public embed API

#### Scenario: catalog is not a marketplace
- **WHEN** a visitor opens `/generate/catalog`
- **THEN** the page MUST present the first-party gallery and MUST NOT describe itself as a plugin marketplace
