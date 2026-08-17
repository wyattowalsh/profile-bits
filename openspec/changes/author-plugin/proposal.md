## Why

The three-layer contract is synced (`plugin-contract`, `widget-contract`, `integration-contract`), but authors still have no packaged Agent Plugin that routes “new data source / new card / new pack” onto those layers. Without that lock, a later skill tree can invent flattened Action inputs, a first-party `wakatime` pack, MCP in v0, or a second skills SSOT under `.agents/skills`.

## What Changes

- Add capability `author-plugin`: package Agent Plugin 1.0.0 at `agent-plugin/profile-bits` (`plugin.json` named `profile-bits`) with skills that generate integrations, widgets, and packs from the three-layer contract.
- Lock skills: `author` (umbrella router), `author-integration`, `author-widget`, `author-plugin`.
- Lock routing: new data source → integration first; new card → widget on an existing pack unless the author asked for a new pack; new pack → `author-plugin`.
- Forbid inventing Action input names; yaml (`.github/profile-bits.yml`) remains SSOT; never `plugin_<plugin>_<widget>_<option>`.
- Lock templates inside the plugin root (no `../` paths). T321 harness trees `.agents/skills` and `.claude/skills` are relative symlinks, not a second skills SSOT. Do not write `.cursor/skills/`.
- Lock public-API changes (yaml schema, thin Action inputs, first-party pack ids) to an OpenSpec delta first. Fail closed on stale codegen (`generate-action --check`; tell the author to run `just generate-action` and `just generate-docs` when those exist).
- Lock WakaTime-class work as a new **integration** on existing architecture (client, auth, scopes, inputs, mocked HTTP). Do not invent a first-party `wakatime` pack or a new integration stack. v0 first-party pack remains `github` only.
- Lock evals: WakaTime integration; languages option (OpenSpec delta, no flattened input); new pack using github+static; CSS animation for gif/apng; drop-in `widget.mdx` with no `source`; Tailwind stylesheet widget; exclusive `md.families.code` swap. Umbrella evals cover all seven as routing; specialized skills own deep assertions.
- Lock validate: `plugin.json` against Agent Plugins 1.0.0; reject `mcp.json` if present; `skills-ref validate` on each skill; `just generate-action --check` from repo root when that recipe exists; fail if any template path contains `../`. No MCP in v0 (`mcp.json` omitted).

This change is planning only. Do not implement `agent-plugin/**`. Do not rewrite `plugin-contract`, `widget-contract`, or `integration-contract`.

## Capabilities

### New Capabilities

- `author-plugin`: Agent Plugin 1.0.0 at `agent-plugin/profile-bits` — `plugin.json` named `profile-bits`, no `mcp.json`, four skills with umbrella routing, yaml-SSOT (no invented Action inputs), contained templates, T321 harness symlinks not a second skills tree, OpenSpec-delta-first for public API, fail-closed stale codegen, WakaTime-class integration without new architecture, no extra first-party packs in v0, locked evals, and `generate-action --check` plus `skills-ref validate`.

### Modified Capabilities

- (none — three-layer contracts stay as synced; this change ADDED-specs the authoring plugin as a dedicated capability so archive stays clean. Do not MODIFIED-delta `plugin-contract`, `widget-contract`, `integration-contract`, `action-public-api`, `github-api-fetch-policy`, or `playground`.)

## Impact

- Specs: new `openspec/specs/author-plugin/spec.md` after archive/sync. No edits to `plugin-contract`, `widget-contract`, `integration-contract`, `action-public-api`, `github-api-fetch-policy`, or `playground` in this change.
- Code (later, not this change): `agent-plugin/profile-bits/` T320a–e (`plugin.json`, `scripts/validate.sh`, `references/contract.md`, four skills + templates + evals) and T321 harness symlinks. Templates generate *into* `packages/**` only when those skills run; this change does not write live package source.
- Out of scope: `agent-plugin/**` / `packages/**` / `apps/**` implementation in this workflow, `marketplace-release` (T036 after T400), extra first-party plugins, MCP, archiving, git commit, plan/README edits.
