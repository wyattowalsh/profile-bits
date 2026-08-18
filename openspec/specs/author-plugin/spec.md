# author-plugin Specification

## Purpose

Defines Agent Plugin 1.0.0 packaging at `.agents/profile-bits` and the authoring skills that generate integrations, widgets, and packs from the three-layer contract without inventing Action inputs or silently expanding first-party catalogs.

## Requirements

### Requirement: Agent Plugin 1.0.0 lives at .agents/profile-bits
The authoring plugin MUST be packaged as an Agent Plugin 1.0.0 at `.agents/profile-bits`. `plugin.json` MUST validate against the Agent Plugins 1.0.0 schema (`additionalProperties: false`). The plugin `name` MUST be `profile-bits`. The plugin MUST NOT declare MCP, a `skills` array, or unknown top-level fields. This capability MUST NOT rewrite `plugin-contract`, `widget-contract`, or `integration-contract`. The plugin root MUST be a real file tree at `.agents/profile-bits` (sibling of `.agents/skills`), MUST NOT live inside `.agents/skills`, MUST NOT be a copied skills tree under `.agents/skills` or `.cursor`, and MUST NOT keep an `agent-plugin/` directory, alias, or copy. Install MUST be `npx skills add ./.agents/profile-bits --all`.

#### Scenario: plugin.json validates as Agent Plugins 1.0.0
- **WHEN** `.agents/profile-bits/plugin.json` is validated
- **THEN** it MUST pass Agent Plugins 1.0.0 schema validation with `name` `profile-bits` and MUST NOT include MCP, a `skills` array, or unknown top-level fields

#### Scenario: Plugin root is .agents/profile-bits
- **WHEN** the authoring plugin is installed or validated
- **THEN** the plugin root MUST be `.agents/profile-bits` and MUST NOT be a copied skills tree under `.agents/skills` or `.cursor`

#### Scenario: agent-plugin is not a live path
- **WHEN** the authoring plugin is installed or validated after SSOT migrate
- **THEN** `agent-plugin/` MUST NOT exist as a directory, alias, or copy and install MUST be `npx skills add ./.agents/profile-bits --all`

### Requirement: mcp.json is forbidden
The plugin MUST NOT include `mcp.json`. Validation MUST fail if `mcp.json` is present under the plugin root. v0 MUST NOT ship MCP.

#### Scenario: mcp.json is rejected
- **WHEN** `.agents/profile-bits/mcp.json` exists
- **THEN** plugin validation MUST fail

#### Scenario: Plugin ships without MCP
- **WHEN** the authoring plugin is packaged for v0
- **THEN** `mcp.json` MUST be omitted and MCP MUST NOT be required for the plugin to be valid

### Requirement: Four skills plus umbrella author routing
The plugin MUST ship four skills whose frontmatter `name` matches the skill directory: `author` (umbrella router), `author-integration`, `author-widget`, and `author-plugin`. Each skill MUST declare portable-core frontmatter: `name`, `description`, `license: MIT`, `compatibility`, `metadata.author: profile-bits`, and `metadata.version: "0.1.0"`. Compatibility MUST be: `Requires the profile-bits repo; OpenSpec plugin-contract, widget-contract, integration-contract, and author-plugin specs; packages/core/src/types.ts.` The plugin MUST NOT ship a fifth skill (including `author-bit` or `author-ideate`). The umbrella skill MUST read the OpenSpec contracts (`plugin-contract`, `widget-contract`, `integration-contract`, and this capability when present) plus `packages/core/src/types.ts` before routing. A new data source MUST route to `author-integration` first. A new card MUST route to `author-widget` on an existing pack unless the author asked for a new pack. A new pack MUST route to `author-plugin`, referencing existing or new integrations. Ideate/next/brainstorm MUST be an `author` mode (not a separate skill). Empty arguments MUST show a gallery that lists ideate as item 0 and MUST then stop; empty arguments MUST NOT inventory, rank, or write files. A named kind MUST be honored unless a lock fires (MCP, flattened `plugin_*_*_*` inputs, unauthenticated GitHub, REST `/languages`, a second pack for an existing first-party id, or an invented Action input).

