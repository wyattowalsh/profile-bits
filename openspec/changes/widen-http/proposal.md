## Why

Wave 2 dumps the already-fetched HTTP JSON instead of a widget-shaped slice.
Json is already an `unknown` parse, but the integration contract still folds
JMESPath throws into the HTTP matrix, which reads as fetch-time filtering.
Chips GETs already use `auth: none`, but the contract still says those GETs
normalize to `{ label, message, color? }` and ignore `link` at fetch — dropping
`name`, `value`, and `link` from the cache. Widgets must read a complete dump.

## What Changes

- Json cache remains the **full parsed JSON value**. An optional schema MUST
  NOT drop keys. `jmespath` stays a widget reader (default `@`).
- Chips cache is raw badge JSON `{ label, message, color, name, value, link }`
  (keys present on the body). Fetch MUST NOT map `value` → `message` or drop
  `link`. `normalizeBadgeJson` (`message = message ?? value`) stays a widget
  reader. Render still uses `label` / `message` / `color`.
- Chips GETs stay `auth: none`, origins `shieldcn.dev` + `img.shields.io`,
  existing SSRF / 1 MiB / no octokit. No new vendor integration ids.
- Wave 2 extends live `packages/integrations/src/http/client.ts`. MUST NOT
  `author-integration add` github / wakatime / rss / http. MUST NOT flatten
  `plugin_<plugin>_<widget>_<option>`. MUST NOT rewrite
  `docs-full-catalog-playground`.

## Capabilities

### New Capabilities

- (none — dump policy on the existing http integration and json/chips widgets)

### Modified Capabilities

- `integration-contract`: json dump is full JSON; chips dump is raw badge
  JSON; chips GET `auth: none`; JMESPath is not a fetch filter.
- `widget-contract`: json `jmespath` is a widget reader; chips normalize is a
  widget reader; render still ignores `link`/`href` as chrome.

## Impact

- Specs: ADDED + MODIFIED deltas under this change. Do not edit
  `openspec/specs/**` until archive. Do not rewrite
  `docs-full-catalog-playground`, `oauth-refresh`, `query-key`, or
  `action-token-env`.
- Code (later nodes, not W2-HTTP-01): payload types, no extra vendor client,
  fixtures keep `link`/`value`, widget readers, dump tests. This node owns
  `openspec/changes/widen-http/**` plus `scripts/widen-http.test.ts` only.
- Out of scope: new first-party pack/widget/integration ids, Playwright in
  the Action, unauthenticated GitHub, REST `/languages`, tagging `v1` at
  `main`, `POST /api/preview` as an embed API, `npx skills add`, git commit.
