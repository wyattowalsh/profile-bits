## Purpose

Takumi-safe README-card primitives that Frozen 11 and the README-card seven do not cover. Colors come from the host theme. Overlay widgets stay refused.

## ADDED Requirements

### Requirement: Useful bits are an approved shared set
The useful bit names MUST be `Sparkline`, `Meter`, `Duration`, `Relative`, `Delta`, `Ordinal`, `Quote`, `Timeline`, `Empty`, `Figure`, `Table`, `StackBar`, `Compare`, `Legend`, `Code`, `Callout`, `Dot`, `Rating`, `Strip`, `Wrap`, `Ring`, `AvatarStack`, `KeyValue`, `Banner`, `Eyebrow`, and `Status`. Each MUST have `packages/bits/src/<BitName>.tsx`, a named export, and a `BIT_EXPORTS` entry. Frozen 11 sources MUST stay unmodified by this change. `Cover` MUST NOT be exported. `Dialog`, `Toast`, `Popover`, `Dropdown`, and `Command` MUST NOT be added.

#### Scenario: Useful names are exported
- **WHEN** the bits barrel is loaded
- **THEN** `BIT_EXPORTS` MUST include every useful bit name and MUST NOT include `Cover`, `Dialog`, `Toast`, `Popover`, `Dropdown`, or `Command`

#### Scenario: Frozen 11 files are not rewritten
- **WHEN** this change adds useful bits
- **THEN** it MUST NOT replace `packages/bits/src/{Theme,Frame,Stack,Row,Text,Muted,Stat,Bar,Chip,Avatar,Divider}.tsx`

### Requirement: Useful bits stay distinct and Takumi-safe
`Sparkline` MUST chart a numeric series and MUST NOT be a single `Bar`. `Duration` MUST format a second count and MUST NOT be an absolute `Time`. `Relative` MUST format `value` against an injected `now` and MUST NOT call `Date.now` when `now` is provided. `Strip` MUST be a single row of intensity cells and MUST NOT be the 7-row `Heatmap`. `Table` MUST render header and body strings and MUST NOT replace `Grid`. `KeyValue` MUST be one line and MUST NOT replace stacked `Stat`. `Meter` MUST show a numeric value beside its track. `Banner` text MUST use `readableInk` of the accent fill. Bits MUST use `div`, `span`, or `img` only, MUST NOT import `react-dom`, and MUST NOT read `document`. Colors MUST come from bit theme context. Users MUST NOT put `bits:` in yaml. This change MUST NOT add flattened `plugin_<plugin>_<widget>_<option>` inputs or first-party pack, widget, or integration ids.

#### Scenario: Duration is not a timestamp
- **WHEN** `Duration` receives `3661` seconds
- **THEN** it MUST render `1h 1m` and MUST NOT perform HTTP

#### Scenario: Relative uses the injected clock
- **WHEN** `Relative` receives a timestamp two hours before `now`
- **THEN** it MUST render `2h` and MUST NOT read the system clock

#### Scenario: Banner ink follows the accent fill
- **WHEN** `Banner` renders on the dark theme
- **THEN** its text color MUST be `readableInk` of the theme accent and MUST NOT be a hardcoded white

#### Scenario: No document and no new catalog ids
- **WHEN** a useful bit renders
- **THEN** it MUST NOT import `react-dom` or read `document`, and this change MUST NOT append `FIRST_PARTY_PLUGIN_IDS`
