## Why

Today’s github cache is leftover-shaped: `GET /users/{login}` drops
`name`, `bio`, `avatar_url`, and `created_at`; owner-repo pages drop
`html_url`, `description`, `language`, and `topics`; GraphQL language
nodes keep only `name` + size; contributions keep a scalar total.
Widgets should select from a typed dump of **already fetched**
REST/GraphQL JSON so later cards (top-repos, heatmap) can reuse the
same cache. Wave 2 extends live `client.ts`; it does not
`author-integration add github`.

## What Changes

- Cached github payload becomes the fetched REST/GraphQL JSON dump
  (user, owner repos, repo GET, language nodes, contributions calendar
  when capable). Widgets select fields. Include/limit/min_pct/exclude
  stay widget-side and MUST NOT drop fields at fetch.
- Keep language `color` / `id`. Paginate GraphQL `languages` after
  `first: 10`. Dump calendar weeks when `canContributions`.
- Extra authenticated endpoints MAY be added (pinned, public events).
  Probe stays capability-only. Missing scopes omit fields and MUST NOT
  invent `0`.
- Locks unchanged: Authorization on every GitHub request; empty /
  `""` / whitespace `github_token` `fail_job` before any request;
  **never** REST `/repos/{owner}/{repo}/languages`; filter forks and
  archived then cap **500**; GraphQL `nodes(ids:)` batches of 100.
- No flattened `plugin_<plugin>_<widget>_<option>` inputs. No
  Playwright in the Action. `POST /api/preview` stays layout preview,
  not a public embed API. Do not rewrite `docs-full-catalog-playground`.

## Capabilities

### New Capabilities

- (none — dump is a delta on the existing github integration, fetch
  policy, and widget contracts)

### Modified Capabilities

- `integration-contract`: github cached payload is the fetched
  REST/GraphQL JSON dump; widgets select; language nodes keep
  `color`/`id` and paginate after `first: 10`; calendar weeks dump
  when capable; extra authenticated endpoints optional; never REST
  `/languages`; cap 500; empty token `fail_job`.
- `github-api-fetch-policy`: GraphQL `nodes(ids:)` language pages
  include `color`/`id` and paginate after `first: 10`;
  `contributionsCollection` dumps calendar weeks iff capable.
- `widget-contract`: github widgets consume the dump and MUST NOT
  perform HTTP; extra dump keys MUST NOT fail parse; frozen option
  schemas stay.

## Impact

- Specs: MODIFIED/ADDED deltas under this change. After archive/sync
  those become the contract SSOT. Do not edit `openspec/specs/**` from
  this node. Finish `docs-full-catalog-playground` in place (do not
  mint a new docs id).
- Later apply (not this node): W2-G-02 payload types, W2-G-03 extra
  endpoints, W2-G-04 fixtures, W2-G-05 widget readers, W2-G-06 tests
  under `packages/integrations/src/github/**` and github widget
  folders. Hand-extend live `client.ts`. MUST NOT
  `author-integration add` github / wakatime / rss / http.
- Out of scope: new first-party pack/widget/integration ids, flattened
  Action inputs, tagging `v1` at `main`, unauthenticated GitHub,
  Playwright in the Action, `npx skills add`, git commit.
