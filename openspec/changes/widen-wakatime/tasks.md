## 1. OpenSpec artifacts (W2-WK-01)

- [x] 1.1 Exclusive: `openspec/changes/widen-wakatime/proposal.md`. Rewrite leftover sliced payload. Include/limit is the coding widget reader. Do not rewrite `docs-full-catalog-playground`.
- [x] 1.2 Exclusive: `openspec/changes/widen-wakatime/design.md`. Cache unsliced dump; extras Cloud-first; RFC Basic; this node spec-only.
- [x] 1.3 Exclusive: `specs/integration-contract/spec.md`. REMOVED leftover totals-plus-slices. ADDED full stats dump, extra endpoints, RFC Basic, no email/key in the model.
- [x] 1.4 Exclusive: `specs/widget-contract/spec.md`. ADDED coding include/limit is the widget reader (render filters; cache keeps unrequested slices).
- [x] 1.5 `pnpm exec openspec validate --strict --type change widen-wakatime`. Do not archive. Do not edit `openspec/specs/**`.

## 2. Tests (W2-WK-01)

- [x] 2.1 Exclusive: `scripts/widen-wakatime.test.ts`. Assert change files keep the dump in cache, include/limit on the widget, extra endpoints, RFC Basic, no email/key, no flatten, no `author-integration add`, and do not rewrite `docs-full-catalog-playground`.

## 3. Later apply (not this node)

- [x] 3.1 W2-WK-02: Zod-parse full stats `data` (percent, best_day, categories, machines, dependencies, range). Stop `selectCodingPayload` inside `fetchStats`. Do not `author-integration add wakatime`.
- [x] 3.2 W2-WK-03: Extra authenticated endpoints `all_time_since_today`, bounded summaries, `statusbar/today`, goals. Insights omit 402/403. Skip heartbeats/durations. RFC Basic. No email in the model.
- [x] 3.3 W2-WK-04: Fixtures keep `percent`/`text`.
- [x] 3.4 W2-WK-05: Coding widget include/limit reader. Include `[languages]` omits editors in render; cache still has them.
- [x] 3.5 W2-WK-06: Dump tests; pack-on empty `wakatime_token` still `fail_job`. Do not flatten. Do not commit. Do not tag `v1` at `main`. Do not run `npx skills add`.
