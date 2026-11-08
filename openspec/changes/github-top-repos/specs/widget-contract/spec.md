## ADDED Requirements

### Requirement: Frozen top-repos widget options
Widget `top-repos` MUST use integration `github` only. Options MUST be:
`filename` (default `top-repos`); `limit` integer 1–16 default 8;
`animate` bool default false. Yaml MUST NOT accept `url`, `headers`,
`bits`, `include_private`, `include_forks`, `include_archived`, or `repo`
on `top-repos`. Unknown keys MUST fail parse. Empty `limit` below 1 or
above 16 MUST fail parse.

The widget MUST bind to exactly one Takumi template. Card size MUST be
480×160. Default format MUST be svg (baked still: no `<style>`,
`@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to
`bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The
template MUST render a ranked owner-crawl list (name plus stars meta)
using pack bits, including `List`. The widget MUST NOT use http `chips`
split-Chip chrome and MUST NOT wrap http badge payloads. The widget MUST
consume the cached github owner-crawl dump and MUST NOT perform HTTP
itself. A load helper in the widget folder MAY map the cached payload;
the template MUST have fetch none. `animate` MUST be plumbed; gif/apng
motion for `top-repos` is not required. A skipped `top-repos` widget
MUST NOT write files (inherited skip-without-write).

`top-repos` MUST be opt-in on pack `github` like `demo` and `repo` and
MUST NOT become a pack default. Playground preview for `top-repos` MUST
use fixtures (or an App token) and MUST NOT treat `POST /api/preview` as
a public embed API.

#### Scenario: Top-repos defaults
- **WHEN** `top-repos` is enabled with no option overrides
- **THEN** `filename` MUST be `top-repos`, `limit` MUST be 8, `animate`
  MUST be false, the card MUST be 480×160 svg, and the widget MUST NOT
  perform HTTP

#### Scenario: limit bounds
- **WHEN** yaml `limit` is 0, 17, or a non-integer
- **THEN** parse MUST fail

#### Scenario: top-repos url headers bits fail parse
- **WHEN** yaml `widgets.top-repos` includes `url`, `headers`, `bits`,
  `include_private`, `include_forks`, `include_archived`, or `repo`
- **THEN** parse MUST fail

#### Scenario: widget declares github only
- **WHEN** widget `top-repos` is registered
- **THEN** it MUST declare integration `github` only and MUST NOT be a
  new plugin id

#### Scenario: pack defaults omit top-repos
- **WHEN** the github plugin is enabled with no widget list
- **THEN** the enabled widgets MUST be `stats` and `languages` and
  `top-repos` MUST remain disabled until explicitly enabled

#### Scenario: playground preview is not an embed API
- **WHEN** the docs playground previews widget `top-repos`
- **THEN** it MUST use fixtures or an App token, MUST go through
  `POST /api/preview`, and MUST NOT document or cache that route as a
  public embed API

### Requirement: top-repos ranks the owner-crawl dump
Widget `top-repos` MUST select from the cached github dump
`repositories` list (owner crawl stars/forks already fetched). It MUST
rank rows by stars descending, then forks descending, then title, and
MUST apply `limit` widget-side. Ranking and `limit` MUST NOT drop
repository fields at fetch. The widget MUST NOT call GitHub, MUST NOT
call REST `/repos/{owner}/{repo}/languages`, and MUST NOT invent a
second crawl. Extra dump keys MUST NOT fail widget parse. HTTP 200 with
zero stars or forks MUST still rank and render those zeros when the row
is included.

#### Scenario: Ranks owner crawl by stars then forks
- **WHEN** the cached dump includes owner repositories with stars and
  forks
- **THEN** the card MUST list them by stars descending, then forks
  descending, then title, sliced to `limit`

#### Scenario: limit stays widget-side
- **WHEN** yaml `limit` is 1 and the dump has more than one repository
- **THEN** the widget MUST render one row and MUST NOT refetch or shrink
  the cached crawl

#### Scenario: Extra dump keys do not fail parse
- **WHEN** the cached dump includes fields the current card does not
  render
- **THEN** widget `top-repos` MUST still parse and MUST NOT fail because
  extra keys are present

#### Scenario: zeros render for included counts
- **WHEN** a dump repository has zero stars
- **THEN** the widget MUST still include that row when it ranks inside
  `limit` and MUST render `0`

#### Scenario: template performs no HTTP
- **WHEN** the top-repos template renders
- **THEN** it MUST NOT call `fetch` and MUST consume the already-fetched
  owner-crawl dump

### Requirement: top-repos empty card and fetch none
Empty or unusable owner-crawl payload after a successful fetch (no
named repositories) MUST render a “No repositories” card and MUST NOT
crash. The template MUST NOT call `fetch`. Tests MUST assert zero live
network and MUST spy `globalThis.fetch` unused on the template. A
skipped `top-repos` widget MUST NOT write files.

#### Scenario: empty payload renders No repositories
- **WHEN** the owner-crawl dump has no usable repository names
- **THEN** the widget MUST render a “No repositories” card and MUST NOT
  crash

#### Scenario: skipped top-repos does not write
- **WHEN** the top-repos widget is skipped per inherited
  skip-without-write policy
- **THEN** the Action MUST NOT write or overwrite that widget’s output
  file and MUST NOT treat it as `data-changed`
