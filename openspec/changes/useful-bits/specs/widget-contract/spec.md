## MODIFIED Requirements

### Requirement: steam recent widget selects from the dump
Widget `recent` MUST declare integration `steam` only. It MUST consume the cached GetRecentlyPlayedGames dump and MUST NOT perform HTTP. The card MUST compose useful bit `Duration` for playtime and README-card `Image` for the game icon (Cover maps to `Image`; the system MUST NOT create `Cover.tsx`). Playtime MUST pass `Math.round(hours * 3600)` seconds into `Duration` when `hours` is present. Yaml `limit` MUST be 1–16 default 5 and MUST apply in the widget reader, not by dropping `games[]` at fetch. Default `filename` MUST be `recent` and `animate` MUST default false. Empty `games[]` MUST render an empty-state card and MUST NOT invent `0`. Extra dump keys MUST NOT fail parse. `recent` MUST be opt-in (not a pack default). `POST /api/preview` remains layout preview, not a public embed API.

#### Scenario: recent declares steam only
- **WHEN** widget `recent` is resolved
- **THEN** `WIDGET_INTEGRATIONS.recent` MUST be `["steam"]`

#### Scenario: recent reads the dump without HTTP
- **WHEN** widget `recent` renders
- **THEN** it MUST select fields from the cached steam dump and MUST NOT perform HTTP

#### Scenario: recent limit is widget-side
- **WHEN** yaml `limit` is `1` and the dump `games[]` has more than one game
- **THEN** the widget MUST apply `limit` while reading the dump and the cached dump MUST still contain the unsliced list

#### Scenario: empty recent dump is an empty card
- **WHEN** GetRecentlyPlayedGames returns `total_count` 0 or an empty `games[]`
- **THEN** the widget MUST render an empty-state card, MUST NOT crash, and MUST NOT invent `0`

#### Scenario: recent uses Stat and Image
- **WHEN** widget `recent` is registered
- **THEN** the game icon MUST be `Image`, playtime MUST be `Duration` instead of a `Stat` value string, and `Cover.tsx` MUST NOT be created

#### Scenario: recent uses Duration and Image
- **WHEN** widget `recent` renders a game that includes `hours`
- **THEN** it MUST use bits `Duration` and `Image`, MUST convert hours to seconds, and MUST NOT create `Cover.tsx`
