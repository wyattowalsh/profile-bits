## Context

See `proposal.md` Why. Catalog id `top-repos` already lives in
`packages/core/src/types.ts` (`FIRST_PARTY_WIDGET_IDS`,
`WIDGET_INTEGRATIONS["top-repos"] = ["github"]`, `TopReposOptionsSchema`,
opt-in `GithubWidgetsConfigSchema` key). W3-T-01 owns that file. This
node owns the github pack pipeline for the card: `plugin.ts`,
`widgets/top-repos/`, pack preview, barrel, `packages/plugins/AGENTS.md`,
and this OpenSpec change.

The widened github dump already includes owner-crawl repositories
(`stargazersCount`, `forksCount`, `name`, `fullName`). Widgets select.
Wave 2 did not `author-integration add github`.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Vitest 4, Biome 2.5.
No `plugin_*_*_*`. Never unauthenticated GitHub. Never REST
`/languages`. Cap 500 after filter forks/archived (fetch-side). No
Playwright in the Action. Do not run `npx skills add`. Do not tag `v1`
on `main`. Finish `docs-full-catalog-playground` in place.

## Goals / Non-Goals

**Goals:**

- OpenSpec-first frozen options + dump ranking for existing id
  `top-repos`.
- Register the card on pack `github` (opt-in; pack defaults unchanged).
- Consume `dumpRepositories`; rank stars → forks → name; apply `limit`
  widget-side; no HTTP.
- Primer 480×160 List card. Empty → “No repositories”.

**Non-Goals:**

- Editing `packages/core/src/types.ts` or `docs-fields.ts`.
- Widget id `contributions` (W3-GR-02).
- Action `engine.ts` / `render-github.ts` dispatch (not exclusive to
  this node; rank-3 pack agents must not seven-way edit engine).
- Playground groups beyond the shipped eight.
- `author-integration add` github / wakatime / rss / http.
- Flattened Action inputs or extra pack bools.

## Decisions

### 1. Complete the typed id; do not append the enum

- **Choice:** Implement widget `top-repos` on pack `github`. Leave
  `FIRST_PARTY_WIDGET_IDS` alone.
- **Why:** Completing an id already in types does not append the enum.
  Pack agents MUST NOT edit `types.ts`.
- **Alternative:** Mint a second widget id — rejected; elbow-catalog
  already named `top-repos`.

### 2. Rank the owner crawl in the widget

- **Choice:** Sort dump `repositories` by `stargazersCount` descending,
  then `forksCount` descending, then title. Slice to yaml `limit`
  (default 8, max 16).
- **Why:** Facts: top-repos from owner crawl; stars/forks already
  fetched; include/limit stay widget-side.
- **Alternative:** New GitHub HTTP (search, GraphQL top repos) —
  rejected; widgets MUST NOT perform HTTP.

### 3. List bit, not a second repo card

- **Choice:** Compose Theme / Frame / Stack / Text / Muted / List.
  Show name plus a stars meta string.
- **Why:** W3-B-01 approved List. A single-repo REST card already exists
  (`repo`).
- **Alternative:** One Chip/Stat row per repo — rejected; density is a
  ranked list.

### 4. Empty copy is “No repositories”

- **Choice:** Distinct from widget `repo` (“No repo data”).
- **Why:** This card is a list over the owner crawl, not one
  `owner/name` GET.

### 5. Exclusive files stay on the github pack

- **Choice:** This node writes OpenSpec + `packages/plugins/src/github/**`
  for `top-repos` + barrel/AGENTS closeout. It does not write
  `types.ts`, `docs-fields.ts`, Action engine, or playground routes.
- **Why:** Same-file exclusive; W3-GR-02 also sits on the github pack
  and must not dual-write `contributions` from this node.

## Risks / Trade-offs

- [Action yaml parses `top-repos` but engine does not dispatch yet] →
  Engine is a shared rank-3 file; pack agents must not seven-way edit
  it. Render helper `renderTopReposSvg` is the card API until a later
  fan-in.
- [Playground groups stay the shipped eight] → W1-D-01 lock; catalog id
  is a superset.
- [Shared `plugin.ts` with W3-GR-02] → This node appends `top-repos`
  only; it MUST NOT register `contributions`.

## Migration Plan

Land unarchived. Targeted vitest on the github pack + this change’s
script test. Rollback is revert of `openspec/changes/github-top-repos/`
and the `top-repos` widget files. Do not edit `openspec/specs/**` until
archive. Do not archive from this node.

## Open Questions

None. Ranking is stars, then forks, then name. Integration is `github`
only.
