## Context

See `proposal.md` Why. File lock: `packages/core/src/types.ts` `FIRST_PARTY_*`
plus `WIDGET_INTEGRATIONS` / `INTEGRATION_AUTH` is W3-T-01 only. W2-A-03
already reserved `spotify_token` and `steam_token` on `ActionInputsSchema`.
W3-B-01 named bits (not enumerated in core). Pack pipelines (SP/LC/CH/ST/GR/WK/RS)
consume the enums and MUST NOT edit `types.ts`.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Vitest 4, Biome 2.5.
No `plugin_*_*_*`. Never unauthenticated GitHub. Never REST `/languages`.
Do not tag `v1` on `main`. Do not run `npx skills add`. Do not commit.
Finish `docs-full-catalog-playground` in place.

## Goals / Non-Goals

**Goals:**

- One OpenSpec change that names elbow packs, integrations, and reuse widgets.
- One `types.ts` append so pack agents do not seven-way edit catalog enums.
- Globally unique widget ids (`langs` vs github `languages`; `contributions`
  vs leetcode `heatmap`; chess `ratings`/`game` not `stats`).
- Yaml plugin/widget option maps so new ids are parseable without a second
  types.ts writer.

**Non-Goals:**

- Implementing clients, plugins, widgets, or bits.
- `author-integration add` in this node.
- Playground / catalog route expansion (docs stay four-pack until later nodes).
- Changing `ActionInputsSchema` token keys (already landed).
- Archiving this change from this node.

## Decisions

### 1. One catalog change, then pack OpenSpec may complete behavior

- **Choice:** Change id `elbow-catalog` names all Wave 3 catalog ids. Pack
  workstreams MAY add later OpenSpec for fetch/render behavior without minting
  new ids.
- **Why:** Facts: new ids are OpenSpec-first; each workstream is its own
  change; types.ts is a single-writer fan-in.
- **Alternative:** Seven pack OpenSpecs each append types.ts — rejected by
  plan.md W3-T-01.

### 2. Collision ids: `langs` and `contributions`

- **Choice:** WakaTime languages slice is `langs` because `languages` is
  github. GitHub contribution heatmap is `contributions` because `heatmap` is
  the leetcode widget from the elbow inventory table.
- **Why:** Widget ids are a global enum (`WIDGET_INTEGRATIONS` is
  `Record<WidgetId, …>`). Duplicate keys cannot bind two integrations.
- **Alternative:** Pack-prefixed ids (`github-heatmap`) — rejected; shipped
  ids are short and unprefixed (`stats`, `coding`, `chips`).

### 3. Chess pack vs chesscom/lichess integrations

- **Choice:** Plugin id `chess`. Integration ids `chesscom` and `lichess`.
  Widgets `ratings` and `game` map to both integrations.
- **Why:** Inventory: one pack, two hosts. Widget id `stats` is taken.
- **Alternative:** Two packs — rejected; adding a widget MUST NOT require a
  new plugin.

### 4. Option schemas live in this types.ts append

- **Choice:** Add yaml option objects (filename / animate, plus limit where
  the card is a list; `token_env` on spotify/steam; optional `user` on
  leetcode/chess/steam) and plugin keys on `PluginsConfigSchema`.
- **Why:** Pack agents MUST NOT edit `types.ts`. Without option maps, yaml
  cannot name the widgets.
- **Alternative:** Enums only — rejected; leaves a second types.ts writer.

### 5. Playground field groups stay the shipped eight

- **Choice:** `docs-fields.ts` / playground groups remain demo/stats/languages/
  repo/coding/feed/json/chips. New widget ids are a catalog superset, not a
  playground expansion in this node.
- **Why:** W1-D-01 owns docs-fields; POST `/api/preview` is not an embed API;
  four-pack playground honesty stays until later docs nodes.
- **Alternative:** Add playground groups for every new widget now — rejected;
  exclusive files and wave-1 docs lock.

## Risks / Trade-offs

- [Pack agents invent different widget ids] → Tests lock live `FIRST_PARTY_*`
  membership; OpenSpec names the collisions.
- [docs-fields groups !== all widget ids] → Tests treat playground groups as
  a subset of `FIRST_PARTY_WIDGET_IDS`.
- [Empty `plugins.spotify: {}` is widget-less until parse-config applies pack
  defaults] → Same as http; pack-default constants exist for later wiring.
- [llms.txt lists new packs from `PluginsConfigSchema`] → Schema-derived stub
  updates with the plugin keys.

## Migration Plan

Land unarchived. Targeted vitest on types + this change’s script test.
Rollback is revert of `openspec/changes/elbow-catalog/` and the types catalog
append. Do not edit `openspec/specs/**` until archive. Do not archive from
this node.

## Open Questions

None. Client id/secret stay named env. Steam `?key=` stays query-key.
LeetCode / chess stay auth `none`.
