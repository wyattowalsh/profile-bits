## Context

See `proposal.md` Why. Three-layer specs are already synced (`plugin-contract`, `widget-contract`, `integration-contract`). `action-yml-public-api`, `github-api-fetch-policy`, and `docs-playground` are in-flight sibling changes and MUST NOT be edited. This change ADDED-specs Agent Plugin packaging and authoring skills as capability `author-plugin` so T320a–e and T321 can implement against a dedicated contract without rewriting the three-layer model.

Constraints: Agent Plugins spec 1.0.0; no `mcp.json`; v0 first-party pack remains `github` only (`demo`, `stats`, `languages`); yaml is config SSOT; thin Action inputs only; never invent `plugin_<plugin>_<widget>_<option>`; public API change requires an OpenSpec delta first; fail closed on stale codegen.

## Goals / Non-Goals

**Goals:**

- Make T320e (`plugin.json`, `scripts/validate.sh`), T320a–d (four skills + evals + templates), and T321 (harness relative symlinks) implementable against a frozen authoring-plugin contract.
- Keep WakaTime-class work on the existing integration architecture (client, auth, scopes, inputs, mocked HTTP).
- Keep harness `.agents/skills` / `.claude/skills` as projections of `agent-plugin/profile-bits/skills/*`, not a second SSOT.

**Non-Goals:**

- Implementing `agent-plugin/**`, `packages/**`, `apps/**`, `justfile`, `action.yml`, or harness copies in this propose workflow.
- Applying, syncing, or archiving this change in the same workflow.
- Other OpenSpec changes (`plugin-contract` / `widget-contract` / `integration-contract` rewrites, `action-yml-public-api`, `github-api-fetch-policy`, `docs-playground`, `marketplace-release`).
- Extra first-party plugin packs (including `wakatime`), MCP, Marketplace, `dist/`, or tagging `v1` at `main`.

## Decisions

### 1. Dedicated capability, not a three-layer rewrite

- **Choice:** New `author-plugin` spec. Do not MODIFIED-delta `plugin-contract`, `widget-contract`, or `integration-contract`.
- **Why:** Those contracts already lock pack/widget/integration semantics. Authoring packaging (Agent Plugin 1.0.0, skill routing, contained templates, harness projections, evals, validate) belongs in a capability T320/T321 can apply without mixing Marketplace or fetch-policy concerns. Peak propose is 1.
- **Alternative:** MODIFIED-extend `plugin-contract` with skill packaging — rejected; user asked for an ADDED-only capability so archive stays clean.

### 2. Agent Plugins 1.0.0 at agent-plugin/profile-bits; no MCP

- **Choice:** Manifest is `agent-plugin/profile-bits/plugin.json` (`$schema` Agent Plugins 1.0.0, `name: profile-bits`, `version: 0.1.0`, MIT, keywords). Schema is closed (`additionalProperties: false`). Omit `mcp.json`. Do not add a `skills` array or unknown top-level fields. Vendor `plugin.schema.json` under `references/` if needed so `validate.sh` stays offline.
- **Why:** Plan locks the path, schema version, and no-MCP v0. A skills array in `plugin.json` would fight Agent Plugins 1.0.0 closed schema.
- **Alternative:** MCP-enabled plugin or Marketplace packaging — rejected. Alternative: put the plugin under `.agents/` — rejected; that would make the harness tree the SSOT.

### 3. Umbrella router plus three specialized skills

- **Choice:** `skills/author` reads OpenSpec + core types, then routes: data source → `author-integration`; card on existing pack → `author-widget`; new pack → `author-plugin`. Specialized skills own generation and deep evals. Keep each `SKILL.md` under ~500 lines; put long lock tables in `references/` loaded on demand. Frontmatter `name` equals directory; `license: MIT`.
- **Why:** One umbrella prevents authors from skipping the three-layer model. Splitting generation keeps evals and templates owned. Peak propose is 1.
- **Alternative:** One mega-skill — rejected; exceeds line budget and mixes routing with generation. Alternative: three skills with no router — rejected; WakaTime-class requests would invent a pack.

### 4. Templates stay in the plugin root; destinations are repo-root paths in SKILL.md

- **Choice:** Templates live under each skill’s `assets/templates/` inside `agent-plugin/profile-bits`. Use `.template` suffixes so Biome (`biome.json` includes `**`, and this change MUST NOT edit it) does not parse placeholder TS. Destination paths are documented in SKILL.md as repo-root paths (`packages/integrations/<id>/`, `packages/plugins/<pack>/widgets/<id>/`, `packages/plugins/src/<id>`). `validate.sh` fails on any template path containing `../`.
- **Why:** Agent Plugins containment forbids `../`. Writing live `packages/**` during propose/apply of this change is forbidden; templates generate there only when skills run later.
- **Alternative:** Templates that `../` into `packages/` — rejected. Alternative: live package scaffolds in this change — rejected; OWN is `openspec/changes/author-plugin/**` for propose.

### 5. T321 harness projections are relative symlinks

