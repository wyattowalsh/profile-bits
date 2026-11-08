## ADDED Requirements

### Requirement: ratings widget reads chess dumps with Stat
Widget `ratings` MUST declare integrations `chesscom` and `lichess`. It MUST
consume the cached dump and MUST NOT perform HTTP. It MUST render Stat chips
for available time-class ratings (bullet, blitz, rapid, daily or classical,
puzzle when present) and MUST NOT invent `0` for missing classes. Empty
rating data MUST render a “No ratings data” card, not crash. Default card
size MUST remain 480×160 SVG still. Widget id MUST be `ratings` and MUST NOT
be `stats`. Pack agents MUST NOT append `FIRST_PARTY_WIDGET_IDS`.

#### Scenario: ratings uses Stat and not stats id
- **WHEN** the chess ratings card is registered
- **THEN** its widget id MUST be `ratings`, it MUST NOT be `stats`, and its
  template MUST use the Stat bit

#### Scenario: ratings does not HTTP
- **WHEN** `ratings` renders from a dump with extra keys
- **THEN** it MUST NOT call `fetch` and MUST still render

#### Scenario: missing classes are omitted not zeroed
- **WHEN** the dump has blitz rating 2800 and no bullet object
- **THEN** the card MUST show blitz and MUST NOT render bullet as `0`

### Requirement: game widget renders Board from FEN or PGN
Widget `game` MUST declare integrations `chesscom` and `lichess`. It MUST
consume the cached dump and MUST NOT perform HTTP. It MUST prefer a `fen` or
`lastFen` field, else a PGN `[FEN ""]` tag, and pass that FEN to the Board
bit. It MUST NOT replay PGN moves with a chess engine. Missing position MUST
render “No game data” (or player names without a starting-position Board)
and MUST NOT crash. `game` is opt-in like github `demo` and MUST NOT become
a pack default. Default card size MUST remain 480×160 SVG still.

#### Scenario: game uses Board
- **WHEN** the dump includes a current or recent game FEN
- **THEN** the template MUST render the Board bit with that FEN

#### Scenario: PGN FEN tag is a fallback
- **WHEN** the dump has `pgn` with a `[FEN "…"]` tag and no `fen` field
- **THEN** Board MUST receive that tagged FEN

#### Scenario: empty game does not crash
- **WHEN** the dump has no current or recent game position
- **THEN** the widget MUST render a “No game data” card and MUST NOT throw

#### Scenario: game does not HTTP
- **WHEN** `game` renders from a dump
- **THEN** it MUST NOT call `fetch`