#### Scenario: New data source routes to author-integration
- **WHEN** the author asks to add a new data source such as WakaTime
- **THEN** the umbrella skill MUST route to `author-integration` and MUST NOT create a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`

#### Scenario: New card routes to author-widget on an existing pack
- **WHEN** the author asks to add a new card and did not ask for a new pack
- **THEN** the umbrella skill MUST route to `author-widget` on an existing pack and MUST NOT create a new plugin pack

#### Scenario: New pack routes to author-plugin
- **WHEN** the author asks to add a new pack
- **THEN** the umbrella skill MUST route to `author-plugin` and that skill MUST reference existing or newly authored integrations rather than inventing a parallel data-source stack

#### Scenario: Empty arguments gallery then stop
- **WHEN** the umbrella skill is invoked with empty arguments
- **THEN** it MUST show a gallery that includes ideate as item 0 and MUST stop without inventorying or writing files

#### Scenario: Ideate mode ranks one next without writing
- **WHEN** the author asks `ideate`, `next`, `brainstorm`, or what to add next
- **THEN** the umbrella skill MUST inventory live `FIRST_PARTY_*` plus on-disk holes, MUST rank one next kind with handoff, and MUST NOT write files

#### Scenario: Named kind is honored
- **WHEN** the author names a kind such as adding a widget on an existing pack
- **THEN** the umbrella skill MUST route to that kind unless a lock fires and MUST NOT ignore the named kind solely because another hole ranks higher

### Requirement: Templates stay in the plugin root
Skill templates MUST live under the plugin root (skill-local `assets/templates/` or equivalent inside `.agents/profile-bits`). Template paths MUST NOT contain `../`. Destination paths MUST be documented as repo-root paths in the skill body, not as plugin-relative escapes. Documented dest examples MUST include `packages/integrations/src/<id>/` and `packages/plugins/src/<pack>/widgets/<id>/`. Pack registry dest MUST be `packages/plugins/src/<pack>/plugin.ts`. Validation MUST fail if any template path contains `../`. Skills MUST NOT add a new `index.ts.template`.

#### Scenario: Template path with parent segments fails validation
- **WHEN** a skill template path contains `../`
- **THEN** plugin validation MUST fail

#### Scenario: Templates generate into packages only when skills run
- **WHEN** authoring skills copy templates
- **THEN** the template files MUST remain inside the plugin root and live package source MUST be written only as the documented repo-root destination of a skill run (`packages/integrations/src/<id>/` or `packages/plugins/src/<pack>/widgets/<id>/`)

### Requirement: Harness trees are relative symlinks not a second skills SSOT
`.agents/skills/author`, `.agents/skills/author-integration`, `.agents/skills/author-widget`, and `.agents/skills/author-plugin` MUST be relative symlinks to `.agents/profile-bits/skills/<id>`. Those harness trees MUST NOT be a copied or hand-edited second skills SSOT. Generated OpenSpec skill trees (`openspec-*`) under `.agents/skills` MUST NOT be rewritten by this capability. `.cursor/skills/` MUST NOT be written as a second authoring-skills tree. This capability MUST NOT require `.claude/skills/<id>` to exist, and MUST NOT create or document `.claude/` or `.claude/skills` as authoring-skill projections.

#### Scenario: Harness author skill is a symlink
- **WHEN** `.agents/skills/author` is resolved after migrate
- **THEN** it MUST be a relative symlink to `.agents/profile-bits/skills/author` and MUST NOT be a copied file tree

#### Scenario: Generated OpenSpec skills stay untouched
- **WHEN** harness projections for authoring skills are created
- **THEN** generated `.agents/skills/openspec-*` entries MUST remain unmodified and `.cursor/skills/` MUST NOT receive a second authoring-skills copy

#### Scenario: Claude skills projections are not required
- **WHEN** authoring-skill harness projections are created or documented
- **THEN** `.claude/skills/<id>` MUST NOT be required to exist and this capability MUST NOT create or document adding `.claude/` or `.claude/skills`

### Requirement: Skills MUST NOT invent Action input names
Authoring skills MUST treat committed `.github/profile-bits.yml` as config SSOT (`additionalProperties: false`). Skills MUST NOT invent flattened Action inputs of the form `plugin_<plugin>_<widget>_<option>`. Skills MUST NOT invent thin Action input names. Yaml present MUST beat `plugin_github`. Skills MUST read registries and the core type contract rather than inventing option or input names.

#### Scenario: Languages option does not invent a flattened Action input
- **WHEN** the author asks to add a languages option
- **THEN** the skills MUST NOT add a `plugin_github_languages_*` or other `plugin_<plugin>_<widget>_<option>` Action input and MUST keep the option in yaml

#### Scenario: Yaml present beats plugin_github
- **WHEN** authoring skills emit or document Action wiring and `.github/profile-bits.yml` exists
- **THEN** configuration MUST come from yaml and `plugin_github` MUST NOT be treated as the option SSOT

### Requirement: Public API change requires an OpenSpec delta first
A change to the public API — yaml schema, thin Action inputs, or the first-party pack id list — MUST start with an OpenSpec delta. Skills MUST NOT silently expand first-party pack ids or flatten widget options into Action inputs. Completing an id already present in `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, or `FIRST_PARTY_INTEGRATION_IDS` MUST be allowed without appending a new id. After an approved delta that expands those lists, authors MUST run `just generate-action` and `just generate-docs` when those recipes exist.

