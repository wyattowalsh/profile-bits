## ADDED Requirements

### Requirement: LeetCode widgets select from the cached dump
Widgets `solved` and `heatmap` MUST consume the leetcode cached dump and MUST NOT perform HTTP. They MUST declare integration `leetcode` only. Include/limit filters MUST stay widget-side and MUST NOT drop dump fields at fetch. Extra dump keys MUST NOT fail widget parse. Frozen option schemas (`filename`, `animate`) MUST stay. Widget id `heatmap` MUST stay the leetcode submission heatmap. The github contribution heatmap MUST remain widget id `contributions`. Playground and docs preview MUST use fixtures or skip live and MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: Solved selects from the dump
- **WHEN** widget `solved` renders
- **THEN** it MUST read the cached leetcode dump and MUST NOT perform HTTP

#### Scenario: Heatmap selects from the dump
- **WHEN** widget `heatmap` renders
- **THEN** it MUST read `submissionCalendar` from the cached dump and MUST NOT perform HTTP

#### Scenario: Extra dump keys do not fail parse
- **WHEN** the cached dump includes fields the current card does not render
- **THEN** widgets `solved` and `heatmap` MUST still parse and MUST NOT fail because extra keys are present

#### Scenario: heatmap stays leetcode
- **WHEN** widget `heatmap` is resolved
- **THEN** it MUST declare integration `leetcode` only and MUST NOT be the github contribution heatmap

#### Scenario: Preview is not an embed API
- **WHEN** the docs playground previews a leetcode widget
- **THEN** it MUST use fixtures or skip live and MUST NOT treat `POST /api/preview` as a public embed API

### Requirement: Heatmap widget uses the Heatmap bit
Widget `heatmap` MUST render LeetCode solved days with the shared `Heatmap` bit (day grid of intensity cells). It MUST NOT use `Board`. Widget `solved` MUST NOT invent a new bit for counts already covered by Frozen 11 `Stat`. This change MUST NOT enumerate bits in `packages/core/src/types.ts`.

#### Scenario: LeetCode solved days use Heatmap not Board
- **WHEN** widget `heatmap` shows LeetCode solved days
- **THEN** it MUST use `Heatmap` and MUST NOT use `Board`

#### Scenario: Solved does not mint a new bit
- **WHEN** widget `solved` renders solved counts
- **THEN** it MUST NOT add a new bit name beyond Frozen 11 plus the OpenSpec-approved README-card primitives
