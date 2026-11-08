## 1. OpenSpec artifacts (W3-CH-01)

- [x] 1.1 Exclusive: `openspec/changes/chess/.openspec.yaml` with `schema: spec-driven`.
- [x] 1.2 Exclusive: `proposal.md`. Chess pack + `chesscom` + `lichess`; widgets `ratings`/`game`; no widget id `stats`; Chess.com User-Agent; complete dumps; Board from FEN/PGN; chess.com-first 404 fallback. MUST NOT append `FIRST_PARTY_*`. Do not rewrite `docs-full-catalog-playground`.
- [x] 1.3 Exclusive: `design.md`. Username SSRF gate, pinned hosts, no chess engine, no shared barrel edits, no Playwright, no `v1` on `main`.
- [x] 1.4 Exclusive: `specs/integration-contract/spec.md`. ADDED chesscom/lichess dump + User-Agent + pinned hosts.
- [x] 1.5 Exclusive: `specs/widget-contract/spec.md`. ADDED ratings Stat + game Board; no HTTP; no `stats` id.
- [x] 1.6 Exclusive: `specs/plugin-contract/spec.md`. ADDED one chess pack, two integrations, default `ratings`.
- [x] 1.7 `pnpm exec openspec validate --strict --type change chess`. Do not archive. Do not edit `openspec/specs/**`.

## 2. Integrations (W3-CH-01)

- [x] 2.1 Exclusive: `packages/integrations/src/chesscom/**`. Auth none; User-Agent; player+stats+current/recent dump; fixtures with extra keys; mocked HTTP; username/archive SSRF tests. Dest `client.ts` was absent.
- [x] 2.2 Exclusive: `packages/integrations/src/lichess/**`. Auth none; user+current/recent dump; fixtures with extra keys; mocked HTTP; username SSRF tests. Dest `client.ts` was absent.
- [x] 2.3 MUST NOT `author-integration add` github / wakatime / rss / http. MUST NOT edit `packages/integrations/src/index.ts`.

## 3. Pack and widgets (W3-CH-01)

- [x] 3.1 Exclusive: `packages/plugins/src/chess/plugin.ts` + `plugin.test.ts`. Widgets `ratings`,`game`; integrations `chesscom`,`lichess`; defaults `ratings`; `bitsUsed` includes Stat and Board. No widget id `stats`.
- [x] 3.2 Exclusive: pack load chess.com-first, lichess on 404 only.
- [x] 3.3 Exclusive: `ratings` widget reads dump via Stat; no HTTP.
- [x] 3.4 Exclusive: `game` widget reads FEN/PGN via Board; no HTTP; empty “No game data”.
- [x] 3.5 MUST NOT edit `packages/core/src/types.ts`, `packages/bits/**`, `packages/plugins/src/index.ts`, or `action.yml`.

## 4. Tests and locks (W3-CH-01)

- [x] 4.1 Exclusive: `scripts/chess.test.ts`. Change stays unarchived; `docs-full-catalog-playground` stays; no flatten; no `stats` widget id; User-Agent; Board; no `types.ts` edits in this change.
- [x] 4.2 Targeted vitest: chesscom, lichess, chess plugin/widgets, `scripts/chess.test.ts`.
- [x] 4.3 Do not commit. Do not tag `v1` on `main`. Do not run `npx skills add`. Do not treat `POST /api/preview` as an embed API.
