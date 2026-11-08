## Why

Wave 3 elbow pack `leetcode` is already a catalog id (`elbow-catalog` / W3-T-01)
with widgets `solved` and `heatmap`, but there is no fetch contract: dest
`client.ts` is absent. GitHub Actions IPs often hit Cloudflare 403 on
`leetcode.com`. This change names GraphQL POST (auth none) as the dump
source, maps CF 403 to `fail_widget` (not `fail_job`), and allows HTML
scrape only as an SSRF fallback. Pack agents then complete the existing id
without minting new catalog names.

## What Changes

- Primary fetch is `POST https://leetcode.com/graphql` with JSON
  `{ query, variables }`. Catalog auth is `none`. Requests MUST NOT send
  `Authorization` (not Bearer, not Basic, not `{ Authorization: "" }`).
- Cached typed payload is the complete public GraphQL dump: profile,
  contest ranking, submission calendar, recent AC. Widgets select fields.
- HTTP 403 / Cloudflare challenge on that POST is `fail_widget`, not
  `fail_job` and not GitHub `fail_after_backoff`.
- HTML scrape of the public profile is allowed only as a fallback after
  GraphQL is blocked, and only through the existing html-scrape SSRF
  gates. No Playwright. No community proxy.
- Widgets `solved` and `heatmap` consume the dump and MUST NOT perform
  HTTP. `heatmap` uses the Heatmap bit. Pack default remains `solved`;
  `heatmap` is opt-in. Widget id `heatmap` stays leetcode (github
  contribution heatmap stays `contributions`).
- Wave 3 MAY `author-integration add leetcode` only when dest `client.ts`
  is absent (`{{scheme}}` `none`). Wave 2 MUST NOT add github / wakatime /
  rss / http. Pack agents MUST NOT edit `packages/core/src/types.ts`.
- No `leetcode_token`. No `plugin_leetcode` bool. No
  `plugin_<plugin>_<widget>_<option>` inputs. Do not rewrite
  `docs-full-catalog-playground`.

## Capabilities

### New Capabilities

- (none — leetcode is a complete-existing catalog id; fetch/render is a
  delta on the existing integration, widget, plugin, and author contracts)

### Modified Capabilities

- `integration-contract`: ADDED leetcode GraphQL POST dump, auth none,
  GraphQL cache `(query, variables)`, CF 403 → `fail_widget`, HTML scrape
  SSRF fallback only, no community proxy, no Playwright in the Action.
- `widget-contract`: ADDED `solved` and `heatmap` select from the cached
  dump; Heatmap bit for the calendar; extra dump keys MUST NOT fail parse;
  `POST /api/preview` is not an embed API.
- `plugin-contract`: ADDED pack `leetcode` binds integration `leetcode`
  only; default widget `solved`; `heatmap` opt-in; no extra pack bools.
- `author-plugin`: ADDED Wave 3 MAY `author-integration add leetcode` when
  dest `client.ts` is absent (scheme `none`); live dests still stop; pack
  agents MUST NOT edit `types.ts`; Wave 2 MUST NOT add github / wakatime /
  rss / http.

## Impact

- Specs: ADDED deltas under this change. Do not edit `openspec/specs/**`
  until archive. Finish `docs-full-catalog-playground` in place (do not
  rewrite that change id). Do not rewrite `elbow-catalog` catalog ids.
- Code (this node): `openspec/changes/leetcode/**` plus exclusive tests
  in `scripts/leetcode.test.ts`. MUST NOT write
  `packages/integrations/src/leetcode/**`, plugins, widgets, or
  `packages/core/src/types.ts` from this node.
- Later apply (not this node): W3-LC-02 `author-integration add leetcode`
  (dest `client.ts` absent); W3-LC-03 plugin; W3-LC-04 widgets
  `solved`/`heatmap`; W3-LC-05 mocked GraphQL fixture tests.
- Out of scope: Playwright in the Action, community GraphQL proxies,
  tagging `v1` at `main`, unauthenticated GitHub, REST `/languages`,
  `npx skills add`, git commit, `plugin_*_*_*` inputs.
