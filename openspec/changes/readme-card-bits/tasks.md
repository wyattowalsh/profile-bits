## 1. OpenSpec artifacts (W3-B-01)

- [x] 1.1 Exclusive: `openspec/changes/readme-card-bits/proposal.md`. Name Image, Heatmap, Board, Icon, Grid, List, Time. Frozen 11 complete-existing. Refuse Dialog/Toast/Popover/Dropdown/Command. Do not rewrite `docs-full-catalog-playground`.
- [x] 1.2 Exclusive: `openspec/changes/readme-card-bits/design.md`. `Image` not `Cover`; Heatmap ≠ Board ≠ Grid; spec-only this node.
- [x] 1.3 Exclusive: `openspec/changes/readme-card-bits/specs/bits-contract/spec.md`. ADDED Frozen 11 complete-existing, seven approved names, overlay refusal, Takumi-safe, no yaml `bits:`, this node does not land sources.
- [x] 1.4 Exclusive: `openspec/changes/readme-card-bits/specs/author-plugin/spec.md`. ADDED `Bit.template` for approved names, overlay stop, `bitsUsed` membership after they land, no flatten, no `author-integration add` for github/wakatime/rss/http.
- [x] 1.5 `pnpm exec openspec validate --strict --type change readme-card-bits`. Do not archive. Do not edit `openspec/specs/**`.

## 2. Tests (W3-B-01)

- [x] 2.1 Exclusive: `scripts/readme-card-bits.test.ts`. Assert the change names the seven bits, Frozen 11 complete-existing, overlay refused, Cover is Image, Frozen 11 sources exist, new bit files absent, `BIT_EXPORTS` still Frozen 11, no flatten, `docs-full-catalog-playground` still in place.

## 3. Later apply (not this node)

- [x] 3.1 W3-B-02…08: one agent per file `packages/bits/src/{Image,Heatmap,Board,Icon,Grid,List,Time}.tsx` from `Bit.template`. Do not rewrite Frozen 11.
- [x] 3.2 W3-B-09: barrel `BIT_EXPORTS` + `index.test.ts`.
- [x] 3.3 W3-B-10: `/generate/bits` samples. Do not treat `POST /api/preview` as an embed API.
- [x] 3.4 Do not add Dialog/Toast/Popover/Dropdown/Command. Do not flatten. Do not `author-integration add` github/wakatime/rss/http. Do not commit. Do not tag `v1` at `main`. Do not archive from W3-B-01.
