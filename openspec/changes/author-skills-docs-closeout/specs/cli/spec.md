## ADDED Requirements

### Requirement: Consumer render skill ships evals
`.agents/profile-bits-readme/skills/render` MUST ship `evals/evals.json` with `skill_name` `render` and `evals[]` entries that include `id`, `prompt`, `expected_output`, and `assertions`. Those evals MUST cover writing yaml and thin workflow, relative README embeds, refusing MCP, refusing flattened `plugin_*_*_*` inputs, refusing to document `POST /api/preview` as an embed API, refusing to implement `runMain`, handing `packages/**` authoring to the six author skills, and treating `/generate/catalog` as a first-party gallery of live packs (not github-only and not a marketplace).

#### Scenario: Consumer evals file exists
- **WHEN** the consumer plugin is validated or inventoried
- **THEN** `skills/render/evals/evals.json` MUST exist with `skill_name` `render` and at least one eval whose assertions require relative README embeds and a refuse of `runMain`

#### Scenario: Catalog honesty eval is not github-only
- **WHEN** consumer render evals are read
- **THEN** at least one eval MUST require four-pack catalog honesty (`github`, `wakatime`, `rss`, `http`) and MUST NOT describe the catalog as github widgets only

### Requirement: Consumer skill catalog honesty
The consumer `render` skill MUST describe `/generate/catalog` as a first-party visual gallery of live first-party packs and MUST NOT describe it as github widgets only, as a plugin marketplace, or as a store. `repo` MUST remain an opt-in yaml widget in that copy, not a pack default. The skill MUST NOT document `POST /api/preview` as a public embed API.

#### Scenario: Render skill names live packs
- **WHEN** `.agents/profile-bits-readme/skills/render/SKILL.md` is read
- **THEN** it MUST mention first-party packs `github`, `wakatime`, `rss`, and `http` when it describes the catalog and MUST NOT say the catalog is currently github widgets `demo`, `stats`, and `languages` only

#### Scenario: Render skill still refuses embed API
- **WHEN** an agent follows the consumer `render` skill
- **THEN** it MUST NOT document `POST /api/preview` as a public embed API
