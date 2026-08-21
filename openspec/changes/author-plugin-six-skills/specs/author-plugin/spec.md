## ADDED Requirements

### Requirement: Bit and palette authoring have distinct destinations
The plugin MUST route shared UI primitives to `author-bit` and host-owned theme data to `author-palette`. Frozen bits MUST land at `packages/bits/src/<BitName>.tsx` with barrel exports in `packages/bits/src/index.ts`. Named palette families MUST land at `packages/themes/src/families/<family>.ts` with registration in `packages/themes/src/registry.ts`. Completing an existing bit or palette MUST extend rather than overwrite complete sources. A 12th bit name, new named palette id/family, or changed yaml theme shape MUST require OpenSpec first. The palette skill MUST NOT create `packages/palettes/`. Templates MUST be skill-local and MUST NOT contain parent traversal. The bit skill MUST ship one generic `Bit.template` for an approved 12th name and MUST NOT ship one template per frozen bit.

#### Scenario: Theme bit routes to author-bit
- **WHEN** the author asks to complete the `Theme` UI primitive
- **THEN** the router MUST hand off to `author-bit` at `packages/bits/src/Theme.tsx` and MUST NOT treat the request as yaml theme data

#### Scenario: Yaml theme routes to author-palette
- **WHEN** the author asks for a named yaml theme, flavor, swatches, pair, or seven-token map
- **THEN** the router MUST hand off to `author-palette` under `packages/themes` and MUST NOT edit the `Theme` bit

#### Scenario: New bit or palette id is OpenSpec-first
- **WHEN** the author asks for a 12th bit or a new palette id/family
- **THEN** the specialized skill MUST require an OpenSpec delta before copying its contained generic template or changing a live registry

### Requirement: Theme and badge aliases do not become skills
The plugin MUST NOT ship `author-theme`, `author-badge`, `author-chip`, or any seventh skill directory. Bare “theme” without a destination MUST return to the `author` gallery rather than guess. The `Theme` bit and in-card `Chip` MUST route to `author-bit`. Yaml theme and named palettes MUST route to `author-palette`. Shields.io README image rows MUST route to sibling README tooling or `add-badges`. A new data-backed badge pack MUST remain OpenSpec-first and then route through integration, plugin, and widget authoring.

#### Scenario: In-card Chip is not a README badge
- **WHEN** the author asks for an in-card pill implemented with `Chip`
- **THEN** the router MUST hand off to `author-bit` and MUST NOT create `author-badge`

#### Scenario: Shields README badge leaves this plugin
- **WHEN** the author asks for Shields.io image rows in a README
- **THEN** the router MUST name sibling README tooling and MUST NOT create an authoring skill or first-party pack

## MODIFIED Requirements

### Requirement: Six skills plus umbrella author routing
The plugin MUST ship exactly six skills whose frontmatter `name` matches the skill directory: `author`, `author-bit`, `author-palette`, `author-integration`, `author-widget`, and `author-plugin`. Each skill MUST declare portable-core frontmatter. `author` MUST only classify, ideate, and hand off; it MUST NOT mutate. Empty arguments and help MUST skip Before routing, show gallery items 0–5, and stop without reading types/contracts, inventorying, ranking, copying templates, or writing. Ideate MUST re-read live disk, rank only `kind=bit`, `kind=palette`, `kind=integration`, `kind=widget`, or `kind=pack`, name the handoff, and stop. It MUST NOT emit `kind=theme` or `kind=badge`.

#### Scenario: Empty arguments show six roles and stop
- **WHEN** `author` is invoked with empty arguments
- **THEN** it MUST show gallery items 0–5, skip Before routing, and stop without reads or mutation

#### Scenario: Author router never mutates
- **WHEN** `author` classifies or ideates
- **THEN** it MUST name a specialized handoff and MUST NOT write files or copy templates

#### Scenario: New data source routes to author-integration
- **WHEN** the author asks to add a new data source
- **THEN** the umbrella skill MUST route to `author-integration` first

#### Scenario: New card routes to author-widget on an existing pack
- **WHEN** the author asks to add a card without asking for a new pack
- **THEN** the umbrella skill MUST route to `author-widget` on an existing pack

#### Scenario: New pack routes to author-plugin
- **WHEN** the author asks to add a new pack
- **THEN** the umbrella skill MUST route to `author-plugin`

#### Scenario: Empty arguments gallery then stop
- **WHEN** the umbrella skill is invoked with empty arguments
- **THEN** it MUST show gallery items 0–5 and stop without inventorying or writing

