## Context

See `proposal.md` Why. Capability `author-plugin` is already ADDED and applied (T320/T321). Three-layer specs stay untouched. `action-yml-public-api`, `github-api-fetch-policy`, and `docs-playground` are sibling changes and MUST NOT be edited.

Follow-up locks: plugin root `.agents/profile-bits` (real files); `agent-plugin/` MUST NOT exist (no alias, no copy); `.agents/skills/<id>` are relative symlink projections, not a second SSOT; dest paths include `src/`; pack-level `bitsUsed`; live `FIRST_PARTY_*` catalog; ideate is an `author` mode; empty-args does not ideate; four skills; no `.claude/` harness requirement.

Engine JSON is a **subcommand flag**, never `openspec --json`:

```bash
pnpm exec openspec status --change author-plugin --json
```

## Goals / Non-Goals

**Goals:**

- Reverse Decision 2: canonical plugin root is `.agents/profile-bits` (sibling of `.agents/skills`, not inside it).
- Keep `.agents/skills/<id>` as relative symlink projections of `.agents/profile-bits/skills/<id>`.
- Lock dest examples to `packages/integrations/src/<id>/` and `packages/plugins/src/<pack>/widgets/<id>/`.
- Lock pack-level `bitsUsed` (`{{ID}}_BITS_USED` on `{{id}}Plugin`; widget skill unions into that array).
- Replace github-only / never-wakatime-pack language with live-catalog + no silent expand + no duplicate pack. Keep WakaTime-class client shape.
- Lock ideate/next/brainstorm on umbrella `author`; empty-args gallery then stop; four skills only.
- Record follow-up tasks without treating T320/T321 as unimplemented.

**Non-Goals:**

- Writing live `packages/**`, `apps/**`, `justfile`, `action.yml`, `biome.json`, or `openspec/specs/**` in this O1 edit.
- Creating, requiring, or documenting `.claude/` or `.claude/skills` as authoring-skill projections.
- Applying, syncing, or archiving this change in the same workflow.
- MODIFIED-delta of `plugin-contract` / `widget-contract` / `integration-contract`.
- A fifth skill, `mcp.json`, Marketplace, flattened Action inputs, or editing `packages/core` to put `bitsUsed` on `PluginIdentitySchema`.

## Decisions

### 1. Dedicated capability, not a three-layer rewrite

- **Choice:** Keep `author-plugin` as the only capability in this change. Do not MODIFIED-delta `plugin-contract`, `widget-contract`, or `integration-contract` (those still say v0 github-only catalog — sibling integration changes own that).
- **Why:** Pack/widget/integration semantics stay in the three-layer specs. Authoring packaging (root path, projections, dest, `bitsUsed`, catalog language, ideate) belongs here.
- **Alternative:** MODIFIED-extend `plugin-contract` with skill packaging or live catalog — rejected; user lock is author-plugin only.

### 2. Agent Plugins 1.0.0 at `.agents/profile-bits`; no MCP

- **Choice:** Manifest is `.agents/profile-bits/plugin.json` (`$schema` Agent Plugins 1.0.0, `name: profile-bits`, `version: 0.1.0`, MIT, keywords). Schema is closed (`additionalProperties: false`). Omit `mcp.json`. Do not add a `skills` array or unknown top-level fields. Vendor `plugin.schema.json` under `references/` if needed so `validate.sh` stays offline.
- **S0:** move the Wave 1 tree to `.agents/profile-bits` and delete leftover `agent-plugin/` (no alias, no copy). Install and docs use `npx skills add ./.agents/profile-bits --all`.
- **Why:** `.agents/profile-bits` is a real plugin tree beside `.agents/skills` (OpenSpec owns `openspec-*` + `.openspec-target`). Biome ignores `.agents/skills` only; the SSOT stays lintable. Putting the plugin *inside* `.agents/skills` would mix SSOT with generated OpenSpec skills. An `agent-plugin/` alias is a second live path — rejected.
- **Alternative:** Keep `agent-plugin/profile-bits` as permanent SSOT — rejected. Alternative: optional `agent-plugin/` alias — rejected; user lock removes that tree. Alternative: plugin root inside `.agents/skills` — rejected; that harness directory is not SSOT. Alternative: require `.claude/skills` copies — rejected; user lock is `.agents/skills/<id>` only. Alternative: MCP-enabled plugin — rejected.

### 3. Umbrella router plus three specialized skills; ideate is a mode

