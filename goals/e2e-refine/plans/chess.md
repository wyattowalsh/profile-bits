# Workstream: chess

Wave 3 elbow #3. One pack, two integrations (`chesscom`, `lichess`), both auth none JSON.

## Widgets

- `ratings` (Stat)
- `game` (Board from FEN/PGN)

Do not use widget id `stats`. Chess.com Published Data API needs User-Agent. Complete dump of player + stats + current/recent game.

## Files

- `packages/integrations/src/chesscom/`, `packages/integrations/src/lichess/`
- `packages/plugins/src/chess/`

## Verify

- Fixtures for both hosts
- SSRF if any user-controlled URL
- Board bit required

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W3-CH-01…06 | 3–7 | B-09, W3-T-01 |
