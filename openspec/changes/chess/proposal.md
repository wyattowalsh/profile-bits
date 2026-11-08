## Why

Wave 3 elbow pack `chess` is catalogued (`elbow-catalog` / W3-T-01) as one
plugin with integrations `chesscom` and `lichess` and widgets `ratings` plus
`game`. Catalog ids are not enough: Chess.com Published Data API blocks
generic clients without an identifying User-Agent, dumps must keep player +
stats + current/recent game JSON, `game` must render the Board bit from FEN
(PGN FEN tag as fallback), and yaml `plugins.chess.user` must try chess.com
first then lichess. Widget id `stats` is already github.

## What Changes

- Complete existing catalog ids only. MUST NOT append `FIRST_PARTY_*` or edit
  `packages/core/src/types.ts`.
- Integration `chesscom`: auth `none` JSON GET `api.chess.com`, identifying
  User-Agent on every request, complete dump of player + stats +
  current/recent games (extra keys stay). Username is not a URL.
- Integration `lichess`: auth `none` JSON GET `lichess.org`, complete dump of
  user + current/recent games (extra keys stay).
- Pack `chess`: widgets `ratings` (Stat) and `game` (Board from FEN/PGN). Pack
  default is `ratings`; `game` is opt-in. Widget id MUST NOT be `stats`.
- Yaml only `user`: chess.com first, lichess fallback on 404. Widgets consume
  the cached dump and MUST NOT perform HTTP.
- Dest `client.ts` was absent: `author-integration` add-class clients under
  `packages/integrations/src/chesscom/` and `lichess/`. MUST NOT
  `author-integration add` github / wakatime / rss / http.
- Finish `docs-full-catalog-playground` in place. Do not rewrite that change
  id. Do not archive `elbow-catalog` from this node.

## Capabilities

### New Capabilities

- (none — behavior for existing catalog ids)

### Modified Capabilities

- `integration-contract`: chesscom + lichess auth none JSON dumps, Chess.com
  User-Agent, pinned hosts, username SSRF gate, complete player/stats/games
  cache, no user-controlled fetch URL.
- `widget-contract`: `ratings` Stat chips; `game` Board from FEN/PGN; no HTTP
  in widgets; no widget id `stats`; empty cards do not crash.
- `plugin-contract`: one chess pack, two integrations, default `ratings`,
  Board + Stat in pack `bitsUsed`.

## Impact

- Specs: ADDED deltas under this change. Do not edit `openspec/specs/**`
  until archive. Do not rewrite `docs-full-catalog-playground`,
  `elbow-catalog`, `readme-card-bits`, or Wave 2 widen changes.
- Code: `packages/integrations/src/chesscom/**`,
  `packages/integrations/src/lichess/**`, `packages/plugins/src/chess/**`,
  `scripts/chess.test.ts`. MUST NOT edit `types.ts`, Frozen 11 / Board bit
  sources, `action.yml`, or shared barrels (`packages/*/src/index.ts`).
- Out of scope: Playwright in the Action, tagging `v1` at `main`,
  `POST /api/preview` as an embed API, `npx skills add`, git commit,
  `plugin_*_*_*` inputs, unauthenticated GitHub, REST `/languages`.