#### Scenario: Languages yaml schema change starts with OpenSpec
- **WHEN** the author asks to add a languages option that changes the yaml schema
- **THEN** the skills MUST require an OpenSpec delta before codegen and MUST NOT emit flattened Action inputs

#### Scenario: New first-party pack id requires OpenSpec
- **WHEN** the author asks to add a first-party pack id that is not already in `FIRST_PARTY_PLUGIN_IDS`
- **THEN** the skills MUST require an OpenSpec delta plus the core type contract change and MUST NOT silently add the id to the first-party catalog

#### Scenario: Completing an existing catalog id is allowed
- **WHEN** the author asks to complete an id already listed in `FIRST_PARTY_*`
- **THEN** the skills MUST allow that work and MUST NOT treat it as a silent catalog expand

### Requirement: Fail closed on stale codegen
Plugin validation MUST fail closed when generated Action or docs surfaces are stale. If the repo root `justfile` has `generate-action`, validation MUST run `just generate-action --check` from the repo root and MUST fail on mismatch. Validation MAY walk up to the repo root at runtime; that walk MUST NOT count as a plugin-relative `../` template path. When those recipes exist, skills MUST tell the author to run `just generate-action` and `just generate-docs`.

#### Scenario: generate-action --check fails on stale action.yml
- **WHEN** generated `action.yml` is stale or contains flattened `plugin_<plugin>_<widget>_<option>` inputs
- **THEN** `just generate-action --check` MUST fail and plugin validation MUST fail

#### Scenario: Skills instruct codegen refresh
- **WHEN** an authoring skill completes a change that requires codegen and `generate-action` / `generate-docs` recipes exist
- **THEN** the skill MUST tell the author to run `just generate-action` and `just generate-docs`

