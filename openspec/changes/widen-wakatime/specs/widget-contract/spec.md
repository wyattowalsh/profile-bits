## ADDED Requirements

### Requirement: Coding include/limit is the widget reader
Widget `coding` MUST apply yaml `include` and `limit` when reading the
cached wakatime dump. Include/limit MUST NOT drop fields at fetch. When
`include` is `[languages]`, render MUST omit editors (and other
unrequested slices) and the cache MUST still contain those slices when
the source returned them. `limit` MUST cap rendered rows per included
slice and MUST NOT truncate the cached dump. Yaml token `os` MUST map
from dump field `operating_systems` in the widget reader. The widget
MUST NOT invent `0` for omitted include tokens. The widget MUST stay
HTTP-free. Empty rows after filters MUST still render a “No coding data”
card (write the card; this is `render`, not skip). Frozen coding yaml
defaults MUST stay `include: [languages, editors]` and `limit: 8`.
Widget id MUST remain `coding` and MUST NOT become `stats`. This change
MUST NOT add a new first-party widget id. The system MUST NOT add
flattened `plugin_<plugin>_<widget>_<option>` Action inputs such as
`plugin_wakatime_coding_range`.

#### Scenario: Include languages omits editors in render not cache
- **WHEN** `include` is `[languages]` and the cached dump still contains
  `editors`
- **THEN** the coding widget MUST omit editors in render and MUST NOT
  drop `editors` from the cache

#### Scenario: Limit caps render not cache
- **WHEN** `limit` is `1` and the cached `languages` slice has more than
  one row
- **THEN** render MUST show at most one language row and the cache MUST
  still contain the unsliced rows

#### Scenario: os maps from operating_systems at the widget
- **WHEN** `include` contains `os` and the dump has `operating_systems`
- **THEN** the widget reader MUST map that field to yaml token `os` and
  MUST NOT invent `0` when the field is absent

#### Scenario: Widget stays HTTP-free
- **WHEN** widget `coding` renders
- **THEN** it MUST consume the cached dump and MUST NOT perform HTTP

#### Scenario: Empty after filters still writes No coding data
- **WHEN** the dump has no remaining rows after include/limit
- **THEN** the widget MUST render a “No coding data” card, MUST write
  the card, and MUST NOT skip

#### Scenario: No flattened coding Action inputs
- **WHEN** this change lands
- **THEN** the Action MUST NOT declare `plugin_wakatime_coding_range` or
  any `plugin_wakatime_coding_*` input
