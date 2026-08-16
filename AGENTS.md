# profile-bits

GitHub profile widget generator. A **plugin** is a pack of widgets plus declared integrations (1..N widgets, 0..N integrations) — not a single card and not a single API. v0 first-party pack is `github` only (`demo`, `stats`, `languages`). Do not invent extra first-party plugins.

README delivery is the **Action** (commit widget files). The docs playground is layout preview only, not a public embed API.

## Stack

| Pin | Version |
| --- | --- |
| Node | 24 (`engines` + `runs.using: node24`) |
| pnpm | workspace + **catalog:** SSOT |
| OpenSpec | 1.9.0 (`@fission-ai/openspec`) |
| Takumi | 2.9.2 (`takumi-js` / `@takumi-rs/core`) |
| Vitest | 4 |
| Biome | 2.5 |

Use **pnpm** for all JS. Do not add npm/yarn scripts or extra first-party plugin packs in v0.

## OpenSpec is truth

- After sync: `openspec/specs/` is the contract SSOT.
- In-flight work: `openspec/changes/<id>/` (one change = one unit of work).
- Generated `.cursor/skills/openspec-*`, `.claude/skills/openspec-*`, `.agents/skills/openspec-*` are **not** SSOT. `openspec update` regenerates them. Do not hand-edit or treat them as policy.

Engine JSON is a **subcommand flag**, never `openspec --json`:

```bash
pnpm exec openspec status --change <id> --json
pnpm exec openspec list --specs --json
pnpm exec openspec list --json
```

(`just openspec …` is the same CLI.)

## Locks

- Config SSOT: committed `.github/profile-bits.yml` (`additionalProperties: false`).
- Root `action.yml` is **thin** (`user`, `github_token`, `committer_token`, `config`, `output_action`, `dry_run`, optional format/theme overrides, optional `plugin_github`).
- **No** flattened `plugin_<plugin>_<widget>_<option>` Action inputs.
- Never REST `/languages`. Languages: REST crawl, **filter forks/archived then cap 500**, GraphQL `nodes(ids:)` batches of 100.
- Never unauthenticated GitHub (60/h/IP). Empty/`""`/whitespace token **fails the Action**.
- `dist/` is gitignored on `main` (committed only on orphan `release/v1`).
- **Never** tag `v1` at `main`.

## Commands

```bash
just install
just lint
just test
just docs
just generate-action          # pass --check in CI
just check
just openspec <args>
```

Also: `just docs-dev`, `just render`, `just generate-docs`.

## Nested instructions

Read the package file when working in that tree:

- `packages/core/AGENTS.md`
- `packages/renderer/AGENTS.md`
- `packages/integrations/AGENTS.md`
- `packages/plugins/AGENTS.md`
- `packages/action/AGENTS.md`
- `apps/docs/AGENTS.md`
