## ADDED Requirements

### Requirement: now-playing and top read the Spotify dump
Widgets `now-playing` and `top` MUST declare integration `spotify` only. They MUST consume the cached Spotify dump and MUST NOT perform HTTP. `now-playing` MUST prefer currently-playing and MUST fall back to recently-played when currently-playing is empty or `204`. `top` MUST apply `limit` in the widget (not by dropping dump fields at fetch). Empty now-playing MUST render “No now playing”. Empty top MUST render “No top tracks”. Extra dump keys MUST NOT fail the readers. Album art URLs in the dump MUST be readable for the Image bit. Card size MUST remain 480×160.

#### Scenario: now-playing fallback
- **WHEN** currently-playing is `null` or has no item and recently-played has a track
- **THEN** `now-playing` MUST render that recently-played track and MUST NOT fetch

#### Scenario: top limit is widget-side
- **WHEN** the dump has more top tracks than yaml `limit`
- **THEN** the widget MUST slice the dump and MUST NOT have caused the client to drop the extra tracks

#### Scenario: Widgets never HTTP
- **WHEN** `now-playing` or `top` render from a dump
- **THEN** they MUST NOT call `fetch(` or construct an HTTP client

#### Scenario: Cover art stays in the view-model
- **WHEN** a dumped track has album image URLs
- **THEN** the widget view-model MUST expose a cover URL for the Image bit
