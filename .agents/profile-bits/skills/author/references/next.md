# Ideate (next add)

Load this file **only** for `ideate` / `next` / `brainstorm` / “what should I add”.
Do not load it for empty-args gallery, named-kind routing, or mutating handoff.

Ideate is a **mode of `author`**, not a fifth skill. Write **no files**. Do not
copy templates. Do not edit `packages/**`, `apps/**`, `openspec/**`, or
`action.yml` from this mode.

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

## Terms

| Term | Values |
| --- | --- |
| `kind` | `bit` \| `integration` \| `widget` \| `pack` |
| `handoff` | `author-integration` \| `author-widget` \| `author-plugin` \| `bit-checklist` |

Output one ranked next add, then 1–2 runners-up. Stop.

## Two modes (do not mix)

### Named kind

The user named the kind (“add a widget”, “scaffold a wakatime client”, “new
pack”). Honor that kind unless a **lock** fires:

- MCP / `mcp.json`
- Flattened `plugin_<plugin>_<widget>_<option>` Action inputs
- Unauthenticated GitHub (empty / `""` / whitespace token)
- REST `/languages`
- Second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`
- Invented Action input name (not in `ActionInputsSchema`)

If a lock fires: refuse, name the lock, do not inventory a substitute kind as
if they asked “what next”.

Example: “add a widget on rss” → `author-widget` on the existing `rss` pack
even when another typed hole (for example a missing github pack dir) ranks
higher for unprompted ideate.

### Unprompted next

The user said `ideate` / `next` / `brainstorm` / “what should I add” with no
named kind. Inventory, then rank. Do **not** always pick an empty
`packages/bits` tree first.

Empty `$ARGUMENTS` is **not** this mode. Empty args show the gallery
(including ideate as item 0) and **stop** without inventory.

## Inventory (read-only, in order)

Re-read live disk every run. Examples below are **illustrative**, not a frozen
catalog.

1. **types.ts registries** — `FIRST_PARTY_PLUGIN_IDS`,
   `FIRST_PARTY_WIDGET_IDS`, `FIRST_PARTY_INTEGRATION_IDS`,
   `WIDGET_INTEGRATIONS`, `INTEGRATION_AUTH`, `ActionInputsSchema`.
2. **Dirs**
   - `packages/integrations/src/<id>/` for each integration id, and whether
     `packages/integrations/src/index.ts` re-exports that client. **Do not**
     omit `src/` under `packages/integrations/`.
   - `packages/plugins/src/<pack>/plugin.ts` plus `widgets/<id>/` for each
     pack id. Note whether the pack exports `<pack>Plugin` with pack-level
     `bitsUsed` (`PluginIdentity & { bitsUsed }` — core `PluginIdentitySchema`
     has **no** `bitsUsed`; do not edit `packages/core` from this mode).
   - `packages/bits` source tree (the frozen 11 names).
3. **Specs** — `plugin-contract`, `widget-contract`, `integration-contract`,
   `author-plugin` under `openspec/specs/`.
4. **Hole classes**
   - Typed id, files missing
   - Files present, barrel missing
   - Pack present, pack-level `bitsUsed` missing
   - Empty / absent bits tree

Mention Action/docs wiring gaps for implemented widgets only as **out of
scope**. Do not write `packages/**` or `apps/docs/**` from this plugin.

## Unprompted rank (one next, then 1–2 runners-up)

1. **Typed id with missing implementation** — pack id in
   `FIRST_PARTY_PLUGIN_IDS` but no `packages/plugins/src/<pack>/` /
   `<pack>Plugin` / declared widgets. Handoff: `author-plugin` then
   `author-widget` to complete that pack. Do not write `packages/**` from this
   plugin change.
2. **Frozen 11 bits with no `packages/bits` package** — names: `Theme`,
   `Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`,
   `Divider`. `kind=bit`, `handoff=bit-checklist`. OpenSpec only for a **12th**
   name. `Avatar` stays in the 11 even when unused by live pack `bitsUsed`
   arrays.
3. **User wants a card whose API has no integration** — `author-integration`
   first (`kind=integration`).
4. **New card fits an existing pack** — `author-widget` (`kind=widget`).
5. **1..N widgets + integrations fit no existing pack** — `author-plugin`
   (`kind=pack`). OpenSpec if the id is not in `FIRST_PARTY_PLUGIN_IDS`.

Do **not** rank “add github to the integrations barrel” when
`packages/integrations/src/index.ts` already re-exports `./github/client.js`
(and graphql). Completing github as a **pack** is a plugins-tree hole, not a
barrel hole.

Do **not** create a second pack for `github`, `wakatime`, `rss`, or `http`
while those ids remain in `FIRST_PARTY_PLUGIN_IDS`. Prefer complete the
existing pack or integration.

## Output table

Print one table. Do not write files. Do not copy templates.

| Column | Content |
| --- | --- |
| `kind` | `bit` \| `integration` \| `widget` \| `pack` |
| `why` | Evidence from types.ts and on-disk dirs (quote paths) |
| `target` | Repo-root path (for example `packages/plugins/src/github/`) |
| `openspec` | `yes` + capability name, or `no` |
| `handoff` | `author-integration` \| `author-widget` \| `author-plugin` \| `bit-checklist` |

Lead with the single next row. Then 1–2 runners-up. Name locks that were
checked and did not fire.

## Bit checklist (`handoff=bit-checklist`)

When the ranked kind is `bit`:

1. The frozen 11 names belong under `packages/bits` (`Theme`, `Frame`,
   `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`,
   `Divider`).
2. OpenSpec **first** only if adding a 12th name. Completing the 11 does not
   invent a new bit id in this plugin.
3. **Stop.** This plugin has no `author-bit` skill. Do not scaffold a fifth
   skill directory. Do not copy widget or pack templates into `packages/bits`.
4. `PluginIdentitySchema` has no `bitsUsed`. Live packs attach
   `bitsUsed` on `<id>Plugin`. Do not add `widget-bits.ts` in core.

## Illustrative snapshot (re-inventory; not permanent)

At authoring time the spawn inventory used these as **examples** of how
ranking works. Always re-read disk; do not treat this block as SSOT.

| Hole | Evidence | Rank | Handoff |
| --- | --- | --- | --- |
| Typed `github` pack missing | `FIRST_PARTY_PLUGIN_IDS` includes `github`; no `packages/plugins/src/github/` / `githubPlugin` / demo\|stats\|languages widgets | Highest unprompted | `author-plugin` then `author-widget` |
| Frozen 11 bits, no package | `packages/bits` **does not exist** (not an empty dir) | Runner-up unless a typed-id hole ranks higher | `bit-checklist` |
| Github integration barrel | `packages/integrations/src/index.ts` **does** re-export github | Do **not** rank “add github to the barrel” | — |

`packages/bits` in that snapshot is absent, not empty. A later clone that
already has `packages/bits` or `packages/plugins/src/github/` must **not**
keep recommending those holes.

WakaTime / rss / http widgets that exist on disk but are unwired through
Action or docs may be **mentioned**; they are out of scope for this plugin
(no `packages/**` / `apps/docs/**` writes).

## Worked unprompted example

1. Read `FIRST_PARTY_PLUGIN_IDS` → `github`, `wakatime`, `rss`, `http`.
2. Stat `packages/plugins/src/github/` → missing (illustrative) → typed-id
   hole.
3. Stat `packages/integrations/src/index.ts` → github client already
   exported → not a barrel hole.
4. Stat `packages/bits` → absent (illustrative) → bit runner-up.
5. Rank: **pack** `github` at `packages/plugins/src/github/`, `openspec=no`
   (id already in types), `handoff=author-plugin` then `author-widget`.
6. Runners-up: bit-checklist for the 11 names; then any card whose API is
   missing an integration.

## Worked named-kind example

User: “add a widget on rss”.

- Named kind = widget. Honor it.
- `rss` is already in `FIRST_PARTY_PLUGIN_IDS`. Completing a card on that
  pack is `author-widget`.
- Do not redirect to “complete github pack first” even if that typed hole
  exists.
- `openspec`: yes if the widget id is new to `FIRST_PARTY_WIDGET_IDS`; no if
  completing `feed` already in the list.

## Worked refuse examples

| Ask | Result |
| --- | --- |
| “Add an MCP server” | Refuse. No `mcp.json`. No inventory. |
| `plugin_github_stats_include` | Refuse flatten. Thin Action only. |
| “Second wakatime pack” | Refuse. Id already in `FIRST_PARTY_PLUGIN_IDS`. Complete the existing pack or integration. |
| REST `/languages` | Refuse. Filter-then-cap + GraphQL `nodes(ids:)` batches of 100. |
| Empty token GitHub | Refuse. Empty / `""` / whitespace fails the Action. |

## What this mode does not do

- Does not run on empty args (gallery includes ideate as item 0 and stops).
- Does not write files or copy templates.
- Does not add `mcp.json`, Marketplace flattened inputs, or extra first-party
  ids without OpenSpec.
- Does not edit `packages/core` to put `bitsUsed` on `PluginIdentitySchema`.
- Does not create `author-bit`.
- Dest for new or completed integrations is `packages/integrations/src/<id>/`.
  Never omit `src/` under `packages/integrations/`.
- Does not hardcode `docsPath` to `/generate/<id>/`. Packs use
  `docsPath: "{{DOCS_PATH}}"`.
- Does not claim github is missing from the integrations barrel.

After printing the table, name the specialized skill for the top row and
**stop**. Mutating work happens in that skill, not here.
