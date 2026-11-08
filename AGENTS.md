# profile-bits

GitHub profile widget generator. A **plugin** is a pack of widgets plus declared integrations (1..N widgets, 0..N integrations) — not a single card and not a single API. First-party packs follow live `FIRST_PARTY_PLUGIN_IDS`: `github` (`demo`, `stats`, `languages`, `repo`, `top-repos`, `contributions`), `wakatime` (`coding`, `editors`, `projects`, `os`, `langs`), `rss` (`feed`, `latest`), `http` (`json`, `chips`), `spotify` (`now-playing`, `top`), `leetcode` (`solved`, `heatmap`), `chess` (`ratings`, `game`; integrations `chesscom` and `lichess`), and `steam` (`player`, `recent`). Do not invent packs beyond that live catalog. `repo` is opt-in like `demo` (github pack defaults stay `stats` + `languages`). Spotify defaults `now-playing`, LeetCode defaults `solved`, chess defaults `ratings`, steam defaults `player`.

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

Use **pnpm** for all JS. Do not add npm/yarn scripts or first-party plugin packs beyond live `FIRST_PARTY_PLUGIN_IDS`.

## OpenSpec is truth

- Visual identity and architecture live in `DESIGN.md`. Requirement contracts live in `openspec/specs/`.
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
- Root `action.yml` is **thin** (`user`, `github_token`, `committer_token`, `config`, `output_action`, `dry_run`, optional format/theme overrides, optional `plugin_github`, optional `wakatime_token` with no default, optional `http_token_env` with no default, optional `spotify_token` with no default, optional `steam_token` with no default).
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
just generate-docs            # playground-fields snapshot; pass --check in CI
just validate-agent-plugins   # both .agents/*/scripts/validate.sh
just check
just openspec <args>
just render                   # local CLI (`profile-bits render`)
```

`just render` / `pnpm render` run `@profile-bits/cli` around Action `runMain`. CLI default `output_action` is `none`; the Action Marketplace default remains `commit`.

`just generate-docs` refreshes `playground-fields.json` only. It does not rewrite `AGENTS.md`, `README.md`, or `DESIGN.md`. `just check` also runs `just validate-agent-plugins`.

Also: `just docs-dev`.

## Nested instructions

Read the package file when working in that tree:

- `packages/core/AGENTS.md`
- `packages/renderer/AGENTS.md`
- `packages/integrations/AGENTS.md`
- `packages/plugins/AGENTS.md`
- `packages/action/AGENTS.md`
- `packages/bits/AGENTS.md`
- `packages/themes/AGENTS.md`
- `apps/docs/AGENTS.md`
- `.agents/profile-bits/AGENTS.md`
- `.agents/profile-bits-readme/AGENTS.md`

Agent Plugin skills follow live `packages/core/src/types.ts` `FIRST_PARTY_*`, not a frozen four-id table to bump when packs are added.
The authoring plugin ships exactly `author`, `author-bit`, `author-palette`,
`author-integration`, `author-widget`, and `author-plugin`; read
`.agents/profile-bits/AGENTS.md` before changing that tree.
Mutating author skills follow `.agents/profile-bits/references/docs-closeout.md`
(`just generate-docs` is the playground-fields snapshot only).

Install is a documented human command, not an agent step in this repo.

```bash
npx skills add ./.agents/profile-bits
```

MUST NOT pass `--all`. MUST NOT create `.claude/`. Agents MUST NOT run `skills add` here (committed `120000` harness links). Do NOT run `skills add` yourself.
