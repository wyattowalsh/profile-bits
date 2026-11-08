## ADDED Requirements

### Requirement: Docs closeout after mutating authoring
After a mutating authoring success, the destination skill MUST load `.agents/profile-bits/references/docs-closeout.md` and MUST update the nested package `AGENTS.md` it owns when that file’s facts changed (`packages/bits/AGENTS.md` for bits, `packages/themes/AGENTS.md` for palettes, `packages/integrations/AGENTS.md` for integrations, `packages/plugins/AGENTS.md` for widgets and packs). Skills MUST describe `just generate-docs` as refreshing the playground-fields snapshot only and MUST NOT claim it rewrites `AGENTS.md`, `README.md`, or `DESIGN.md`. Skills MUST NOT copy templates into `apps/docs/**` or `/generate/widgets`. Empty arguments, help, refuse, route-away, and complete-existing stop MUST skip docs-closeout. The umbrella `author` skill MUST remain read-only and MUST name docs-closeout as the destination skill’s job.

#### Scenario: Mutating bit updates bits AGENTS.md
- **WHEN** `author-bit` lands an approved 12th bit or changes a frozen-11 fact
- **THEN** it MUST update `packages/bits/AGENTS.md` and MUST NOT edit `DESIGN.md` or `apps/docs/**`

#### Scenario: Complete-existing skips docs-closeout
- **WHEN** `author-bit` finds Theme already exported and stops as complete-existing
- **THEN** it MUST NOT rewrite `packages/bits/AGENTS.md`

#### Scenario: generate-docs is snapshot-only
- **WHEN** an authoring skill tells the author to refresh docs codegen
- **THEN** it MUST say `just generate-docs` refreshes playground-fields.json only and MUST NOT say it rewrites `AGENTS.md`, `README.md`, or `DESIGN.md`

#### Scenario: Empty args skip closeout
- **WHEN** an authoring skill is invoked with empty arguments
- **THEN** it MUST show its gallery and stop without loading docs-closeout or writing files

#### Scenario: Umbrella does not mutate docs
- **WHEN** `author` classifies a request or ranks ideate
- **THEN** it MUST NOT write files and MUST hand docs-closeout to the destination skill

### Requirement: Plugin validation is a repo gate
The repo MUST expose `just validate-agent-plugins` that runs `.agents/profile-bits/scripts/validate.sh` and `.agents/profile-bits-readme/scripts/validate.sh`. CI MUST invoke that gate (or the two scripts) so plugin validation is not a human-only step.

#### Scenario: just recipe runs both plugins
- **WHEN** a maintainer runs `just validate-agent-plugins`
- **THEN** both plugin validate scripts MUST run and MUST fail the recipe if either fails

#### Scenario: CI runs plugin validation
- **WHEN** CI runs the lint or check job that already runs `generate-docs --check`
- **THEN** it MUST also run both plugin validate scripts (or `just validate-agent-plugins`)

## MODIFIED Requirements

### Requirement: Harness trees are relative symlinks not a second skills SSOT
`.agents/skills/author`, `.agents/skills/author-bit`, `.agents/skills/author-palette`, `.agents/skills/author-integration`, `.agents/skills/author-widget`, and `.agents/skills/author-plugin` MUST be relative symlinks to `.agents/profile-bits/skills/<id>`. Those harness trees MUST NOT be a copied or hand-edited second skills SSOT. Generated OpenSpec skill trees (`openspec-*`) under `.agents/skills` MUST NOT be rewritten by this capability. `.cursor/skills/` MUST NOT be written as a second authoring-skills tree. This capability MUST NOT require `.claude/skills/<id>` to exist, and MUST NOT create or document `.claude/` or `.claude/skills` as authoring-skill projections.

#### Scenario: Harness author skill is a symlink
- **WHEN** `.agents/skills/author` is resolved after migrate
- **THEN** it MUST be a relative symlink to `.agents/profile-bits/skills/author` and MUST NOT be a copied file tree

#### Scenario: Six author harness projections are symlinks
- **WHEN** all authoring harness entries are inspected
- **THEN** exactly the six allowed ids MUST resolve to their plugin-local skill directories as relative `120000` links

