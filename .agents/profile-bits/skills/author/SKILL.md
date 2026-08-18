---
name: author
description: >-
  Routes profile-bits authoring and ranks the next add. Data source →
  author-integration; card on an existing pack → author-widget; new pack →
  author-plugin. Modes include ideate/next/brainstorm, which ranks one bit,
  integration, widget, or pack from live FIRST_PARTY_* plus on-disk holes. Use
  when adding a widget, integration, or pack, or asking what to add next. NOT
  for Action runtime, Takumi renderer internals, docs playground/generate, MCP,
  Marketplace, flattened plugin_*_*_* inputs, unauthenticated GitHub, REST
  /languages, openspec --json, or a second pack for an id already in types.ts.
license: MIT
compatibility: Requires the profile-bits repo; OpenSpec plugin-contract, widget-contract, integration-contract, and author-plugin specs; packages/core/src/types.ts.
metadata:
  author: profile-bits
  version: "0.1.0"
---

# Author (router)

Umbrella skill. Classify the request, then hand off. Do **not** implement
integrations, widgets, or packs here. Ideate/next/brainstorm is a **mode** of
this skill (not a fifth skill): inventory, rank, print a table, stop. Write no
files from this router.

A **plugin** is a pack of widgets plus declared integrations (1..N widgets,
0..N integrations) — not a single card and not a single API.

Empty `$ARGUMENTS` / `help` / “how do I author” **skip Before routing**. Show
gallery items **0–3 only** and **stop**. Do not inventory. Do not read
`packages/core/src/types.ts` or the OpenSpec contracts. Do not load
[next.md](references/next.md) or [locks.md](references/locks.md).

Catalog SSOT is `packages/core/src/types.ts`: `FIRST_PARTY_PLUGIN_IDS`,
`FIRST_PARTY_WIDGET_IDS`, `FIRST_PARTY_INTEGRATION_IDS`, `WIDGET_INTEGRATIONS`,
`INTEGRATION_AUTH`, `ActionInputsSchema`. Do not hardcode github-only.
Completing an id already in those lists is allowed. Adding a new id requires
OpenSpec first. Do not create a second pack for an id already in
`FIRST_PARTY_PLUGIN_IDS`. WakaTime-class **architecture** (client, auth, scopes,
inputs, mocked HTTP) still applies to **new** data sources. Live types already
include wakatime, rss, and http packs. Thin Action names: read
`ActionInputsSchema` (includes optional `wakatime_token`, `http_token_env`);
never invent `plugin_*_*_*`.

## Dispatch

| `$ARGUMENTS` | Handler |
| --- | --- |
| *(empty)* / `help` / how do I author | Empty-args gallery items **0–3** (ideate is item 0). **Skip Before routing.** **Stop.** Do not inventory. Do not read `types.ts`. |
| `ideate` / `next` / `brainstorm` / what should I add | Load [next.md](references/next.md) **only**. Rank one kind. Write no files. |
| Named bits / frozen 11 / `packages/bits` | `bit-checklist` (no `author-bit` skill). Do not inventory a substitute kind. |
| New data source, API client, auth, scopes, WakaTime-class | `author-integration` |
| New card, widget, template, yaml option, animation, MD/MDX, stylesheets | `author-widget` on an existing pack unless they asked for a new pack |
| New pack / plugin id / catalog add | `author-plugin` |
| consumer README / local CLI / `just render` / `pnpm render` | sibling plugin `.agents/profile-bits-readme` skill `render` (refuse to implement runtime here) |
| MCP, flatten `plugin_*_*_*`, unauth GitHub, REST `/languages`, `openspec --json` | Refuse (NOT-for) |

Natural-language requests use the same table. Do not invent a mutating default.

### Empty args / help

When `$ARGUMENTS` is empty (or the user only asks `help` / how authoring
works), show this gallery and **stop**. This path sits **above** Before
routing and **never enters it**.

Do not write files. Do not inventory. Do not load
[next.md](references/next.md). Do not load [locks.md](references/locks.md).
Do **not** read `packages/core/src/types.ts` or the OpenSpec contracts.

0. **Ideate** — ask what to add next (`ideate` / `next` / `brainstorm`). Ranks
   one bit, integration, widget, or pack from live `FIRST_PARTY_*` plus
   on-disk holes. Does **not** run on empty args.
1. **Data source** → `author-integration` (client, auth, scopes, mocked HTTP)
   at `packages/integrations/src/<id>/`.
2. **Card** → `author-widget` on an existing pack.
3. **Pack** → `author-plugin` (`<id>Plugin`, derived integration union,
   pack-level `bitsUsed`, `docsPath: "{{DOCS_PATH}}"`).

