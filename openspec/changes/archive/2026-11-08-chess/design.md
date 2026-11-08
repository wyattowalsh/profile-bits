## Context

`elbow-catalog` / W3-T-01 already named plugin `chess`, integrations
`chesscom` + `lichess`, widgets `ratings` + `game`, auth `none`, and yaml
`plugins.chess.user`. Pack agents MUST NOT edit `types.ts`. Board exists
from W3-B-04 (`fen` / `squares`). Chess.com Published Data API requires a
contactable User-Agent. Inventory: one pack, two JSON hosts.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Vitest 4, Biome 2.5.
No `plugin_*_*_*`. Never unauthenticated GitHub. Never REST `/languages`.
Do not tag `v1` on `main`. Do not run `npx skills add`. Do not commit.
Finish `docs-full-catalog-playground` in place. Wave 2 extends live
`client.ts` for github/wakatime/rss/http only.

## Goals / Non-Goals

**Goals:**

- Auth-none clients for `chesscom` and `lichess` with mocked HTTP tests.
- Complete dumps: player/user + stats/perfs + current/recent games. Extra
  keys MUST NOT fail parse.
- Chess.com identifying User-Agent on every `api.chess.com` request.
- `ratings` reads rating chips (Stat). `game` renders Board from FEN, with
  PGN `[FEN]` as fallback. No widget id `stats`.
- Yaml `user` only: chess.com first, lichess on 404.
- Username is not a URL. Archive URLs from chess.com JSON stay pinned to
  `api.chess.com`. No Playwright.

**Non-Goals:**

- Appending `FIRST_PARTY_*` or editing `types.ts`.
- Implementing Board (W3-B-04).
- Playground / catalog routes for chess (docs stay four-pack).
- Action barrel wiring in `packages/plugins/src/index.ts` or
  `packages/integrations/src/index.ts` (shared; four pack agents).
- Chess engine / PGN move replay. FEN field or PGN FEN tag only.
- `author-integration add` on github / wakatime / rss / http.

## Decisions

### 1. Behavior change, not new catalog ids

- **Choice:** Change id `chess` deltas fetch/render only. Ids stay those
  named by `elbow-catalog`.
- **Why:** Facts: each workstream is its own OpenSpec change; new ids were
  already OpenSpec-first.
- **Alternative:** Mint `add-chess-pack` ids — rejected; would dual-write
  the catalog.

### 2. Chess.com first, lichess 404 fallback

- **Choice:** Pack load tries `chesscom.fetchDump(user)` then lichess only
  when chess.com returns 404 (unknown user). 429/5xx do not fall back.
- **Why:** Plan: README meme + lichess fallback when yaml only has `user`.
  Falling back on rate-limit would hide Chess.com failures.
- **Alternative:** Always fetch both — rejected; doubles public unauth JSON
  and mixes two identities.

### 3. Username gate instead of visitor URL SSRF

- **Choice:** Yaml has no fetch URL. Usernames match
  `^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$`. Path uses `encodeURIComponent`.
  Chess.com archive URLs MUST be `https://api.chess.com/pub/...` with no
  userinfo. Lichess GETs stay `https://lichess.org/api/...`.
- **Why:** Plan verify: SSRF if any user-controlled URL. There is none;
  the gate still blocks `/`, `@`, `https://evil.com` usernames.
- **Alternative:** Reuse http `ssrfGet` on a user URL option — rejected;
  no such yaml key on `ChessPluginConfigSchema`.

### 4. Identifying Chess.com User-Agent

- **Choice:** Every chess.com request sends
  `User-Agent: profile-bits-chesscom/0 (+https://github.com/wyattowalsh/profile-bits)`
  and no `Authorization`.
- **Why:** Published Data API blocks missing/generic UA. Contact URL
  identifies the client. Auth is `none`.
- **Alternative:** Reuse `profile-bits` GitHub UA — weaker contact signal.

### 5. Board consumes FEN, not a chess engine

- **Choice:** `game` prefers `fen` / `lastFen` / PGN `[FEN ""]`. Missing
  position renders “No game data” (or names without a fake start position).
  MUST import Board. MUST NOT invent a 12th bit.
- **Why:** Board already parses FEN. PGN replay is out of scope.
- **Alternative:** Ship piece SVGs / FEN parser in the widget — rejected;
  Board is the primitive.

## Risks / Trade-offs

- [Shared barrels unexported] → Pack/integration tests import dest files
  directly. W3-V may list barrel gaps.
- [Lichess 404 current-game] → Optional; dump `current` empty, recent
  games still populate `game`.
- [Chess.com to-move empty] → Recent monthly archive supplies `game`.

## Migration Plan

Land unarchived. Targeted vitest on this change’s script + chesscom +
lichess + chess plugin/widgets. Rollback is delete
`openspec/changes/chess/` and the dest trees. Do not edit
`openspec/specs/**` until archive. Do not archive from a sibling pack node.

## Open Questions

None. Auth stays `none`. No Action chess token. No `plugin_chess` bool.
