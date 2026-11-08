## 1. OpenSpec artifacts (W3-LC-01)

- [x] 1.1 Exclusive: `openspec/changes/leetcode/proposal.md`. GraphQL POST auth none, `solved`+`heatmap`, CF 403 `fail_widget`, HTML scrape SSRF fallback only. Do not rewrite `docs-full-catalog-playground`.
- [x] 1.2 Exclusive: `openspec/changes/leetcode/design.md`. Spec-only this node; W3-LC-02+ own dest `client.ts` / plugin / widgets. Pack agents MUST NOT edit `types.ts`.
- [x] 1.3 Exclusive: `specs/integration-contract/spec.md`. ADDED GraphQL POST dump, no Authorization, cache `(query, variables)`, CF 403 `fail_widget`, HTML scrape SSRF fallback, no community proxy, no Playwright.
- [x] 1.4 Exclusive: `specs/widget-contract/spec.md`. ADDED `solved`/`heatmap` select from the dump; Heatmap bit; extra keys MUST NOT fail parse; `POST /api/preview` is not an embed API.
- [x] 1.5 Exclusive: `specs/plugin-contract/spec.md`. ADDED pack default `solved`; `heatmap` opt-in; no `plugin_leetcode` bool; no flatten.
- [x] 1.6 Exclusive: `specs/author-plugin/spec.md`. ADDED Wave 3 MAY `author-integration add leetcode` when dest `client.ts` is absent (scheme `none`); live dests still stop; Wave 2 MUST NOT add github/wakatime/rss/http.
- [x] 1.7 `pnpm exec openspec validate --strict --type change leetcode`. Do not archive. Do not edit `openspec/specs/**`.

## 2. Tests (W3-LC-01)

- [x] 2.1 Exclusive: `scripts/leetcode.test.ts`. Assert GraphQL POST, auth none, no Authorization, dump fields, 403 `fail_widget` not `fail_job`, HTML scrape SSRF fallback, no Playwright, no community proxy, no flatten, no live dest add, `docs-full-catalog-playground` stays in place.

## 3. Later apply — integration client (W3-LC-02)

- [x] 3.1 Exclusive: `author-integration add leetcode` only because dest `client.ts` is absent. Copy `auth.none.ts.template`. GraphQL POST. No Authorization. Do not edit `types.ts`. Do not add github/wakatime/rss/http.

## 4. Later apply — plugin (W3-LC-03)

- [x] 4.1 Exclusive: `packages/plugins/src/leetcode/plugin.ts`. Pack binds integration `leetcode` only. Default widget `solved`. `heatmap` opt-in. No `plugin_leetcode` bool.

## 5. Later apply — widgets (W3-LC-04)

- [x] 5.1 Exclusive: widgets `solved` and `heatmap` select from the dump; no HTTP in widgets. Heatmap bit for solved days. Extra dump keys MUST NOT fail parse.

## 6. Later apply — dump tests (W3-LC-05)

- [x] 6.1 Mocked GraphQL fixture maps the full payload. 403 → `fail_widget` not `fail_job`. No Authorization header. HTML scrape only through SSRF fallback. Do not commit. Do not tag `v1` at `main`.
