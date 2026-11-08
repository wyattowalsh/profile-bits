## 1. OpenSpec artifacts

- [x] 1.1 Exclusive: `openspec/changes/rss-latest/proposal.md`. Complete existing widget id `latest` on pack `rss` with Time bit. Finish `docs-full-catalog-playground` in place (do not rewrite that change). No flatten. No `author-integration add` for github/wakatime/rss/http. Do not edit `types.ts`.
- [x] 1.2 Exclusive: `openspec/changes/rss-latest/design.md`. Dump reader + recency sort + shared `RssClient`; exclusive files `packages/plugins/src/rss/**`.
- [x] 1.3 Exclusive: `openspec/changes/rss-latest/specs/widget-contract/spec.md`. ADDED frozen latest widget: Time bit, `updated` then `published_at`, limit 1–8 default 1, “No latest item”, no HTTP.
- [x] 1.4 Exclusive: `openspec/changes/rss-latest/specs/plugin-contract/spec.md`. MODIFIED rss pack widgets `[feed, latest]`; defaults stay `[feed]`.
- [x] 1.5 `pnpm exec openspec validate --strict --type change rss-latest`. Do not archive. Do not edit `openspec/specs/**`.

## 2. Pack implementation (this node)

- [x] 2.1 Exclusive: `packages/plugins/src/rss/widgets/latest/**`. View-model (recency + limit), `widget.tsx` composing Time, `render.ts` via `fromJsx` + `renderSvg`. Consume `RssClient.fetchFeed`. MUST NOT HTTP.
- [x] 2.2 Exclusive: `packages/plugins/src/rss/plugin.ts`. Append `latest` to `widgets`. Keep defaults `["feed"]`. Union `Time` into `RSS_BITS_USED`.
- [x] 2.3 Exclusive tests: `packages/plugins/src/rss/plugin.test.ts`, `packages/plugins/src/rss/widgets/latest/*.test.ts`, `scripts/rss-latest.test.ts`. Shared client; feed widget still passes; no `plugin_*_*_*`; Time formats dates.

## 3. Out of scope

- [x] 3.1 Do not edit `packages/core/src/types.ts`. Do not edit Action engine or `packages/plugins/src/index.ts`.
- [x] 3.2 Do not run `author-integration add`. Do not run `npx skills add`. Do not commit. Do not tag `v1` at `main`.
