## ADDED Requirements

### Requirement: LeetCode pack binds integration leetcode only
Pack `leetcode` MUST declare integration `leetcode` only. That plugin MUST include widgets `solved` and opt-in `heatmap`. When the pack is on and no widget list is specified, the system MUST enable `solved` and MUST NOT enable `heatmap` until explicitly enabled. The Action MUST NOT expose a `plugin_leetcode` bool. The system MUST NOT add `plugin_<plugin>_<widget>_<option>` inputs. Pack agents MUST complete the existing catalog id and MUST NOT append `FIRST_PARTY_PLUGIN_IDS`. Pack agents MUST NOT edit `packages/core/src/types.ts`.

#### Scenario: Pack default is solved
- **WHEN** the leetcode plugin is enabled with no widget list
- **THEN** the enabled widgets MUST be `solved` and `heatmap` MUST remain disabled until explicitly enabled

#### Scenario: Heatmap is opt-in
- **WHEN** yaml enables `plugins.leetcode.widgets.heatmap`
- **THEN** widget `heatmap` MUST be available on pack `leetcode` and MUST NOT become a pack default

#### Scenario: No extra pack bool or flatten
- **WHEN** root `action.yml` is generated
- **THEN** it MUST NOT contain `plugin_leetcode` or any `plugin_<plugin>_<widget>_<option>` input

#### Scenario: Pack agents do not mint ids
- **WHEN** a pack agent authors `leetcode`
- **THEN** it MUST complete the existing catalog id, MUST NOT append `FIRST_PARTY_PLUGIN_IDS`, and MUST NOT edit `packages/core/src/types.ts`