#### Scenario: Empty arguments and help skip Before routing
- **WHEN** the umbrella skill is invoked with empty arguments or help
- **THEN** it MUST skip Before routing and stop without reading live types or contracts

#### Scenario: Ideate mode ranks one next without writing
- **WHEN** the author asks ideate, next, brainstorm, or what to add next
- **THEN** the umbrella skill MUST rank from live disk, name a handoff, and stop without mutation

#### Scenario: Named kind is honored
- **WHEN** the author names a valid kind
- **THEN** the router MUST honor that kind unless a lock fires

### Requirement: Harness trees are relative symlinks not a second skills SSOT
The six `.agents/skills/author*` entries MUST be relative symlinks to `.agents/profile-bits/skills/<id>` with git mode `120000`. They MUST NOT be copied skill trees. Generated OpenSpec skills, sibling README tooling, `.cursor/skills`, and `.claude` MUST remain untouched.

#### Scenario: Six author harness projections are symlinks
- **WHEN** the authoring plugin harness is inspected
- **THEN** exactly the six allowed author skill projections MUST resolve to their plugin-local skill directories as relative `120000` links

#### Scenario: Harness author skill is a symlink
- **WHEN** `.agents/skills/author` is resolved
- **THEN** it MUST be a relative symlink to `.agents/profile-bits/skills/author`

#### Scenario: Generated OpenSpec skills stay untouched
- **WHEN** authoring harness projections are updated
- **THEN** generated OpenSpec skill trees MUST remain unmodified

#### Scenario: Claude skills projections are not required
- **WHEN** authoring skills are installed or documented
- **THEN** `.claude/skills` MUST NOT be required or created

### Requirement: Locked evals
The plugin MUST keep Agent Skills evals in each skill's `evals/evals.json`. This expansion MUST add 10 `author-bit` evals, 8 `author-palette` evals, and 9 routing-only `author` evals. Theme/Chip/badge handoff and alias-refusal evals MUST live only under `author/evals`. Bit and palette evals MUST cover empty args, complete-existing, OpenSpec gating, destination refusal, and flatten refusal.

#### Scenario: Handoff evals have one owner
- **WHEN** Theme, Chip, Shields, or alias routing evals are inspected
- **THEN** routing assertions MUST live under `author/evals` while specialized evals own destination behavior

#### Scenario: Umbrella evals own bit and palette routing
- **WHEN** umbrella `author` evals are run
- **THEN** they MUST cover Theme, yaml theme, Chip, Shields, and alias routing

#### Scenario: Specialized skills own deep assertions
- **WHEN** specialized skill evals are run
- **THEN** each skill MUST assert its destinations, OpenSpec gate, complete-existing behavior, and refusal locks

#### Scenario: Umbrella evals cover ideate and empty-args
- **WHEN** umbrella `author` evals are run
- **THEN** they MUST cover read-only ideate and the six-role empty-args gallery

### Requirement: Plugin validation suite
Plugin validation MUST keep `SKILLS_REF_PIN=0.1.5`, validate Agent Plugins 1.0.0 closed manifest identity, reject `mcp.json`, enforce exactly the six allowed skill directories, require each frontmatter name to match its directory, validate all six skills, enforce template containment, and run `generate-action --check` when available.

#### Scenario: Seventh skill directory fails
- **WHEN** a skill directory outside the six-id allowlist is present
- **THEN** validation MUST fail

#### Scenario: All six skills use the pinned validator
- **WHEN** plugin validation runs
- **THEN** it MUST run `pnpm dlx skills-ref@0.1.5 validate` for each of the six skills

#### Scenario: Validate script fails on mcp.json or parent template paths
- **WHEN** recursive `mcp.json` or an escaping template is present
- **THEN** plugin validation MUST fail

#### Scenario: skills-ref validate runs on each skill
- **WHEN** plugin validation runs
- **THEN** it MUST validate each of the six allowed skills at pin `0.1.5`

#### Scenario: Extra skill directory fails validation
- **WHEN** a seventh or unknown skill directory is present
- **THEN** plugin validation MUST fail

#### Scenario: plugin.json identity is asserted
- **WHEN** plugin validation runs
- **THEN** it MUST require name `profile-bits`, version `0.1.0`, and license MIT

#### Scenario: Template containment uses realpathSync
- **WHEN** template paths are validated
- **THEN** validation MUST use Node `realpathSync` and `path.relative` and fail on an escaping result

## RENAMED Requirements

- FROM: `### Requirement: Four skills plus umbrella author routing`
- TO: `### Requirement: Six skills plus umbrella author routing`
