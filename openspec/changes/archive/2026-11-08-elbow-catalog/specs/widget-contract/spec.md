## ADDED Requirements

### Requirement: Wave 3 widget ids are globally unique
Widget ids MUST be globally unique across packs. Wave 3 MUST append these ids to `FIRST_PARTY_WIDGET_IDS` and `WIDGET_INTEGRATIONS`:

- github reuse: `top-repos` → `github`; `contributions` → `github`
- wakatime slices: `editors`, `projects`, `os`, `langs` → `wakatime`
- rss: `latest` → `rss`
- spotify: `now-playing`, `top` → `spotify`
- leetcode: `solved`, `heatmap` → `leetcode`
- chess: `ratings`, `game` → `chesscom` and `lichess`
- steam: `player`, `recent` → `steam`

Existing ids `demo`, `stats`, `languages`, `repo`, `coding`, `feed`, `json`, and `chips` MUST remain. Widget id `languages` MUST stay the github languages card. The WakaTime languages slice MUST use `langs`. Widget id `heatmap` MUST stay the leetcode submission heatmap. The github contribution heatmap MUST use `contributions`. Chess MUST NOT use widget id `stats`. Pack agents MUST NOT append `FIRST_PARTY_WIDGET_IDS`.

#### Scenario: Catalog lists Wave 3 widget ids
- **WHEN** live `FIRST_PARTY_WIDGET_IDS` is read
- **THEN** it MUST contain `top-repos`, `contributions`, `editors`, `projects`, `os`, `langs`, `latest`, `now-playing`, `top`, `solved`, `heatmap`, `ratings`, `game`, `player`, and `recent` in addition to the eight shipped ids

#### Scenario: languages stays github
- **WHEN** widget `languages` is resolved
- **THEN** `WIDGET_INTEGRATIONS.languages` MUST be `["github"]` and MUST NOT be wakatime

#### Scenario: langs is the wakatime languages slice
- **WHEN** widget `langs` is resolved
- **THEN** `WIDGET_INTEGRATIONS.langs` MUST be `["wakatime"]`

#### Scenario: heatmap stays leetcode
- **WHEN** widget `heatmap` is resolved
- **THEN** `WIDGET_INTEGRATIONS.heatmap` MUST be `["leetcode"]` and MUST NOT be github

#### Scenario: contributions is the github heatmap widget
- **WHEN** widget `contributions` is resolved
- **THEN** `WIDGET_INTEGRATIONS.contributions` MUST be `["github"]`

#### Scenario: chess does not reuse stats
- **WHEN** chess widgets are registered
- **THEN** their ids MUST be `ratings` and `game` and MUST NOT be `stats`

### Requirement: Reuse widgets stay on existing packs
Widgets `top-repos` and `contributions` MUST live on pack `github`. Widgets `editors`, `projects`, `os`, and `langs` MUST live on pack `wakatime`. Widget `latest` MUST live on pack `rss`. Those widgets MUST consume the existing integration dump and MUST NOT introduce a new integration id. Include/limit for wakatime slices MUST stay widget-side. Widgets MUST NOT perform HTTP.

#### Scenario: github reuse widgets declare github only
- **WHEN** widgets `top-repos` or `contributions` are registered
- **THEN** they MUST declare integration `github` only

#### Scenario: wakatime slice widgets declare wakatime only
- **WHEN** widgets `editors`, `projects`, `os`, or `langs` are registered
- **THEN** they MUST declare integration `wakatime` only and MUST NOT be id `stats`

#### Scenario: rss latest declares rss only
- **WHEN** widget `latest` is registered
- **THEN** it MUST declare integration `rss` only

### Requirement: Elbow pack widgets bind named integrations
Widgets `now-playing` and `top` MUST declare integration `spotify` only. Widgets `solved` and `heatmap` MUST declare integration `leetcode` only. Widgets `ratings` and `game` MUST declare integrations `chesscom` and `lichess`. Widgets `player` and `recent` MUST declare integration `steam` only.

#### Scenario: spotify widgets
- **WHEN** widgets `now-playing` or `top` are resolved
- **THEN** `WIDGET_INTEGRATIONS` MUST map them to `["spotify"]`

#### Scenario: leetcode widgets
- **WHEN** widgets `solved` or `heatmap` are resolved
- **THEN** `WIDGET_INTEGRATIONS` MUST map them to `["leetcode"]`

#### Scenario: chess widgets use both hosts
- **WHEN** widgets `ratings` or `game` are resolved
- **THEN** `WIDGET_INTEGRATIONS` MUST map them to `["chesscom", "lichess"]`

#### Scenario: steam widgets
- **WHEN** widgets `player` or `recent` are resolved
- **THEN** `WIDGET_INTEGRATIONS` MUST map them to `["steam"]`
