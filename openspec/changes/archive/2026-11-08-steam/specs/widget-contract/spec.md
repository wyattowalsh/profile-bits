## ADDED Requirements

### Requirement: steam player widget selects from the dump
Widget `player` MUST declare integration `steam` only. It MUST consume
the cached steam dump (GetPlayerSummaries player object, plus
ResolveVanityURL when used) and MUST NOT perform HTTP. The card MUST
compose Frozen 11 `Stat` plus README-card `Image` (inventory Cover maps
to `Image`; the system MUST NOT create `Cover.tsx`). Default options
MUST be `filename` `player` and `animate` false. Empty or private
profiles MUST render an empty-state card and MUST NOT crash. The widget
MUST NOT invent `0` for omitted dump fields. `POST /api/preview` remains
layout preview, not a public embed API. Extra dump keys MUST NOT fail
parse.

#### Scenario: player declares steam only
- **WHEN** widget `player` is resolved
- **THEN** `WIDGET_INTEGRATIONS.player` MUST be `["steam"]`

#### Scenario: player reads the dump without HTTP
- **WHEN** widget `player` renders
- **THEN** it MUST select fields from the cached steam dump and MUST NOT
  perform HTTP

#### Scenario: player uses Stat and Image
- **WHEN** widget `player` is registered
- **THEN** it MUST use bits `Stat` and `Image` and MUST NOT create
  `Cover.tsx`

#### Scenario: empty player dump is an empty card
- **WHEN** GetPlayerSummaries returns no players
- **THEN** the widget MUST render an empty-state card, MUST NOT crash,
  and MUST NOT invent `0`

### Requirement: steam recent widget selects from the dump
Widget `recent` MUST declare integration `steam` only. It MUST consume
the cached GetRecentlyPlayedGames dump and MUST NOT perform HTTP. The
card MUST compose Frozen 11 `Stat` plus README-card `Image` (game icon;
Cover maps to `Image`). Yaml `limit` MUST be 1–16 default 5 and MUST
apply in the widget reader, not by dropping `games[]` at fetch. Default
`filename` MUST be `recent` and `animate` MUST default false. Empty
`games[]` MUST render an empty-state card and MUST NOT invent `0`. Extra
dump keys MUST NOT fail parse. `recent` MUST be opt-in (not a pack
default). `POST /api/preview` remains layout preview, not a public embed
API.

#### Scenario: recent declares steam only
- **WHEN** widget `recent` is resolved
- **THEN** `WIDGET_INTEGRATIONS.recent` MUST be `["steam"]`

#### Scenario: recent reads the dump without HTTP
- **WHEN** widget `recent` renders
- **THEN** it MUST select fields from the cached steam dump and MUST NOT
  perform HTTP

#### Scenario: recent limit is widget-side
- **WHEN** yaml `limit` is `1` and the dump `games[]` has more than one
  game
- **THEN** the widget MUST apply `limit` while reading the dump and the
  cached dump MUST still contain the unsliced list

#### Scenario: empty recent dump is an empty card
- **WHEN** GetRecentlyPlayedGames returns `total_count` 0 or an empty
  `games[]`
- **THEN** the widget MUST render an empty-state card, MUST NOT crash,
  and MUST NOT invent `0`

#### Scenario: recent uses Stat and Image
- **WHEN** widget `recent` is registered
- **THEN** it MUST use bits `Stat` and `Image` and MUST NOT create
  `Cover.tsx`
