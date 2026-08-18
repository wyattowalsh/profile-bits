---
name: author
description: >-
  Routes profile-bits authoring and ranks the next add. Data source →
  author-integration; card on an existing pack → author-widget; new pack →
  author-plugin. Modes include ideate/next/brainstorm, which ranks one bit,
  integration, widget, or pack from live FIRST_PARTY_* plus on-disk holes. Use
  when adding a widget, integration, or pack, or asking what to add next. NOT
  for Action runtime, Takumi renderer internals, docs playground/generate, MCP,
  Marketplace, flattened plugin_*_*_* inputs, or a second pack for an id
  already in types.ts.
license: MIT
compatibility: Requires the profile-bits repo; OpenSpec plugin-contract, widget-contract, integration-contract, and author-plugin specs; packages/core/src/types.ts.
metadata:
  author: profile-bits
  version: "0.1.0"
---

# Author (router)

Umbrella skill. Classify the request, read contracts, then hand off. Do **not**
implement integrations, widgets, or packs here. Ideate/next/brainstorm is a
**mode** of this skill (not a fifth skill): inventory, rank, print a table,
stop. Write no files from this router.

A **plugin** is a pack of widgets plus declared integrations (1..N widgets,
0..N integrations) — not a single card and not a single API.

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
| *(empty)* / `help` / how do I author | Empty-args gallery (ideate is item 0). **Stop.** Do not inventory. |
| `ideate` / `next` / `brainstorm` / what should I add | Load [next.md](references/next.md) **only**. Rank one kind. Write no files. |
| New data source, API client, auth, scopes, WakaTime-class | `author-integration` |
| New card, widget, template, yaml option, animation, MD/MDX, stylesheets | `author-widget` on an existing pack unless they asked for a new pack |
| New pack / plugin id / catalog add | `author-plugin` |
| Action runtime, renderer internals, docs playground/generate, MCP, Marketplace, `plugin_*_*_*` | Refuse (NOT-for) |

Natural-language requests use the same table. Do not invent a mutating default.

### Empty args

When `$ARGUMENTS` is empty (or the user only asks how authoring works), show
this gallery and **stop**. Do not write files. Do not inventory. Do not load
[next.md](references/next.md).

0. **Ideate** — ask what to add next (`ideate` / `next` / `brainstorm`). Ranks
   one bit, integration, widget, or pack from live `FIRST_PARTY_*` plus
   on-disk holes. Does **not** run on empty args.
1. **Data source** → `author-integration` (client, auth, scopes, mocked HTTP)
   at `packages/integrations/src/<id>/`.
2. **Card** → `author-widget` on an existing pack (read `FIRST_PARTY_PLUGIN_IDS`).
3. **Pack** → `author-plugin` (`<id>Plugin`, derived integration union,
   pack-level `bitsUsed`, `docsPath: "{{DOCS_PATH}}"`).
4. Catalog: read `packages/core/src/types.ts`. Completing an existing id is
   allowed. Do not create a second pack. New ids need OpenSpec first.
5. Load [shared locks](references/locks.md) before any **mutating** handoff.
6. Public API → OpenSpec delta first. Then tell the user to run
   `just generate-action` and `just generate-docs` when those recipes exist.

## Critical rules

