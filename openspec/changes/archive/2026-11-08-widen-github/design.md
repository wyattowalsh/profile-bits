## Context

See `proposal.md` Why. Live github types in
`packages/integrations/src/github/{rest,graphql,client}.ts` keep a
widget leftover: `GithubRestUser` omits `name`/`bio`/`avatar_url`/
`created_at`; `GithubOwnerRepository` omits `html_url`/`description`/
`language`/`topics`; `LANGUAGES_NODES_QUERY` requests `node { name }`
only with `first: 10` and no pagination; `CONTRIBUTIONS_QUERY` stores
`totalContributions` as a number. File lock: this workstream owns
`packages/integrations/src/github/**` as a pipeline. **W2-G-01 is
spec-only** (`openspec/changes/widen-github/**` plus exclusive tests).
W2-G-02 owns payload types; W2-G-03 extra endpoints; W2-G-04 fixtures;
W2-G-05 widget readers; W2-G-06 dump tests.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Vitest 4, Biome
2.5. Never unauthenticated GitHub. Never REST `/languages`. Cap 500
after filter forks/archived. GraphQL `nodes(ids:)` batches of 100. No
`plugin_*_*_*`. No Playwright in the Action. Do not run
`npx skills add`. Do not tag `v1` on `main`. Do not
`author-integration add` github / wakatime / rss / http. Finish
`docs-full-catalog-playground` in place.

## Goals / Non-Goals

**Goals:**

- Land an OpenSpec-first dump contract so later G-02…G-06 can
  hand-extend live `client.ts` without a leftover schema.
- Keep fetch locks (Authorization, empty token `fail_job`, never REST
  `/languages`, filter-then-cap 500, `nodes(ids:)` batches of 100).
- Put include/limit/min_pct/exclude on widgets.

**Non-Goals:**

- Editing `packages/integrations/src/github/**` in this node (W2-G-02+).
- Editing github widget templates in this node (W2-G-05).
- New first-party pack/widget/integration ids (heatmap / top-repos
  stay wave 3).
- `ActionInputsSchema` flatten or extra pack bools.
- Rewriting `docs-full-catalog-playground` or `marketplace-release`.
- Archiving this change from this node.

## Decisions

### 1. Change id is `widen-github`, not a new docs id

- **Choice:** One OpenSpec change per workstream. Spec deltas live
  under `openspec/changes/widen-github/`. Main `openspec/specs/**`
  stay untouched until archive.
- **Why:** Facts: new ids are OpenSpec-first; leftover docs change
  finishes in place. Sibling dumps (`widen-wakatime`, `widen-rss`,
  `widen-http`) MUST NOT share this id.
- **Alternative:** Fold into `docs-full-catalog-playground` —
  rejected; that change is playground/catalog, already complete.
  Alternative: new capability `github-dump` — rejected; dump is the
  existing github integration payload, not a fourth contract layer.

### 2. Dump already-fetched JSON; extra endpoints are optional later

- **Choice:** G-01 requires keeping fields already returned by
  `GET /users/{login}`, owner-repo pages, repo GET, language nodes,
  and contributions calendar. Pinned items and public events are
  optional extra authenticated endpoints (W2-G-03).
- **Why:** Plan: “typed dump of **already fetched** REST/GraphQL
  JSON”; extra endpoints MAY be added. Probe stays capability-only.
- **Alternative:** Fetch every GitHub REST catalog endpoint now —
  rejected; would explode rate limit and invent HTTP widgets do not
  need. Alternative: keep leftover parse until heatmap — rejected;
  wave 3 reuse widgets depend on this dump.

### 3. Language pagination is follow-up GraphQL, not REST /languages

- **Choice:** First page remains `nodes(ids:)` batches of 100 with
  `languages(first: 10, …)` including `color`/`id` and `pageInfo`.
  Further pages use GraphQL `after` on repos that still have
  `hasNextPage`. Never REST `/languages`. Never replace the batched
  first page with 500 per-repo queries.
- **Why:** Current spec freezes `first: 10` without `pageInfo`. Plan
  says paginate after `first: 10` and keep `color`/`id`. A repository
  can have more than 10 languages; leftover `first: 10` is a silent
  truncation.
- **Alternative:** Raise `first` to 100 and skip pagination —
  rejected; plan names pagination after `first: 10`. Alternative:
  REST `/languages` for overflow — forbidden lock.

### 4. Calendar weeks dump iff `canContributions`

- **Choice:** Same capability gate. Dump
  `contributionCalendar.totalContributions` plus `weeks` /
  `contributionDays` (`date`, `contributionCount`, `weekday`). Omit
  (do not invent `0`) when the query is skipped.
- **Why:** Heatmap (W3-GR-02) needs weeks from this cache. Cost is
  no longer assumed 1-point; `rateLimit.cost` logging stays.
- **Alternative:** Keep scalar total only — rejected; leftover
  blocks heatmap. Alternative: always query contributions —
  rejected; capability gate and never invent `0`.

### 5. Same-file exclusive with later G nodes

- **Choice:** This node writes only `openspec/changes/widen-github/**`
  plus `scripts/widen-github.test.ts`. It MUST NOT edit live github
  client files, widget readers, `openspec/specs/**`, or
  `docs-full-catalog-playground`.
- **Why:** Pipeline lock. One implementer per node including tests.
- **Alternative:** Promote types in this node — rejected; that is
  W2-G-02.

## Risks / Trade-offs

- [Language follow-up pages add GraphQL calls] → First page stays
  batched `nodes(ids:)`. Follow-up MAY target only ids with
  `hasNextPage`. Still never REST `/languages`.
- [Calendar weeks increase `rateLimit.cost`] → Still gated on
  `canContributions`; log cost; omit when incapable.
- [Widgets that parse leftover shapes] → Extra keys MUST NOT fail
  parse; G-05 readers stay selectors. Frozen option schemas stay.
- [Sibling dump writers] → This change MUST NOT edit wakatime/rss/http
  clients or their OpenSpec ids.

## Migration Plan

- Spec-only until W2-G-02 promotes parsed cache into the typed model.
- Archive after G-02…G-06 apply. Do not archive from this node.
- Rollback is deleting this in-flight change; main specs are
  untouched until archive.

## Open Questions

- (none — extra endpoint list is optional and owned by W2-G-03;
  heatmap / top-repos widget ids stay wave 3)