- **Choice:** After skills exist, create relative symlinks only:
  - `.agents/skills/author` → `../../agent-plugin/profile-bits/skills/author` (same for `author-integration`, `author-widget`, `author-plugin`)
  - `.claude/skills/<id>` → the same targets
  Leave generated `openspec-*` skills untouched. Do not write `.cursor/skills/` (OpenSpec regenerates those). Document `npx skills add ./agent-plugin/profile-bits --all` in plugin-local `AGENTS.md`.
- **Why:** A copied second tree would drift. `.cursor/skills/` is generated OpenSpec SSOT-not. Relative links survive clone.
- **Alternative:** Copy skill files into `.agents/skills` — rejected. Alternative: hand-edit generated OpenSpec skills — rejected.

### 6. WakaTime-class is an integration on existing architecture

- **Choice:** New data sources (WakaTime-class) generate `client` / `auth` / `scopes` / `inputs` / mocked HTTP tests under `packages/integrations/<id>/` using `integration-contract`. `static` = none; `github` = token required in Action. Shared client per run. Cache keys stay REST `(method, url, params)` and GraphQL `(query, variables)`. Do not add a first-party `wakatime` pack. Do not invent a second fetch/auth stack.
- **Why:** Plugin = pack of widgets + declared integrations. A data source is not a pack. v0 first-party catalog stays `github` only.
- **Alternative:** First-party `wakatime` plugin pack — rejected. Alternative: new architecture for third-party APIs — rejected.

### 7. Public API change is OpenSpec-delta-first; codegen fails closed

- **Choice:** Yaml schema, thin Action inputs, and first-party pack ids are public API. Skills MUST require an OpenSpec delta before expanding those surfaces. `validate.sh` runs `just generate-action --check` from the **repo root** when that recipe exists (already in `justfile` / core codegen). Do not add a just recipe (`justfile` is forbidden in this change). Fail closed on stale or flattened `plugin_*_*_*` codegen. Tell the author to run `just generate-action` and `just generate-docs` when those exist. Walking up to the repo root at runtime is allowed and is not a plugin-relative template `../`.
- **Why:** `plugin-contract` / `action-public-api` already fail `--check` on flattened inputs. Authoring skills that silently codegen would bypass OpenSpec.
- **Alternative:** Skills edit `action.yml` directly — rejected. Alternative: warn-and-continue on stale codegen — rejected.

### 8. Evals split routing vs deep assertions

- **Choice:** Agent Skills eval shape (`skill_name`, `evals[]` with `id`, `prompt`, `expected_output`, `assertions`) beside each SKILL. Umbrella evals cover all seven cases as routing. Specialized skills own deep assertions (mocked HTTP, OpenSpec-delta-first, exclusive `md.families` swap, Takumi-safe `tw`/`className`, APNG `.png`, omit `source` for `widget.mdx`).
- **Why:** Routing bugs (WakaTime → pack) are umbrella failures; generation bugs belong on the skill that writes files.
- **Alternative:** Umbrella-only evals — rejected; would miss exclusive-family and source-discovery locks.

### 9. Apply maps to T320/T321 only

- **Choice:** Implementation tasks are T320e → T320a–d (parallel after manifest) → T321. Apply checks off those files under `agent-plugin/profile-bits/` and harness symlinks. Do not start `packages/**` / `apps/**` work. Sync later copies this capability into `openspec/specs/author-plugin/`.
- **Why:** Plan OWN globs. Propose is planning artifacts only.
- **Alternative:** Apply also scaffolds live packages — rejected.

## Risks / Trade-offs

- [Harness copy drifts from plugin skills] → Relative symlinks only; `validate.sh` + `skills-ref validate` on the plugin tree; do not hand-edit `.agents` / `.claude` copies.
- [WakaTime-class request becomes a first-party pack] → Umbrella routes data sources to `author-integration`; eval asserts no `wakatime` pack.
- [Languages option becomes a flattened Action input] → OpenSpec delta first; `--check` fails closed on `plugin_*_*_*`.
- [Second pack silently joins the first-party catalog] → Skills require OpenSpec + type-contract change before expanding first-party ids; v0 stays `github` only.
- [Templates escape the plugin via `../`] → Containment check in `validate.sh`; destinations live in SKILL.md as repo-root paths.
- [Stale codegen ships flattened inputs] → `just generate-action --check` from repo root; fail closed.
- [MCP sneaks in via `mcp.json`] → Validate rejects the file; spec forbids MCP in v0.
- [Biome parses placeholder TS in templates] → `.template` suffixes; do not edit `biome.json`.
- [Generated OpenSpec skill trees get overwritten] → T321 leaves `openspec-*` alone and does not write `.cursor/skills/`.

## Migration Plan

Greenfield authoring plugin. Apply later (new request): T320e manifest + `validate.sh`, then T320a–d skills/evals/templates in parallel, then T321 relative symlinks + plugin `AGENTS.md` / `references/contract.md`. Sync then copies `author-plugin` into `openspec/specs/`. Templates generate into `packages/**` only when skills run after apply — not during this propose.

Rollback: delete this change folder before archive; no production Agent Plugin exists yet. Do not archive or commit unless asked.

## Open Questions

None. Agent Plugin 1.0.0 path, no `mcp.json`, four-skill routing, contained templates, T321 symlinks, OpenSpec-delta-first public API, fail-closed stale codegen, WakaTime-class integration, and no extra first-party packs are locked by the plan and this spec.