1. Empty `$ARGUMENTS` → gallery including ideate as item 0; stop; do not inventory; do not load `next.md`; do not write files.
2. `ideate` / `next` / `brainstorm` / “what should I add” → load `next.md` only; rank one kind + 1–2 runners-up; write no files; copy no templates.
3. Honor a **named kind** unless a lock fires (MCP, flatten, unauth GitHub, REST `/languages`, second pack for an existing id, invented Action input).
4. Catalog SSOT is `types.ts`. Completing an existing id is allowed. New id → OpenSpec. No second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`.
5. New data source → `author-integration` first, even if they also want a card. Dest `packages/integrations/src/<id>/`.
6. Never invent `plugin_*_*_*`. Read `ActionInputsSchema` (optional `wakatime_token`, `http_token_env`).
7. Do not write `packages/**` from this router. Hand off by skill name (`author-integration`, `author-widget`, `author-plugin`). Bit holes use `bit-checklist` (no `author-bit` skill).
8. Public API → OpenSpec first. Fail closed on stale codegen. Pack `bitsUsed` is pack-level on `<id>Plugin`. `docsPath` is `"{{DOCS_PATH}}"`.

## Before routing

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
| New API, client, token, scopes, cache keys, WakaTime / similar time-tracker | Data source | `author-integration` |
| New card, widget file (`widget.tsx` / `.md` / `.mdx` / `.html`), yaml option, bits, Takumi template, CSS `@keyframes`, gif/apng, Tailwind `tw`/`className`, `md.families` | Card | `author-widget` |
| New plugin id, pack registry, `docsPath`, derived integration union, expanding `FIRST_PARTY_PLUGIN_IDS` | Pack | `author-plugin` |
| New card **and** they asked for a new pack | Pack then card | `author-plugin`, then `author-widget` |
| New card on an existing pack id (including `rss` / `wakatime` / `http` / `github`) | Card on existing pack | `author-widget` only |
| MCP / `mcp.json` / flattened `plugin_*_*_*` | Refuse | Stop |

### Routing examples

| User intent | Route | Lock |
| --- | --- | --- |
| Add a WakaTime integration | `author-integration` | Complete existing `wakatime` id; no second pack |
| Add a languages option | `author-widget` | OpenSpec delta first (yaml schema); no flattened Action input |
| New pack using github + static | `author-plugin` | OpenSpec before expanding plugin ids |
| Widget with CSS animation for gif/apng | `author-widget` | `@keyframes` authoring; APNG `.png`; SVG still stays baked |
| Drop in `widget.mdx` with no `source` | `author-widget` | Prefer omit `source`; canonical `widget.mdx` |
| Tailwind stylesheets widget | `author-widget` | Takumi-safe `tw`/`className`; pack-level `bitsUsed` union |
| Swap `md.families.code` to starry-night | `author-widget` | Exclusive family swap; do not stack pretty-code + starry-night |
| What should I add next? | ideate | Load `next.md`; no files |
| Add a widget on rss | `author-widget` | Honor named kind even if another hole ranks higher |

## Handoff

After classifying:

1. Name the specialized skill and the kind (data source / card / pack / bit).
2. Repeat the relevant locks from [shared locks](references/locks.md) for
   mutating work. Ideate uses [next.md](references/next.md) instead.
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

## Refuse (NOT-for)

Do not use this skill to:

- Change Action runtime, thin `action.yml` behavior, or Marketplace inputs
- Edit Takumi renderer internals (`packages/renderer`)
- Build docs `/playground` or `/generate`
- Add MCP (`mcp.json`) or Marketplace flattened `plugin_<plugin>_<widget>_<option>` inputs
- Create a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`

Redirect those requests away. Do not route them to the specialized author
skills. Do not inventory a consolation add.

## Gotchas

- `FIRST_PARTY_PLUGIN_IDS` is live in `types.ts` (github, wakatime, rss, http).
  A new pack id is an OpenSpec + `packages/core/src/types.ts` change, not a
  silent catalog add. Completing an existing id is allowed.
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
- github **is** in `packages/integrations/src/index.ts`. A typed github pack
  hole is `packages/plugins/src/github/`. `packages/bits` may be absent.
- Empty args do not run ideate.

## Reference index

Do not load all at once.

| File | Load when |
| --- | --- |
| [locks.md](references/locks.md) | Mutating handoff (integration / widget / pack) |
| [next.md](references/next.md) | **Only** for `ideate` / `next` / `brainstorm` / “what should I add” |

## Proof

From the plugin root:

```bash
bash scripts/validate.sh
pnpm dlx skills-ref validate skills/author
```
