## ADDED Requirements

### Requirement: GitHub widgets select from the cached dump
Widgets `stats`, `languages`, and `repo` MUST consume the github cached dump and MUST NOT perform HTTP. `include`, `limit`, `min_pct`, and `exclude` MUST remain widget-side filters and MUST NOT drop fields at fetch. Extra dump keys MUST NOT fail widget parse. Frozen option schemas for those widgets MUST stay. Widget `demo` MUST keep integration `static` and MUST NOT call GitHub. Playground and docs preview MUST use fixtures or an App token and MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: Stats selects from the dump
- **WHEN** widget `stats` renders
- **THEN** it MUST read the cached github dump and MUST NOT perform HTTP

#### Scenario: Languages selects from the dump
- **WHEN** widget `languages` applies `limit`, `min_pct`, or `exclude`
- **THEN** those filters MUST run in the widget against the cached dump and MUST NOT drop language nodes at fetch

#### Scenario: Extra dump keys do not fail parse
- **WHEN** the cached dump includes fields the current card does not render
- **THEN** widgets `stats`, `languages`, and `repo` MUST still parse and MUST NOT fail because extra keys are present

#### Scenario: Preview is not an embed API
- **WHEN** the docs playground previews a github widget
- **THEN** it MUST use fixtures or an App token and MUST NOT treat `POST /api/preview` as a public embed API