- **Choice:** Four skills: `author`, `author-integration`, `author-widget`, `author-plugin`. Frontmatter `name` equals directory; `license: MIT`; portable-core `compatibility` plus `metadata.author: profile-bits` and `metadata.version: "0.1.0"`. Compatibility text: `Requires the profile-bits repo; OpenSpec plugin-contract, widget-contract, integration-contract, and author-plugin specs; packages/core/src/types.ts.`
- **Routing:** data source → `author-integration`; card on existing pack → `author-widget`; new pack → `author-plugin`.
- **Ideate:** `ideate` / `next` / `brainstorm` / “what should I add” is an **`author` mode**, not a fifth skill. Named kind is honored unless a lock fires (MCP, flatten, unauth GitHub, REST `/languages`, second pack for an existing id, invented Action input). Unprompted next inventories live `FIRST_PARTY_*` plus on-disk holes, then ranks **one** next (plus 1–2 runners-up). Empty-args: gallery with ideate as item 0, then **stop** — MUST NOT inventory, rank, or write files. No `author-bit` skill.
- **Why:** One umbrella prevents skipping the three-layer model. Ideate as a mode avoids a fifth skill. Empty-args must not surprise-write.
- **Alternative:** Fifth `author-ideate` or `author-bit` skill — rejected. Alternative: empty-args runs ideate — rejected.

### 4. Templates stay in the plugin root; destinations include `src/`

- **Choice:** Templates live under each skill’s `assets/templates/` inside the plugin root (`.agents/profile-bits`). Use `.template` suffixes. Destination paths in SKILL.md are repo-root:
  - integrations: `packages/integrations/src/<id>/` (client, auth, scopes, inputs, `client.test.ts`)
  - widgets: `packages/plugins/src/<pack>/widgets/<id>/`
  - pack registry: `packages/plugins/src/<pack>/plugin.ts`
  Barrel `packages/integrations/src/index.ts` is mention-only. No `../` in templates. No new `index.ts.template`. `docsPath` is placeholder `{{DOCS_PATH}}` — do not hardcode `/generate/<id>/`. `validate.sh` fails on any template path containing `../`.
- **Why:** Live layout is `packages/*/src/...`. Missing `src/` on the widget path was a design bug. Agent Plugins containment forbids `../`.
- **Alternative:** Dest `packages/integrations/<id>/` or `packages/plugins/<pack>/widgets/<id>/` without `src/` — rejected. Alternative: require `index.ts` for every integration — rejected; github has no barrel file.

### 5. Harness projections are `.agents/skills/<id>` only

- **Choice:** After skills exist (and after S0 retarget):

  ```text
  .agents/skills/author -> ../profile-bits/skills/author
  .agents/skills/author-integration -> ../profile-bits/skills/author-integration
  .agents/skills/author-widget -> ../profile-bits/skills/author-widget
  .agents/skills/author-plugin -> ../profile-bits/skills/author-plugin
  ```

  Relative symlinks only. Leave generated `openspec-*` and `.openspec-target` untouched. Do not write `.cursor/skills/` (OpenSpec regenerates those). Do **not** require, create, or document `.claude/` or `.claude/skills` as authoring-skill projections.
- **Why:** A copied second tree would drift. User lock: harness projections are `.agents/skills/<id>` only.
- **Alternative:** Copy skill files into `.agents/skills` — rejected. Alternative: required `.claude/skills/<id>` MUST exist — rejected.

### 6. WakaTime-class client shape; live catalog; no duplicate pack

- **Choice:** New data sources still generate `client` / `auth` / `scopes` / `inputs` / mocked HTTP tests under `packages/integrations/src/<id>/` using `integration-contract`. `static` = none; `github` = token required in Action. Shared client per run. Cache keys stay REST `(method, url, params)` and GraphQL `(query, variables)`. Auth MAY also be constrained per widget option.
- **Catalog:** Read `packages/core/src/types.ts`: `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, `FIRST_PARTY_INTEGRATION_IDS`, `WIDGET_INTEGRATIONS`, `INTEGRATION_AUTH`, `ActionInputsSchema` (includes optional `wakatime_token`, `http_token_env`). Completing an id already in those lists is allowed. Adding a new id requires OpenSpec first. Do not silently append to `FIRST_PARTY_*`. Do not create a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`. Live types already include wakatime, rss, and http packs. Thin Action names: never invent `plugin_*_*_*`.
- **Why:** “Never a wakatime pack” fights live types. Client shape is architecture, not a catalog freeze at github-only.
- **Alternative:** v0 github-only forever in this capability — rejected. Alternative: new fetch/auth stack for third-party APIs — rejected.

### 7. Public API change is OpenSpec-delta-first; codegen fails closed

