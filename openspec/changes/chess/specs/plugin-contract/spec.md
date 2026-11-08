## ADDED Requirements

### Requirement: chess is one pack with chesscom and lichess
Plugin id `chess` MUST be one pack. Its widgets MUST be `ratings` and
`game`. Its integrations MUST be the derived union `chesscom` and `lichess`
and MUST NOT include an integration id `chess`. Pack defaults when the pack
is on with no widget list MUST be `ratings` only (`game` opt-in). Pack-level
`bitsUsed` MUST include `Stat` (ratings) and `Board` (game) in addition to
layout bits. Pack agents MUST complete these existing catalog ids and MUST
NOT append `FIRST_PARTY_PLUGIN_IDS` and MUST NOT edit
`packages/core/src/types.ts`. The Action MUST NOT expose `plugin_chess`,
flattened `plugin_*_*_*` inputs, or `plugin_<plugin>_<widget>_<option>`
inputs. `docsPath` MUST NOT be hardcoded
as `/generate/chess/`.

#### Scenario: chess pack identity
- **WHEN** pack `chess` is registered
- **THEN** widgets MUST be `ratings` and `game`, integrations MUST be
  `chesscom` and `lichess`, and defaults MUST be `ratings`

#### Scenario: chess does not flatten Action inputs
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_chess` or any
  `plugin_chess_<widget>_<option>` input

### Requirement: chess yaml user prefers chess.com then lichess
A valid yaml document MAY include optional `plugins.chess` with optional
`user` and widgets `ratings` / `game`. When only `user` is set, load MUST
try integration `chesscom` first and MUST fall back to `lichess` only on
HTTP 404. 403, 429, and 5xx MUST NOT fall back. Missing/blank `user` MUST
`fail_widget` without HTTP. Default committed yaml MUST remain github-only.
`POST /api/preview` remains layout preview, not a public embed API.

#### Scenario: unknown chess.com user falls back to lichess
- **WHEN** yaml `plugins.chess.user` is set and chess.com returns 404
- **THEN** the pack MUST load the lichess dump for that user

#### Scenario: chess.com rate limit does not fall back
- **WHEN** chess.com returns 429
- **THEN** the pack MUST NOT call lichess as a substitute

#### Scenario: blank user does not HTTP
- **WHEN** yaml chess `user` is missing, `""`, or whitespace
- **THEN** load MUST fail the widget and MUST NOT send HTTP
