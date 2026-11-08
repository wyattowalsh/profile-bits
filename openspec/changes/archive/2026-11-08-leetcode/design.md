## Context

See `proposal.md` Why. Catalog ids `leetcode`, `solved`, and `heatmap` already
live in `elbow-catalog` and `packages/core/src/types.ts` (`INTEGRATION_AUTH.leetcode`
is `none`; pack default is `solved`). Dest
`packages/integrations/src/leetcode/client.ts` is absent. File lock: this
workstream owns `openspec/changes/leetcode/**` then later
`packages/integrations/src/leetcode/**` and `packages/plugins/src/leetcode/**`
as a pipeline. **W3-LC-01 is spec-only** (`openspec/changes/leetcode/**` plus
exclusive tests). W3-LC-02 owns `author-integration add leetcode`. W3-LC-03
plugin. W3-LC-04 widgets. W3-LC-05 mocked GraphQL fixture tests.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Vitest 4, Biome 2.5.
Auth none. Never unauthenticated GitHub. Never REST `/languages`. No
`plugin_*_*_*`. No Playwright in the Action. Do not run `npx skills add`.
Do not tag `v1` on `main`. Pack agents MUST NOT edit
`packages/core/src/types.ts`. Finish `docs-full-catalog-playground` in
place. Wave 2 MUST NOT `author-integration add` github / wakatime / rss /
http. Heatmap bit already exists under `packages/bits`.

## Goals / Non-Goals

**Goals:**

- Land an OpenSpec-first fetch/render contract so later LC-02…05 can
  `author-integration add leetcode` without inventing catalog ids.
- GraphQL POST auth none; complete dump of profile, contest ranking,
  submission calendar, recent AC; widgets select.
- CF 403 → `fail_widget` (not `fail_job`); HTML scrape only through
  existing SSRF as a documented fallback.

**Non-Goals:**

- Editing `packages/integrations/src/leetcode/**` in this node (W3-LC-02).
- Editing `packages/plugins/src/leetcode/**` in this node (W3-LC-03/04).
- Editing `packages/core/src/types.ts` (W3-T-01 / `elbow-catalog`).
- Minting new first-party pack/widget/integration ids.
- Rewriting `docs-full-catalog-playground`, `elbow-catalog`, or
  `readme-card-bits`.
- Playwright, community proxies, `leetcode.cn`, or a `leetcode_token`.
- Archiving this change from this node.

## Decisions

### 1. Change id is `leetcode`, not a new docs id

- **Choice:** One OpenSpec change per workstream. Spec deltas live under
  `openspec/changes/leetcode/`. Main `openspec/specs/**` stay untouched
  until archive. Catalog ids stay in `elbow-catalog`.
- **Why:** Facts: each workstream is its own OpenSpec change; leftover
  docs change finishes in place; pack workstreams MAY add later OpenSpec
  for fetch/render without minting new ids.
- **Alternative:** Fold into `elbow-catalog` — rejected; that change is
  catalog ids / types.ts fan-in (W3-T-01). Alternative: rewrite
  `docs-full-catalog-playground` — forbidden.

### 2. GraphQL POST is primary; HTML scrape is SSRF fallback only

- **Choice:** Always `POST https://leetcode.com/graphql` first. HTML GET
  of the public profile through `packages/integrations/src/html-scrape/`
  MAY run only after HTTP 403 / Cloudflare. Map scrape fields into the
  same typed dump. No Playwright. No community proxy.
- **Why:** Inventory: POST GraphQL (HTML fallback if blocked). html-scrape
  already owns SSRF / 1 MiB / login-wall refuse. Community proxies
  (third-party LeetCode APIs) are hostile to Action supply chain.
- **Alternative:** Scrape-first — rejected; GraphQL is the typed dump
  source. Alternative: call `alfa-leetcode-api` — rejected; no community
  proxy.

### 3. Cloudflare 403 is fail_widget, not fail_job

- **Choice:** GraphQL 403 / CF challenge `fail_widget`. Other enabled
  widgets in the same run still render and the Action may still commit.
  Do not reuse GitHub secondary/abuse `fail_after_backoff`. Unknown user
  (404 / null `matchedUser`) is also `fail_widget`. Missing username with
  pack on is `fail_widget` (auth none — not GitHub empty-token `fail_job`).
- **Why:** Plan risk: GitHub Actions `ubuntu-latest` IPs hit Cloudflare
  403. Failing the job would drop github/wakatime/rss/http cards too.
- **Alternative:** `fail_job` on 403 — rejected; one blocked pack must
  not abort the README. Alternative: retry-as-GitHub-403 — rejected;
  CF will not recover like a GitHub secondary rate limit.

### 4. Dump the four public operations completely

- **Choice:** Cache complete GraphQL JSON from public profile, contest
  ranking, submission calendar, and recent AC. Widgets `solved` and
  `heatmap` select. Extra keys MUST NOT fail parse. Do not invent `0`.
- **Why:** leetcode.md Data: dump those four. Facts: widgets only read
  the cache; include/limit stay widget-side.
- **Alternative:** Fetch only `acSubmissionNum` leftover — rejected;
  heatmap needs `submissionCalendar` and later cards need the dump.

### 5. Same-file exclusive with later LC nodes

- **Choice:** This node writes only `openspec/changes/leetcode/**` plus
  `scripts/leetcode.test.ts`. It MUST NOT edit live integration clients,
  plugins, widgets, `openspec/specs/**`, or `types.ts`.
- **Why:** Pipeline lock. One implementer per node including tests.
  Wave 3 `author-integration add` only when dest `client.ts` is absent.
- **Alternative:** Scaffold `client.ts` in this node — rejected; that is
  W3-LC-02. Alternative: seven-way types.ts append — rejected; W3-T-01.

### 6. Scheme is `none`; heatmap bit already exists

- **Choice:** `{{scheme}}` `none` copies `auth.none.ts.template`. Widget
  `heatmap` uses existing `Heatmap` (not `Board`, not github
  `contributions`). Widget `solved` uses Frozen 11 `Stat`.
- **Why:** Catalog auth is `none`. W3-B already named and landed Heatmap.
  Widget id `heatmap` is leetcode (elbow-catalog collision rule).
- **Alternative:** New auth scheme — rejected; no token. Alternative:
  github contributions widget id `heatmap` — rejected; already bound to
  leetcode.

## Risks / Trade-offs

- [ubuntu-latest CF 403 is common] → `fail_widget`; fixtures default in
  docs; HTML scrape MAY run through SSRF after the 403; never fail the job.
- [HTML fallback also CF-blocked] → still `fail_widget`; do not add a
  community proxy.
- [html-scrape treats 403 as login wall] → GraphQL 403 is classified in
  the leetcode client; scrape fallback uses html-scrape refuse as-is.
- [Sibling pack writers] → This change MUST NOT edit spotify / chess /
  steam dests or `types.ts`.
- [GraphQL URL is fixed] → Username stays in variables; HTML path uses
  `encodeURIComponent`; SSRF still wraps the fallback GET.

## Migration Plan

- Spec-only until W3-LC-02 copies templates into
  `packages/integrations/src/leetcode/` because dest `client.ts` is absent.
- Archive after LC-02…05 apply. Do not archive from this node.
- Rollback is deleting this in-flight change; main specs and `types.ts`
  are untouched by this node.

## Open Questions

None. `leetcode.cn` stays out of scope. Client credentials do not apply
(auth none). Heatmap bit is already on disk.
