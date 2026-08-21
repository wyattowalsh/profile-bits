# author-plugin

Agent Plugin 1.0.0 for authoring integrations, widgets, and packs from the three-layer contract.

Canonical plugin root: `.agents/profile-bits`. `agent-plugin/` MUST NOT exist (no alias, no copy). Harness projections are `.agents/skills/<id>` relative symlinks only — not a second SSOT.

Four skills. Ideate/next is an `author` mode; empty-args does not ideate. Catalog SSOT is live `FIRST_PARTY_*` in `packages/core/src/types.ts`.

Engine JSON is a subcommand flag: `pnpm exec openspec status --change author-plugin --json` (never `openspec --json`).
