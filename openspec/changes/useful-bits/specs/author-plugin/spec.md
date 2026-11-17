## ADDED Requirements

### Requirement: bitsUsed membership may include useful bits
Pack-level `bitsUsed` membership MUST allow the useful bit names `Sparkline`, `Meter`, `Duration`, `Relative`, `Delta`, `Ordinal`, `Quote`, `Timeline`, `Empty`, `Figure`, `Table`, `StackBar`, `Compare`, `Legend`, `Code`, `Callout`, `Dot`, `Rating`, `Strip`, `Wrap`, `Ring`, `AvatarStack`, `KeyValue`, `Banner`, `Eyebrow`, and `Status` after those names exist in `BIT_EXPORTS`. Starter `BITS_USED` for new packs MUST remain Theme, Frame, Stack, Row, Text, and Muted. Dialog, Toast, Popover, Dropdown, and Command MUST NOT appear in `bitsUsed`. This change MUST NOT put `bits:` in yaml and MUST NOT add flattened `plugin_<plugin>_<widget>_<option>` Action inputs. `POST /api/preview` MUST remain layout preview, not a public embed API.

#### Scenario: Duration may join bitsUsed
- **WHEN** steam recent composes `Duration` and that name is in `BIT_EXPORTS`
- **THEN** the steam pack MUST be allowed to list `Duration` in pack-level `bitsUsed` and MUST NOT list `Dialog`

#### Scenario: Starter six stays the starter
- **WHEN** `author-plugin` generates a new pack registry
- **THEN** the starter `BITS_USED` MUST still be Theme, Frame, Stack, Row, Text, and Muted

#### Scenario: No flattened inputs
- **WHEN** this change lands
- **THEN** the Action MUST NOT gain a `plugin_<plugin>_<widget>_<option>` input