### Requirement: WakaTime-class integration uses existing architecture
A WakaTime-class add for a **new** data source MUST reuse the existing integration architecture, not invent a plugin pack and not invent a new integration stack. The integration skill MUST generate a client, auth, scopes, inputs, and mocked HTTP tests using the existing `integration-contract` model (`static` = none; `github` = token required in the Action; shared client per run; REST cache key `(method, url, params)`; GraphQL cache key `(query, variables)`). Auth MAY also be constrained per widget option. Dest MUST be `packages/integrations/src/<id>/`. Completing the existing `wakatime` id MUST be allowed. Skills MUST NOT create a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`.

#### Scenario: WakaTime request authors an integration only
- **WHEN** the author asks to add a WakaTime integration or pack and `wakatime` is already in `FIRST_PARTY_*`
- **THEN** the skills MUST NOT create a second wakatime pack, MUST NOT silently append to `FIRST_PARTY_*`, and MUST keep the WakaTime-class client shape (client, auth, scopes, inputs, mocked HTTP)

#### Scenario: WakaTime request does not create a second pack
- **WHEN** the author asks to add a WakaTime integration or pack and `wakatime` is already in `FIRST_PARTY_*`
- **THEN** the skills MUST NOT create a second wakatime pack and MUST NOT silently append to `FIRST_PARTY_*`

#### Scenario: New data source uses WakaTime-class client shape
- **WHEN** the author asks to add a data source whose id is not already in `FIRST_PARTY_INTEGRATION_IDS`
- **THEN** the skills MUST generate a new integration under `packages/integrations/src/<id>/` with client, auth, scopes, inputs, and mocked HTTP tests

#### Scenario: No new integration stack
- **WHEN** a third-party data source is authored
- **THEN** the skills MUST reuse the existing integration contract (client, auth, scopes, inputs, shared client, cache keys) and MUST NOT introduce a parallel fetch or auth architecture

### Requirement: Catalog SSOT is live FIRST_PARTY_* with no silent expand
Catalog SSOT MUST be `packages/core/src/types.ts`: `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, `FIRST_PARTY_INTEGRATION_IDS`, `WIDGET_INTEGRATIONS`, `INTEGRATION_AUTH`, and `ActionInputsSchema`. Skills MUST read those registries rather than hardcoding github-only. Completing an id already in those lists MUST be allowed. Adding a new id MUST require an OpenSpec delta first. Skills MUST NOT silently expand those lists. Skills MUST NOT create a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`. `demo` MUST stay opt-in. Github pack defaults MUST remain `stats` and `languages`. Thin Action names MUST come from `ActionInputsSchema` (including optional `wakatime_token` and `http_token_env`); skills MUST NOT invent `plugin_*_*_*`.

#### Scenario: Live catalog is read from types.ts
- **WHEN** authoring skills decide whether an id is first-party
- **THEN** they MUST read `FIRST_PARTY_*` from `packages/core/src/types.ts` and MUST NOT assume the catalog is github-only

#### Scenario: No silent expand and no duplicate pack
- **WHEN** the author asks for a new pack that uses github plus static, or for a pack whose id is already in `FIRST_PARTY_PLUGIN_IDS`
- **THEN** the skills MUST generate or complete a pack registry with a derived integration union, MUST require an OpenSpec delta before expanding first-party plugin ids, and MUST NOT create a second pack for an existing id

### Requirement: Author-widget source discovery and Takumi-safe output
`author-widget` MUST generate a widget that consumes a cached integration payload and MUST NOT perform HTTP. Source discovery MUST prefer omitting explicit `source`: extension, then MIME, then sniff. `.md` that contains import, export, or JSX MUST promote to `mdx`. An explicit `source` MUST match the file bytes or fail. Ambiguous `widget.md` plus `widget.tsx` without `source` MUST fail. Canonical drop-in MDX without `source` MUST be `widget.mdx`. Stylesheets MUST use Takumi-safe `tw` / `className` on `div` / `span` / `img` and MUST compose bits. CSS `@keyframes` MUST be authoring input to animation render; APNG files MUST be named `.png`; default SVG MUST remain a baked still.

#### Scenario: Drop-in widget.mdx omits source
- **WHEN** the author drops in `widget.mdx` with no explicit `source`
- **THEN** the skill MUST prefer omitting `source` and MUST treat `widget.mdx` as the canonical file

#### Scenario: Ambiguous widget.md and widget.tsx without source fails
- **WHEN** both `widget.md` and `widget.tsx` exist and `source` is omitted
- **THEN** author-widget MUST fail rather than guessing

#### Scenario: CSS animation for gif or apng
- **WHEN** the author asks for a widget with CSS animation for gif or apng
- **THEN** the skill MUST treat `@keyframes` as authoring input, MUST name APNG files `.png`, and MUST keep default SVG as a baked still

#### Scenario: Tailwind stylesheet stays Takumi-safe
- **WHEN** the author asks for a Tailwind stylesheet widget
- **THEN** the skill MUST use Takumi-safe `tw` / `className` composition with bits and MUST NOT require `react-dom`, `useEffect`, portals, or DOM component libraries

### Requirement: Exclusive markdown family swaps
When `md` or `mdx` widgets declare `md.families`, each family MUST be exclusive (do not stack). A swap of `md.families.code` MUST replace the previous code family rather than stacking highlighters.

#### Scenario: Swap md.families.code does not stack highlighters
- **WHEN** the author swaps `md.families.code` from the default pretty-code family to starry-night
- **THEN** the skill MUST apply an exclusive family swap and MUST NOT stack pretty-code with starry-night

### Requirement: Locked evals
Each skill MUST ship Agent Skills evals (`evals/evals.json`) with `skill_name` and `evals[]` entries that include `id`, `prompt`, `expected_output`, and `assertions`. Umbrella `author` evals MUST cover all seven generation cases below as **routing** cases, plus ideate/empty-args/refuse cases. Specialized skills MUST own the deep assertions.

| Eval | Primary skill | Expected routing / outcome |
| --- | --- | --- |
| Add a WakaTime integration | author-integration (+ umbrella) | No second wakatime pack; no silent `FIRST_PARTY_*` append; mocked HTTP tests; client shape unchanged |
| Add a languages option | author-widget | OpenSpec delta first (yaml schema); no flattened Action input |
| New pack using github + static | author-plugin | Pack registry + derived union; OpenSpec before expanding plugin ids; no duplicate pack |
| Widget with CSS animation for gif/apng | author-widget | `@keyframes` authoring; APNG `.png`; SVG still remains baked |
| Drop in `widget.mdx` with no `source` | author-widget | Prefer omit `source`; canonical `widget.mdx` |
| Tailwind stylesheets widget | author-widget | Takumi-safe `tw`/`className`; bits composition |
| Swap `md.families.code` to starry-night | author-widget | Exclusive family swap, do not stack pretty-code + starry-night |
| Ideate next best | author | Inventory + one ranked kind + handoff; no files written |
| Empty-args does not ideate | author | Gallery including ideate; does not inventory or write |

#### Scenario: Umbrella evals cover all seven as routing
- **WHEN** umbrella `author` evals are run
- **THEN** they MUST cover all seven generation cases as routing assertions (integration vs widget vs pack) and MUST NOT omit the WakaTime, languages-option, or new-pack cases

#### Scenario: Specialized skills own deep assertions
- **WHEN** `author-integration`, `author-widget`, or `author-plugin` evals are run
- **THEN** they MUST assert the deep outcomes in the table (mocked HTTP, OpenSpec-delta-first, exclusive family swap, Takumi-safe output, no second pack) rather than routing only

#### Scenario: Umbrella evals cover ideate and empty-args
- **WHEN** umbrella `author` evals are run
- **THEN** they MUST include an ideate case that ranks without writing and an empty-args case that galleries and does not inventory

### Requirement: Plugin validation suite
The plugin MUST ship a validate script that (1) validates `plugin.json` against Agent Plugins 1.0.0, (2) rejects `mcp.json` if present, (3) runs `skills-ref validate` on each `skills/<id>` (name MUST match directory), (4) runs `just generate-action --check` from the repo root when that recipe exists, and (5) fails if any template path contains `../`.

#### Scenario: Validate script fails on mcp.json or parent template paths
- **WHEN** `mcp.json` is present or a template path contains `../`
- **THEN** the validate script MUST fail

#### Scenario: skills-ref validate runs on each skill
- **WHEN** plugin validation runs
- **THEN** `skills-ref validate` MUST run on `author`, `author-integration`, `author-widget`, and `author-plugin` and MUST require each skill `name` to match its directory

### Requirement: Pack-level bitsUsed on the pack plugin object
Authoring skills MUST treat `bitsUsed` as pack-level. Pack templates MUST export `{{id}}Plugin` and `{{ID}}_BITS_USED`, and MUST set `bitsUsed` on that pack object using `satisfies PluginIdentity & { bitsUsed: typeof … }` because `PluginIdentitySchema` has no `bitsUsed`. The widget skill MUST union widget bits into that pack-level array. `bitsUsed` MUST NOT be yaml, MUST NOT live on a widget-entry-only SSOT, and MUST NOT require a `widget-bits.ts` module in `packages/core`. Skills MUST NOT edit `packages/core` to add `bitsUsed` to the core schema. Pack templates MUST use `docsPath: "{{DOCS_PATH}}"` and MUST NOT hardcode `/generate/<id>/`. Pack templates MUST NOT `export const plugin` as the pack identity.

#### Scenario: Pack registry exports pack-level bitsUsed
- **WHEN** `author-plugin` generates a pack registry
- **THEN** it MUST export `{{id}}Plugin` with pack-level `{{ID}}_BITS_USED` and MUST NOT export `const plugin` as the pack identity

#### Scenario: Widget skill unions bits into the pack array
- **WHEN** `author-widget` records bits for a new card
- **THEN** it MUST union those names into the pack’s `{{ID}}_BITS_USED` on `{{id}}Plugin` and MUST NOT treat a widget yaml field as the `bitsUsed` SSOT

#### Scenario: Core schema is not extended for bitsUsed
- **WHEN** authoring skills emit pack `bitsUsed`
- **THEN** they MUST NOT edit `packages/core` and MUST NOT add a `widget-bits.ts` module there