- **Choice:** Yaml schema, thin Action inputs, and first-party pack ids are public API. Skills MUST require an OpenSpec delta before **expanding** those surfaces. Completing an id already in `FIRST_PARTY_*` is not an expand. `validate.sh` runs `just generate-action --check` from the **repo root** when that recipe exists. Do not add a just recipe. Fail closed on stale or flattened `plugin_*_*_*` codegen. Walking up to the repo root at runtime is allowed and is not a plugin-relative template `../`.
- **Why:** Silent catalog append would bypass OpenSpec. Completing typed holes must stay allowed.
- **Alternative:** Skills edit `action.yml` directly — rejected. Alternative: warn-and-continue on stale codegen — rejected.

### 8. Evals split routing vs deep assertions; ideate on umbrella

- **Choice:** Agent Skills eval shape beside each SKILL. Umbrella evals cover the seven generation cases as routing, plus ideate/empty-args/refuse cases. Specialized skills own deep assertions. WakaTime routing eval is “no **second** pack / no silent `FIRST_PARTY_*` append”, not “never a wakatime pack”. Empty-args eval MUST NOT inventory or write.
- **Why:** Catalog language and ideate are observable skill behavior.
- **Alternative:** Umbrella-only evals — rejected.

### 9. Applied T320/T321 plus follow-up migrate

- **Choice:** Tasks 1–6 stay checked (applied). §7.1 is the SSOT migrate (move to `.agents/profile-bits`, delete `agent-plugin/`). Remaining §7 items cover `src/` dest, pack-level `bitsUsed`, frontmatter, catalog, and ideate. O1s syncs `openspec/specs/author-plugin` after S0. Do not archive.
- **Why:** Proposal previously said “planning only / do not implement `agent-plugin/**`” after apply had already landed the tree.
- **Alternative:** Uncheck 1–6 and re-implement — rejected; follow-up is additive.

### 10. Pack-level `bitsUsed` (new named requirement)

- **Choice:** Packs export `{{id}}Plugin` and `{{ID}}_BITS_USED`. `bitsUsed` lives on the pack object (`satisfies PluginIdentity & { bitsUsed: typeof … }`). Widget skill **unions** bits into that pack array. Not yaml. No `widget-bits.ts` in core. Do not edit `packages/core` (`PluginIdentitySchema` has no `bitsUsed`). Drop `export const plugin`. `docsPath: "{{DOCS_PATH}}"`.
- **Why:** Live wakatime/rss/http packs use this shape. Widget-entry `bitsUsed` is the wrong SSOT.
- **Alternative:** Widget-entry `bitsUsed` or a core schema field — rejected.

## Risks / Trade-offs

- [Leftover `agent-plugin/`] → S0 deletes the directory; no alias; install is only `npx skills add ./.agents/profile-bits --all`.
- [Synced `openspec/specs/author-plugin` Purpose stays stale until O1s] → O1 must not edit `openspec/specs/**`; OpenSpec ignores Purpose on an existing-capability delta.
- [Harness copy drifts] → Relative `.agents/skills/<id>` symlinks only; do not copy; do not require `.claude/skills`.
- [Second pack for an existing id] → Umbrella + evals refuse duplicate pack / silent `FIRST_PARTY_*` append.
- [Languages option becomes a flattened Action input] → OpenSpec delta first; `--check` fails closed on `plugin_*_*_*`.
- [Templates escape the plugin via `../`] → Containment check in `validate.sh`; dest paths are repo-root with `src/`.
- [MCP sneaks in via `mcp.json`] → Validate rejects the file.
- [Biome parses placeholder TS] → `.template` suffixes; do not edit `biome.json`.

## Migration Plan

1. **Already applied:** T320e/a–d and T321 plus `.agents/skills` projections (tasks 1–6).
2. **This O1:** revise change-folder artifacts only. Do not sync, apply, or archive.
3. **S0:** move the plugin to `.agents/profile-bits`; delete leftover `agent-plugin/`; retarget `.agents/skills/author*` → `../profile-bits/skills/<id>`. Do not create `.claude/skills`.
4. **O1s:** `pnpm exec openspec` apply/sync so `openspec/specs/author-plugin` matches. Do not archive.
5. Templates generate into `packages/**` only when skills run after dest/bitsUsed follow-up — not during this O1.

Rollback of this planning edit: revert `openspec/changes/author-plugin/**`. Do not archive or commit unless asked.

## Open Questions

None. Plugin root, projections, dest `src/`, pack-level `bitsUsed`, live catalog, ideate/empty-args, four skills, no `.claude/` requirement, and engine JSON-as-subcommand-flag are locked.
