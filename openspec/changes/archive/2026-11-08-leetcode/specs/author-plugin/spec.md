## ADDED Requirements

### Requirement: Wave 3 may author-integration add leetcode when dest client.ts is absent
`leetcode` is a complete-existing catalog id. When dest `packages/integrations/src/leetcode/client.ts` is absent, Wave 3 MAY run `author-integration add leetcode`. OpenSpec names `{{scheme}}` `none` for that dest. The skill MUST copy `assets/templates/auth.none.ts.template` onto `packages/integrations/src/leetcode/auth.ts`. The skill MUST NOT interpolate `auth.{{scheme}}.ts.template` as a path. Completing a live dest that already has `client.ts` MUST still stop and MUST NOT emit a parallel `auth.ts`. Wave 2 MUST NOT run `author-integration add` for `github`, `wakatime`, `rss`, or `http`. Pack agents MUST NOT edit `packages/core/src/types.ts`. Skills MUST NOT invent `plugin_<plugin>_<widget>_<option>` inputs or a `plugin_leetcode` bool. `POST /api/preview` remains layout preview, not a public embed API.

#### Scenario: Absent dest copies auth none
- **WHEN** Wave 3 runs `author-integration add leetcode` and dest `client.ts` is absent
- **THEN** the skill MUST copy `auth.none.ts.template` and MUST NOT stop as unknown scheme

#### Scenario: Live dest with client.ts still stops
- **WHEN** `author-integration add` targets an id whose dest `client.ts` already exists
- **THEN** the skill MUST stop and MUST NOT emit a parallel `auth.ts`

#### Scenario: Wave 2 does not add live first-party integrations
- **WHEN** wave 2 extends github, wakatime, rss, or http
- **THEN** it MUST NOT run `author-integration add` for those ids

#### Scenario: types.ts stays single-writer
- **WHEN** a Wave 3 leetcode pack agent runs
- **THEN** it MUST NOT edit `packages/core/src/types.ts` and MUST NOT append `FIRST_PARTY_*`

#### Scenario: No flatten
- **WHEN** leetcode is authored
- **THEN** the system MUST NOT add `plugin_<plugin>_<widget>_<option>` Action inputs and MUST NOT add a `plugin_leetcode` bool

#### Scenario: Preview is not an embed API
- **WHEN** docs preview a leetcode widget
- **THEN** `POST /api/preview` MUST remain layout preview, not a public embed API
