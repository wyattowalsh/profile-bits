## ADDED Requirements

### Requirement: Pack agents complete elbow ids without editing types.ts
After this change, `spotify`, `leetcode`, `chess`, `steam`, `chesscom`, `lichess`, and the Wave 3 widget ids listed in `widget-contract` MUST already be present in live `FIRST_PARTY_*`. Authoring skills MUST treat those ids as complete-existing catalog members. Pack agents MUST NOT edit `packages/core/src/types.ts`. Skills MUST NOT silently append `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, or `FIRST_PARTY_INTEGRATION_IDS`. Wave 2 MUST NOT run `author-integration add` for `github`, `wakatime`, `rss`, or `http`. Wave 3 MAY run `author-integration add` for a new id only when dest `client.ts` is absent. Skills MUST NOT invent `plugin_<plugin>_<widget>_<option>` inputs or extra pack bools.

#### Scenario: Elbow ids are complete-existing
- **WHEN** a pack agent authors `spotify`, `leetcode`, `chess`, or `steam`
- **THEN** it MUST complete the existing catalog id and MUST NOT append `FIRST_PARTY_*`

#### Scenario: types.ts is single-writer
- **WHEN** a Wave 3 pack, widget, or bit agent runs
- **THEN** it MUST NOT edit `packages/core/src/types.ts`

#### Scenario: No live dest add in wave 2
- **WHEN** skills are asked to add github, wakatime, rss, or http
- **THEN** they MUST NOT run `author-integration add` for those ids

#### Scenario: Preview is not an embed API
- **WHEN** docs preview an elbow or reuse widget
- **THEN** `POST /api/preview` MUST remain layout preview, not a public embed API
