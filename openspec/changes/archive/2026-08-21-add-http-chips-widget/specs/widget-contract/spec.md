## ADDED Requirements

### Requirement: Frozen chips widget options
Widget `chips` MUST use integration `http` only. Options MUST be: `filename` (default `chips`); `preset` (`shieldcn` or `shields`; required; one preset per widget); `types` (list of `npm`, `stars`, `forks`, `license`, `release`, `issues`, `prs`, `ci`; min 1, max 8; duplicates MUST be removed while preserving first-seen order); optional `package`; optional `repo`; optional `workflow` (default `ci.yml`, used for shields `ci` only); `timeout_ms` (integer 1–20000, default 10000); `animate` bool default false. Yaml MUST NOT accept `url`, `headers`, `method`, or `bits` on chips. Parse MUST allow omitting `package`, `repo`, and `workflow`. Missing package or owner after expand (Action `user` as owner when `repo` has no `/`) MUST fail the widget, not parse. Unknown preset or type MUST fail parse. Empty `types` MUST fail parse. Extra keys MUST fail parse.

The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The template MUST render a wrapping row of horizontal split Chips (`label` + `message` + `messageColor`). The widget MUST NOT wrap `Stat` for this chrome. Children-only Chip MUST remain valid for github stats. The widget MUST consume normalized `{ label, message, color? }` payloads and MUST NOT perform HTTP itself. A load helper in the widget folder MUST call the injected http client; the template MUST have fetch none. `animate` MUST be plumbed; gif/apng motion for `chips` is not required. A skipped `chips` widget MUST NOT write files (inherited skip-without-write).

#### Scenario: Chips defaults
- **WHEN** `chips` is enabled with `preset` and `types` and no other option overrides
- **THEN** `filename` MUST be `chips`, `timeout_ms` MUST be 10000, `animate` MUST be false, `workflow` MUST default to `ci.yml`, the card MUST be 480×160 svg, and the widget MUST NOT perform HTTP

#### Scenario: one preset per chips widget
- **WHEN** yaml `widgets.chips.preset` is `shieldcn` or `shields`
- **THEN** every type on that widget MUST expand with that preset only

#### Scenario: types min max and dedupe
- **WHEN** yaml `types` is empty, contains an unknown token, contains duplicates, or has more than 8 entries after first-seen dedupe
- **THEN** empty or unknown MUST fail parse; duplicates MUST be dropped preserving first-seen order; more than 8 unique types MUST fail parse

#### Scenario: missing package and repo parse
- **WHEN** yaml omits `package` and/or `repo` on chips
- **THEN** parse MUST succeed

#### Scenario: chips url headers method bits fail parse
- **WHEN** yaml `widgets.chips` includes `url`, `headers`, `method`, or `bits`
- **THEN** parse MUST fail

#### Scenario: unknown preset fails parse
- **WHEN** yaml `preset` is not `shieldcn` or `shields`
- **THEN** parse MUST fail

### Requirement: chips Chip row, color, and empty card
Each successful chip MUST render as a horizontal split Chip: muted label half plus message half. Message color MUST come from a closed named map `brightgreen`, `green`, `yellowgreen`, `yellow`, `orange`, `red`, `blue`, `lightgrey`, `success`, `important`, `critical`, `informational`, `inactive`, or from `#rgb` / `#rrggbb`. Any other color string, and a missing color, MUST use theme `accent`. Color MUST be applied with inline style only. The widget MUST ignore `link` and `href`. Empty after a successful fetch/normalize list (zero chips) MUST render a “No data” card and MUST NOT crash.

#### Scenario: split Chip uses label and message
- **WHEN** a normalized chip has `label` and `message`
- **THEN** the card MUST show a horizontal split Chip with that label and message and MUST NOT wrap `Stat`

#### Scenario: missing color uses theme accent
- **WHEN** a normalized chip has no color (including shieldcn payloads that omit color)
- **THEN** the message half MUST use theme `accent`

#### Scenario: named and hex colors apply inline
- **WHEN** color is a named map token or `#rgb` / `#rrggbb`
- **THEN** the message half MUST use that color via inline style and MUST NOT emit `<style>`, SMIL, `foreignObject`, or `url()`

#### Scenario: unknown color falls back to accent
- **WHEN** color is a string outside the named map and not `#rgb` or `#rrggbb`
- **THEN** the message half MUST use theme `accent`

#### Scenario: link and href are ignored
- **WHEN** the JSON payload includes `link` or `href`
- **THEN** the widget MUST still render the chip and MUST NOT treat those fields as required or as per-chip links

#### Scenario: empty successful list renders No data
- **WHEN** every type GET and normalize succeeds and the resulting chip list is empty
- **THEN** the widget MUST render a “No data” card and MUST NOT crash

### Requirement: chips fail_widget matrix and fetch none
Missing `message` after `message = message ?? value` MUST fail the widget. One type GET failure or normalize failure MUST fail the **entire** chips widget (`fail_widget`) with no partial card. Missing package or owner after expand MUST fail the widget. HTTP outcomes for each expanded URL MUST follow the existing http matrix (`fail_widget`, never github `fail_run`). The template MUST NOT call `fetch`. Tests MUST assert zero live network and MUST spy `globalThis.fetch` unused on the template.

#### Scenario: missing message fails widget
- **WHEN** a type payload has neither `message` nor `value`, or both are empty
- **THEN** the chips widget MUST fail and MUST NOT write a partial card

#### Scenario: one type failure fails the whole widget
- **WHEN** any one type GET or normalize fails and other types would succeed
- **THEN** the chips widget MUST fail and MUST NOT render a partial card

#### Scenario: missing package or owner after expand fails widget
- **WHEN** types include `npm` without a package, or a github type without owner after applying Action `user` to a repo that has no `/`
- **THEN** the chips widget MUST fail

#### Scenario: 404 expanded url fails widget
- **WHEN** an expanded JSON URL returns HTTP 404
- **THEN** the chips widget MUST fail and MUST NOT skip or write output

#### Scenario: template performs no HTTP
- **WHEN** the chips template renders
- **THEN** it MUST NOT call `fetch` and MUST consume already-normalized chip records

#### Scenario: skipped chips does not write
- **WHEN** the chips widget is skipped per inherited skip-without-write policy
- **THEN** the Action MUST NOT write or overwrite that widget’s output file and MUST NOT treat it as `data-changed`