Gallery items are **0–3 only**. Completing an existing catalog id is allowed
once a mutating skill runs; empty args do not inventory or read `types.ts` to
prove that.

## Critical rules

1. Empty `$ARGUMENTS` / `help` → gallery items 0–3 (ideate is item 0); skip Before routing; stop; do not inventory; do not read `types.ts`; do not load `next.md`; do not write files.
2. `ideate` / `next` / `brainstorm` / “what should I add” → load `next.md` only; rank one kind + 1–2 runners-up; write no files; copy no templates.
3. Honor a **named kind** unless a lock fires (MCP, flatten, unauth GitHub, REST `/languages`, `openspec --json`, second pack for an existing id, invented Action input).
4. Named bits → `bit-checklist` (no `author-bit` skill). Do not load `next.md` for a named bit.
5. Catalog SSOT is `types.ts` **after** empty-args/help is ruled out. Completing an existing id is allowed. New id → OpenSpec. No second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`.
6. New data source → `author-integration` first, even if they also want a card. Dest `packages/integrations/src/<id>/`.
7. Never invent `plugin_*_*_*`. Read `ActionInputsSchema` (optional `wakatime_token`, `http_token_env`).
8. Do not write `packages/**` from this router. Hand off by skill name (`author-integration`, `author-widget`, `author-plugin`). Bit holes use `bit-checklist`.
9. Public API → OpenSpec first. Engine JSON is a **subcommand flag** only — never `openspec --json`. Fail closed on stale codegen. Pack `bitsUsed` is pack-level on `<id>Plugin`. `docsPath` is `"{{DOCS_PATH}}"`.

## Engine JSON

Engine JSON is a **subcommand flag**, never `openspec --json`:

```bash
pnpm exec openspec status --change <id> --json
pnpm exec openspec list --specs --json
pnpm exec openspec list --json
```

(`just openspec …` is the same CLI.) Refuse any ask to run `openspec --json`.

## Refuse (NOT-for)

Do not use this skill to:

- Change Action runtime, thin `action.yml` behavior, or Marketplace inputs
- Edit Takumi renderer internals (`packages/renderer`)
- Build docs `/playground` or `/generate`
- Add MCP (`mcp.json`)
- Add Marketplace flattened `plugin_<plugin>_<widget>_<option>` inputs
- Call GitHub unauthenticated (empty / `""` / whitespace `github_token` fails the Action)
- Use REST `/languages` (filter-then-cap + GraphQL `nodes(ids:)` batches of 100)
- Run `openspec --json` (subcommand flag only)
- Create a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`
- Implement the local CLI engine (`just render` / `pnpm render` / `runMain`); point to sibling plugin `.agents/profile-bits-readme` skill `render`

Redirect those requests away. Name the lock. Do not route them to the
specialized author skills. Do not inventory a consolation add.

Empty `$ARGUMENTS` / `help` / how-do-I-author **never enter** Before routing.
Show gallery 0–3 and stop.

## Before routing

Skip this entire section for empty `$ARGUMENTS` / `help` / how-do-I-author.

1. Read these repo files (prose paths from the profile-bits repo root — not
   skill-relative links):
   - `openspec/specs/plugin-contract/spec.md`
   - `openspec/specs/widget-contract/spec.md`
   - `openspec/specs/integration-contract/spec.md`
   - `packages/core/src/types.ts`
   - `openspec/specs/author-plugin/spec.md` when that spec exists
2. Load [shared locks](references/locks.md) for mutating handoff. Load
   [next.md](references/next.md) **only** for ideate.
3. Classify **kind**: data source vs card vs pack vs (ideate only) bit.
4. Hand off to the matching specialized skill by **name**. Those skills live
   as siblings under the Agent Plugin `skills/` directory. Do not use
   parent-relative file paths. Do not copy this skill into a second tree.

If the request includes a **new data source**, route `author-integration`
**first**, even if they also want a card.

## Classification

| Signal | Kind | Route |
| --- | --- | --- |
| `ideate` / `next` / `brainstorm` / what should I add | Unprompted next | This skill + [next.md](references/next.md) |
| Named bits / frozen 11 / `packages/bits` | Bit | `bit-checklist` |
| New API, client, token, scopes, cache keys, WakaTime / similar time-tracker | Data source | `author-integration` |
| New card, widget file (`widget.tsx` / `.md` / `.mdx` / `.html`), yaml option, bits-in-a-card, Takumi template, CSS `@keyframes`, gif/apng, Tailwind `tw`/`className`, `md.families` | Card | `author-widget` |
| New plugin id, pack registry, `docsPath`, derived integration union, expanding `FIRST_PARTY_PLUGIN_IDS` | Pack | `author-plugin` |
| New card **and** they asked for a new pack | Pack then card | `author-plugin`, then `author-widget` |
| New card on an existing pack id (including `rss` / `wakatime` / `http` / `github`) | Card on existing pack | `author-widget` only |
| MCP / `mcp.json` | Refuse | Stop |
| Flattened `plugin_*_*_*` | Refuse | Stop |
| Unauthenticated GitHub (empty / `""` / whitespace token) | Refuse | Stop |
| REST `/languages` | Refuse | Stop |
| `openspec --json` | Refuse | Stop |

### Routing examples

| User intent | Route | Lock |
| --- | --- | --- |
| Add a WakaTime integration | `author-integration` | Complete existing `wakatime` id; no second pack |
| Add a languages option | `author-widget` | OpenSpec delta first (yaml schema); no flattened Action input |
| New pack using github + static | `author-plugin` | OpenSpec before expanding plugin ids |
| Widget with CSS animation for gif/apng | `author-widget` | `@keyframes` authoring; APNG `.png`; SVG still stays baked |
| Drop in `widget.mdx` with no `source` | `author-widget` | Prefer omit `source`; canonical `widget.mdx` |
| Tailwind stylesheets widget | `author-widget` | Takumi-safe tw/className only on div/span/img; typed bit props; pack-level bitsUsed union |
| Swap `md.families.code` to starry-night | `author-widget` | Exclusive family swap; do not stack pretty-code + starry-night |
| What should I add next? | ideate | Load `next.md`; no files |
| Add a widget on rss | `author-widget` | Honor named kind; do **not** load `next.md`; existing `rss` pack |
| Add a Theme / Frame bit | `bit-checklist` | No `author-bit` skill; do not inventory |
| Add an MCP server | Refuse | No `mcp.json`. No inventory |
| `plugin_github_stats_include` | Refuse | Flatten. Thin Action only |
| Call GitHub with an empty token | Refuse | Unauth. Empty / `""` / whitespace fails the Action |
| Fetch REST `/languages` | Refuse | Filter-then-cap + GraphQL `nodes(ids:)` batches of 100 |
| Run `openspec --json` | Refuse | Subcommand flag only |

## Handoff

After classifying (never for empty args / help):

1. Name the specialized skill and the kind (data source / card / pack / bit).
2. Repeat the relevant locks from [shared locks](references/locks.md) for
   mutating work. Ideate uses [next.md](references/next.md) instead. Named
   bits use `bit-checklist` and stop.
3. Follow that skill's instructions and copy from **its** templates. Do not
   hand-edit a second skills tree. Do not write live package source from this
   router.
4. If the change is public API (yaml schema, plugin ids, Action inputs,
   widget option trees), require an OpenSpec delta **before** code.
5. Fail closed on stale codegen. Do not invent Action input names. Read
   `ActionInputsSchema` in `packages/core/src/types.ts`.
6. When `justfile` has `generate-action` / `generate-docs` (this repo does),
   tell the user to run:

   ```bash
   just generate-action
   just generate-docs
   ```

   CI uses `just generate-action --check`.

## Gotchas

- Empty args / help skip Before routing. They do **not** read `types.ts`.
- `FIRST_PARTY_PLUGIN_IDS` is live in `types.ts` (github, wakatime, rss, http).
  A new pack id is an OpenSpec + `packages/core/src/types.ts` change, not a
  silent catalog add. Completing an existing id is allowed (including a
  missing pack-level `bitsUsed` on an existing `<id>Plugin`).
- Yaml at `.github/profile-bits.yml` is config SSOT (`additionalProperties:
  false`). Yaml present beats `plugin_github`. Widget options live in yaml,
  never as flattened Action inputs.
- Never invent Action input names. Thin inputs are listed in
  [shared locks](references/locks.md).
- Widgets do not perform HTTP. They consume a cached integration payload.
- Default SVG is a baked still. CSS `@keyframes` are authoring input to
  `renderAnimation`, not GitHub SVG runtime. APNG files are named `.png`.
- Write from templates. Fail closed if codegen would emit flattened option
  inputs or if public API moved without an OpenSpec delta.
- github **is** in `packages/integrations/src/index.ts`. Completing github
  **pack-level** `bitsUsed` (when the pack dir already exists) is rank **1b**,
  not a missing pack and not a barrel hole.
- Named bits → `bit-checklist`. Empty args do not run ideate.
- Never `openspec --json`.

## Reference index

Do not load all at once.

| File | Load when |
| --- | --- |
| [locks.md](references/locks.md) | Mutating handoff (integration / widget / pack). **Not** empty args / help |
| [next.md](references/next.md) | **Only** for `ideate` / `next` / `brainstorm` / “what should I add” |

## Proof

From the plugin root:

```bash
bash scripts/validate.sh
pnpm dlx skills-ref@0.1.5 validate skills/author
```
