---
name: author
description: >-
  Routes profile-bits authoring across exactly six skills. Theme or Chip bit →
  author-bit; yaml theme or named palette → author-palette; data source →
  author-integration; card → author-widget; pack → author-plugin. Ideate ranks
  the next bit, palette, integration, widget, or pack and stops. Use for
  classify, ideate, next, brainstorm, or ambiguous theme/badge requests. This
  router never mutates.
license: MIT
compatibility: Requires the profile-bits repo; OpenSpec plugin-contract, widget-contract, integration-contract, and author-plugin specs; packages/core/src/types.ts.
metadata:
  author: profile-bits
  version: "0.1.0"
---

# Author router

Classify and hand off. This skill never writes files or copies templates.
A plugin is a pack of widgets plus declared integrations, not one card or API.

Exactly six skills ship: `author`, `author-bit`, `author-palette`,
`author-integration`, `author-widget`, and `author-plugin`.

## Empty args / help

Empty `$ARGUMENTS`, `help`, and “how do I author” sit above Before routing.
Show gallery items **0–5** and **stop**:

0. **Ideate** — rank a next add from live disk.
1. **Bit** — `author-bit` for `Theme`, `Chip`, or another shared bit.
2. **Palette** — `author-palette` for yaml theme, named flavors, and tokens.
3. **Data source** — `author-integration`.
4. **Card** — `author-widget` on an existing pack.
5. **Pack** — `author-plugin`.

Do not read `packages/core/src/types.ts`, OpenSpec, or references. Do not
inventory, rank, mutate, or copy templates.

## Dispatch

| Signal | Route |
| --- | --- |
| *(empty)* / `help` / how do I author | Gallery 0–5; skip Before routing; stop |
| `ideate` / `next` / `brainstorm` / what should I add | Load [next](references/next.md), rank, and stop |
| Named frozen bit, `Theme bit`, `Chip` in a card, `packages/bits` | `author-bit` |
| yaml `theme`, named palette/flavor, swatches, pair, theme tokens | `author-palette` |
| Bare `theme` with no destination | Gallery; do not guess |
| New API, client, auth, scopes, cache keys | `author-integration` |
| New card or widget on an existing pack | `author-widget` |
| New or complete plugin pack | `author-plugin` |
| Shields.io README `<img>` rows | sibling `.agents/profile-bits-readme` or `add-badges` |
| MCP, flatten, unauth GitHub, REST `/languages`, `openspec --json` | Refuse |

### Badge routing

- In-card `Chip` → `author-bit`.
- README Shields.io images → sibling README tooling.
- A pack that fetches badge data → OpenSpec, then `author-integration`,
  `author-plugin`, and `author-widget`.
- A proposed `Badge` primitive → `author-bit` after OpenSpec.

Never create `author-theme`, `author-badge`, or `author-chip`.

## Before routing

Skip this entire section for empty args/help.

For ideate, load only [next](references/next.md), re-read live disk, print the
ranked table, name the handoff skill, and **stop**.

For a mutating handoff:

1. Read `openspec/specs/plugin-contract/spec.md`,
   `openspec/specs/widget-contract/spec.md`,
   `openspec/specs/integration-contract/spec.md`,
   `openspec/specs/author-plugin/spec.md`, and
   `packages/core/src/types.ts`.
2. Load [shared locks](references/locks.md).
3. Classify bit vs palette vs integration vs widget vs pack.
4. Name the specialized skill. Do not implement from this router.

New data source routes to `author-integration` first even when a card is also
requested. A card stays on an existing pack unless the user explicitly asks
for a new pack.

## Theme split

| Intent | Destination | Route |
| --- | --- | --- |
| `Theme` UI primitive | `packages/bits/src/Theme.tsx` | `author-bit` |
| Root yaml `theme` / custom role map | live core config schema | `author-palette` |
| Named family/flavor/swatches | `packages/themes/src/families/<family>.ts` | `author-palette` |
| Ambiguous bare theme | none | gallery and stop |

## Catalog and public API

After empty args is ruled out, read live `packages/core/src/types.ts`:
`FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`,
`FIRST_PARTY_INTEGRATION_IDS`, `WIDGET_INTEGRATIONS`, `INTEGRATION_AUTH`, and
`ActionInputsSchema`.

Do not encode a closed pack-id table. Completing a live id is allowed. A new id
or public yaml shape requires OpenSpec first, then types, then skills. Never
invent flattened `plugin_<plugin>_<widget>_<option>` Action inputs.

## Ideate

Ideate never mutates. Re-read disk and rank:

- `kind=bit`, handoff `author-bit`
- `kind=palette`, handoff `author-palette`
- `kind=integration`, handoff `author-integration`
- `kind=widget`, handoff `author-widget`
- `kind=pack`, handoff `author-plugin`

Do not emit `kind=theme` or `kind=badge`. Print one top row and 1–2 runners-up,
then stop. Copy no templates and do not continue a mutating workflow.

## Refuse

Name the lock and stop:

- MCP or `mcp.json`
- flattened Action inputs
- unauthenticated GitHub; empty/blank token fails the Action
- REST `/languages`; use filter-then-cap and GraphQL `nodes(ids:)` batches
- `openspec --json`; JSON is a subcommand flag
- a second pack for a live first-party id
- parent-traversal destinations or templates
- local CLI/runtime work; use sibling `.agents/profile-bits-readme`

## Handoff

Name the kind, specialized skill, repo-root destination, and relevant locks.
The specialized skill owns any templates and writes. `author` always stops
without mutation.

## Reference index

| File | Load when |
| --- | --- |
| [locks](references/locks.md) | Mutating handoff only |
| [next](references/next.md) | Ideate/next/brainstorm only |

## Proof

```bash
pnpm dlx skills-ref@0.1.5 validate skills/author
```
