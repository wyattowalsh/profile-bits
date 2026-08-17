## 1. T320e plugin.json and validate.sh

- [ ] 1.1 Write `agent-plugin/profile-bits/plugin.json` for Agent Plugins 1.0.0: `$schema` const `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`, `name: profile-bits`, `version: 0.1.0`, `license: MIT`, keywords. MUST satisfy `additionalProperties: false`. MUST NOT add a `skills` array, MCP fields, or unknown top-level keys. MUST NOT create `mcp.json`.
- [ ] 1.2 Write `agent-plugin/profile-bits/scripts/validate.sh`: validate `plugin.json` against 1.0.0 (vendor `references/plugin.schema.json` if needed so the script stays offline); fail if `mcp.json` is present; run `pnpm dlx skills-ref validate` on each `skills/<id>` once those dirs exist (name MUST match directory); if `justfile` has `generate-action`, run `just generate-action --check` from the repo root and fail closed on stale or flattened `plugin_*_*_*` inputs; fail if any template path contains `../`. Walking up to the repo root at runtime is allowed and is not a template `../`. MUST NOT add a just recipe. FORBIDDEN: `packages/**`, `apps/**`, `justfile`, `action.yml`, `biome.json`, other OpenSpec change folders.

## 2. T320a author router

- [ ] 2.1 Write `agent-plugin/profile-bits/skills/author/SKILL.md` (`name: author`, `license: MIT`). Router MUST read OpenSpec `plugin-contract` / `widget-contract` / `integration-contract` (and `author-plugin` when present) plus `packages/core/src/types.ts`. New data source → `author-integration` first; new card → `author-widget` on an existing pack unless the author asked for a new pack; new pack → `author-plugin`. MUST NOT invent Action input names. Public API changes MUST require an OpenSpec delta first. When codegen recipes exist, tell the author to run `just generate-action` and `just generate-docs`. FORBIDDEN: other skill directories, `packages/**`, harness copies.
- [ ] 2.2 Write `skills/author/evals/evals.json` covering **routing** for all seven cases: WakaTime integration; languages option; new pack using github+static; CSS animation for gif/apng; drop-in `widget.mdx` with no `source`; Tailwind stylesheet widget; exclusive `md.families.code` swap. Umbrella evals are routing only.

## 3. T320b author-integration

- [ ] 3.1 Write `agent-plugin/profile-bits/skills/author-integration/SKILL.md` (`name: author-integration`) to generate into `packages/integrations/<id>/` (client, auth, scopes, inputs, mocked HTTP tests). Auth per integration and per widget option. `static` = none; `github` = token required in the Action. Shared client per run. Cache keys: REST `(method, url, params)`, GraphQL `(query, variables)`. A WakaTime-class add is an integration on this architecture, not a first-party pack and not a new fetch/auth stack.
- [ ] 3.2 Add contained templates under `skills/author-integration/assets/templates/` (`client.ts.template`, `auth.ts.template`, `scopes.ts.template`, `inputs.ts.template`, `client.test.ts.template`). Destination paths live in SKILL.md as repo-root paths. MUST NOT use `../` in template paths. MUST NOT write live `packages/integrations/**`.
- [ ] 3.3 Write `skills/author-integration/evals/evals.json` with the WakaTime integration case (new integration only; no first-party `wakatime` pack; mocked HTTP tests).

## 4. T320c author-widget

- [ ] 4.1 Write `agent-plugin/profile-bits/skills/author-widget/SKILL.md` (`name: author-widget`): schema, fetch (no HTTP — consume cached payload), optional `source` (prefer omit; canonical `widget.tsx` | `widget.md` | `widget.mdx` | `widget.html`), bits-based Takumi-safe template, yaml options only (OpenSpec delta first; never flattened Action inputs). Encode `discoverSource` (extension → MIME → sniff; `.md` with import/export/JSX promotes to mdx; explicit `source` must match bytes or fail; ambiguous `widget.md` + `widget.tsx` without `source` fails). CSS `@keyframes` are authoring input to `renderAnimation`; APNG named `.png`; default SVG stays a baked still. Exclusive `md.families` (do not stack).
- [ ] 4.2 Add contained templates (React, MD, MDX, stylesheet `tw`/`className`, CSS `@keyframes` for gif/apng) under `skills/author-widget/assets/templates/` with `.template` suffixes. MUST NOT use `../`. MUST NOT write live `packages/plugins/**`.
- [ ] 4.3 Write `skills/author-widget/evals/evals.json` for: add a languages option (OpenSpec delta / yaml schema, no flattened Action input); widget with CSS animation (gif/apng, APNG `.png`, baked SVG still); drop-in `widget.mdx` with no `source`; Tailwind `tw`/`className` bits composition; exclusive `md.families.code` swap to starry-night (do not stack pretty-code).

## 5. T320d author-plugin pack skill

- [ ] 5.1 Write `agent-plugin/profile-bits/skills/author-plugin/SKILL.md` (`name: author-plugin`): pack registry, defaults, `docsPath`, derived integration union. v0 MUST NOT add first-party ids to `FIRST_PARTY_PLUGIN_IDS`. A second pack is an OpenSpec + types change, not a silent catalog add. `demo` stays opt-in; github pack defaults remain `stats` + `languages`.
- [ ] 5.2 Add contained pack-registry templates under `skills/author-plugin/assets/templates/` (no `../`). MUST NOT write live `packages/plugins/**`.
- [ ] 5.3 Write `skills/author-plugin/evals/evals.json` for a new pack using github+static (derived union; OpenSpec before expanding plugin ids).

## 6. T321 harness symlinks

- [ ] 6.1 Create relative symlinks (do not copy, do not hand-edit a second tree): `.agents/skills/author` → `../../agent-plugin/profile-bits/skills/author`; same for `author-integration`, `author-widget`, `author-plugin`; `.claude/skills/<id>` → the same plugin targets. Leave generated `.agents/skills/openspec-*` and `.claude/skills/openspec-*` untouched. MUST NOT write `.cursor/skills/` for these ids.
- [ ] 6.2 Write `agent-plugin/profile-bits/references/contract.md` pointing at `openspec/specs/plugin-contract`, `widget-contract`, `integration-contract`, and `packages/core/src/types.ts`. Note that `openspec/specs/author-plugin/` appears after T035 sync. Optional plugin-local `AGENTS.md` documenting `npx skills add ./agent-plugin/profile-bits --all`. FORBIDDEN: other change folders, `marketplace-release`, `packages/**` implementation, apply/sync/archive in the propose workflow, git commit.
