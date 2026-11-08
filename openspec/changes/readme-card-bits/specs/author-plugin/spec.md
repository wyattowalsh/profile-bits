## ADDED Requirements

### Requirement: Author-bit may copy Bit.template for approved README-card names
`author-bit` MUST treat `Image`, `Heatmap`, `Board`, `Icon`, `Grid`, `List`, and `Time` as OpenSpec-approved 12th+ names. After this delta, adding one of those names MUST copy the single generic `templates/Bit.template` to `packages/bits/src/<BitName>.tsx` (substitute `{{BitName}}`), then a later barrel node MUST add the named export and `BIT_EXPORTS` entry. The skill MUST NOT ship one template per Frozen 11 bit. The skill MUST NOT copy `Bit.template` onto Frozen 11 files. Completing Frozen 11 MUST still inventory live source plus export and stop as complete-existing when they exist. Ranking alias `Cover` MUST route to `Image` and MUST NOT create `Cover.tsx`. This change MUST NOT itself copy templates or edit `packages/bits/**`.

#### Scenario: Approved Image may use Bit.template after this delta
- **WHEN** a later node adds OpenSpec-approved `Image`
- **THEN** `author-bit` MUST copy `templates/Bit.template` to `packages/bits/src/Image.tsx` and MUST NOT stop as an unapproved 12th name

#### Scenario: Frozen 11 still do not use Bit.template
- **WHEN** `author-bit` is asked to complete `Chip` or `Theme`
- **THEN** it MUST inventory live source and MUST NOT copy `Bit.template` onto that file

#### Scenario: Cover routes to Image
- **WHEN** an author asks for a Cover bit
- **THEN** the skill MUST name `Image` and MUST NOT write `packages/bits/src/Cover.tsx`

#### Scenario: This node does not copy templates
- **WHEN** W3-B-01 lands the OpenSpec change
- **THEN** it MUST NOT copy `Bit.template` and MUST NOT edit `packages/bits/src/index.ts`

### Requirement: Author-bit refuses overlay primitives
`author-bit` MUST stop when asked for `Dialog`, `Toast`, `Popover`, `Dropdown`, or `Command`. It MUST NOT create those source files, MUST NOT add them to `BIT_EXPORTS`, and MUST NOT create `author-dialog` or another seventh skill. Overlay widgets MUST NOT enter pack `bitsUsed`.

#### Scenario: Dialog stops
- **WHEN** an author asks `author-bit` for Dialog
- **THEN** the skill MUST stop and MUST NOT write `packages/bits/src/Dialog.tsx`

#### Scenario: Toast Popover Dropdown Command stop
- **WHEN** an author asks for Toast, Popover, Dropdown, or Command as a shared bit
- **THEN** the skill MUST stop and MUST NOT add a seventh skill directory

### Requirement: bitsUsed membership may include approved 12th names after they land
Pack-level `bitsUsed` membership MUST allow Frozen 11 plus OpenSpec-approved `Image`, `Heatmap`, `Board`, `Icon`, `Grid`, `List`, and `Time` after those bits exist. Starter `BITS_USED` for new packs MUST remain Theme, Frame, Stack, Row, Text, and Muted. Dialog, Toast, Popover, Dropdown, and Command MUST NOT appear in `bitsUsed`. This change MUST NOT edit live pack `bitsUsed` arrays, MUST NOT put `bits:` in yaml, and MUST NOT add flattened `plugin_<plugin>_<widget>_<option>` Action inputs. Wave 3 MUST NOT run `author-integration add` for `github`, `wakatime`, `rss`, or `http`. `POST /api/preview` MUST remain layout preview, not a public embed API.

#### Scenario: Approved names may join bitsUsed after they land
- **WHEN** `Image` exists as a bit export
- **THEN** a pack MUST be allowed to list `Image` in pack-level `bitsUsed` and MUST NOT list `Dialog`

#### Scenario: Starter six is unchanged
- **WHEN** `author-plugin` generates a new pack registry
- **THEN** `{{PLUGIN_ID_UPPER}}_BITS_USED` MUST still start as Theme, Frame, Stack, Row, Text, and Muted

#### Scenario: No flatten and no live dest add
- **WHEN** this change lands
- **THEN** the system MUST NOT add `plugin_<plugin>_<widget>_<option>` inputs and MUST NOT run `author-integration add` for github, wakatime, rss, or http
