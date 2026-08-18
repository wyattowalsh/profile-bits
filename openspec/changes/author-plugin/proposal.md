## Why

T320/T321 packaged Agent Plugin 1.0.0 and four authoring skills, but the in-flight contract still pins the plugin root at `agent-plugin/profile-bits`, documents dest paths without `src/`, omits pack-level `bitsUsed`, and still says v0 github-only / never a wakatime pack. Live `packages/core/src/types.ts` already lists `github`, `wakatime`, `rss`, and `http`. Without a follow-up delta, migrate, dest, catalog, and ideate will fight the spec.

## What Changes

- Keep capability `author-plugin` (no three-layer rewrite). Canonical plugin root is `.agents/profile-bits` (real files). `agent-plugin/` MUST NOT exist as a directory, alias, or copy. Install is `npx skills add ./.agents/profile-bits --all`.
- Harness projections are `.agents/skills/<id>` relative symlinks to `.agents/profile-bits/skills/<id>` only — not a second SSOT. Do not write `.cursor/skills/`. Do not require, create, or document `.claude/` or `.claude/skills` as authoring-skill projections.
- Dest examples: `packages/integrations/src/<id>/` and `packages/plugins/src/<pack>/widgets/<id>/`. Templates stay inside the plugin root (no `../`).
- ADD pack-level `bitsUsed`: `{{ID}}_BITS_USED` on `{{id}}Plugin`; widget skill unions into that array. Not yaml. Do not edit `packages/core`.
- Four skills only. Ideate/next/brainstorm is an `author` mode. Empty-args is gallery (ideate as item 0) then stop — it MUST NOT inventory. No `author-bit`.
- Catalog SSOT is live `FIRST_PARTY_*` in `packages/core/src/types.ts`. Completing an id already in those lists is allowed. Adding a new id requires OpenSpec first. Do not silently expand the lists. Do not create a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`. WakaTime-class **client shape** (client, auth, scopes, inputs, mocked HTTP) is unchanged.
- Portable-core frontmatter on all four skills (`name`, `description`, `license: MIT`, `compatibility`, `metadata.author: profile-bits`, `metadata.version: "0.1.0"`).
- Engine JSON is a **subcommand flag**: `pnpm exec openspec status --change author-plugin --json`. Never `openspec --json`.

T320/T321 (plugin tree + `.agents/skills` projections) are **applied**. Remaining work is follow-up: SSOT migrate, `src/` dest, pack-level `bitsUsed`, frontmatter, live catalog, and umbrella ideate. Do not write live `packages/**` from this change. Do not rewrite `plugin-contract`, `widget-contract`, or `integration-contract`. Do not sync, apply, or archive in this planning edit.

## Capabilities

### New Capabilities

- (none — `author-plugin` already exists. This change’s original ADDED capability stays; follow-up is MODIFIED/RENAMED/ADDED on the same capability.)

### Modified Capabilities

- `author-plugin`: plugin root `.agents/profile-bits`; `.agents/skills/<id>` projections only; dest `src/` paths; pack-level `bitsUsed`; live-catalog + no silent expand + no duplicate pack; ideate/next on umbrella `author`; empty-args does not ideate; four skills; WakaTime-class client shape unchanged.

## Impact

- Specs: delta only under `openspec/changes/author-plugin/specs/author-plugin/spec.md`. Synced `openspec/specs/author-plugin/` is updated later (O1s after S0), not in this edit. No edits to `plugin-contract`, `widget-contract`, `integration-contract`, `action-public-api`, `github-api-fetch-policy`, or `playground`.
- Code: after S0 the plugin files live at `.agents/profile-bits/`. `agent-plugin/` is removed. Templates generate *into* `packages/**` only when those skills run; this change does not write live package source.
- Out of scope: live `packages/**` / `apps/**` implementation, `.claude/` or `.claude/skills` creation, three-layer contract rewrites, MCP, Marketplace, `dist/`, tagging `v1` at `main`, archive, git commit, `openspec` sync/validate as a completion gate.