#### Scenario: Generated OpenSpec skills stay untouched
- **WHEN** harness projections for authoring skills are created
- **THEN** generated `.agents/skills/openspec-*` entries MUST remain unmodified and `.cursor/skills/` MUST NOT receive a second authoring-skills copy

#### Scenario: Claude skills projections are not required
- **WHEN** authoring-skill harness projections are created or documented
- **THEN** `.claude/skills/<id>` MUST NOT be required to exist and this capability MUST NOT create or document adding `.claude/` or `.claude/skills`

### Requirement: Fail closed on stale codegen
Plugin validation MUST fail closed when generated Action or docs surfaces are stale. If the repo root `justfile` has `generate-action`, validation MUST run `just generate-action --check` from the repo root and MUST fail on mismatch. If the repo root `justfile` has `generate-docs`, validation MUST run `just generate-docs --check` from the repo root and MUST fail on mismatch. Validation MAY walk up to the repo root at runtime; that walk MUST NOT count as a plugin-relative `../` template path. When those recipes exist, skills MUST tell the author to run `just generate-action` and `just generate-docs`, and MUST describe `just generate-docs` as the playground-fields snapshot only.

#### Scenario: generate-action --check fails on stale action.yml
- **WHEN** generated `action.yml` is stale or contains flattened `plugin_<plugin>_<widget>_<option>` inputs
- **THEN** `just generate-action --check` MUST fail and plugin validation MUST fail

#### Scenario: generate-docs --check fails on stale playground fields
- **WHEN** `playground-fields.json` is missing or would drift from live option schemas
- **THEN** `just generate-docs --check` MUST fail and plugin validation MUST fail

#### Scenario: Skills instruct codegen refresh
- **WHEN** an authoring skill completes a change that requires codegen and `generate-action` / `generate-docs` recipes exist
- **THEN** the skill MUST tell the author to run `just generate-action` and `just generate-docs` and MUST NOT claim generate-docs rewrites `AGENTS.md`, `README.md`, or `DESIGN.md`

### Requirement: Plugin validation suite
The plugin MUST ship a validate script (`scripts/validate.sh`) that validates `plugin.json` against Agent Plugins 1.0.0, rejects recursive `mcp.json`, runs `pnpm dlx skills-ref@0.1.5 validate skills/<id>` on each of exactly six allowed skill directories, requires every frontmatter name to match its directory, runs `just generate-action --check` when that recipe exists, runs `just generate-docs --check` when that recipe exists, enforces template containment with Node 24 `fs.realpathSync` and `path.relative`, and asserts manifest identity (`profile-bits`, `0.1.0`, MIT).

#### Scenario: Validate script fails on mcp.json or parent template paths
- **WHEN** `mcp.json` is present anywhere under the plugin root or a template path contains `../` or resolves outside the plugin root via `realpathSync`
- **THEN** the validate script MUST fail

#### Scenario: skills-ref validate runs on each skill
- **WHEN** plugin validation runs
- **THEN** `pnpm dlx skills-ref@0.1.5 validate` MUST run on all six allowed skills, MUST require each skill `name` to match its directory, and MUST NOT fall back to `agentskills`

#### Scenario: Extra skill directory fails validation
- **WHEN** `skills/` contains a seventh directory or any id outside the six-skill allowlist
- **THEN** the validate script MUST fail

#### Scenario: plugin.json identity is asserted
- **WHEN** plugin validation runs
- **THEN** it MUST assert `plugin.json` `name` is `profile-bits`, `version` is `0.1.0`, and `license` is `MIT`

#### Scenario: Template containment uses realpathSync
- **WHEN** plugin validation checks template paths
- **THEN** it MUST resolve with Node `fs.realpathSync` and `path.relative` and MUST fail if the relative path starts with `..`

#### Scenario: generate-docs --check runs when the recipe exists
- **WHEN** the repo root `justfile` has `generate-docs` and plugin validation runs
- **THEN** the validate script MUST run `just generate-docs --check` (or `pnpm generate-docs --check`) from the repo root
