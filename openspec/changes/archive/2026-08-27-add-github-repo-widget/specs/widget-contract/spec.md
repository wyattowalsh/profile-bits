## ADDED Requirements

### Requirement: Frozen repo widget options
Widget `repo` MUST use integration `github` only. Options MUST be: `filename` (default `repo`); required `repo` (`owner/name`); `include` list of `stars`, `forks`, `watchers`, `issues`, `license`, `language` (default `stars`, `forks`, `issues`, `license`; min 1 unique token; duplicates MUST be removed while preserving first-seen order); `avatar` bool default true; `animate` bool default false. Yaml MUST NOT accept `url`, `headers`, `bits`, `include_private`, `include_forks`, or `include_archived` on `repo`. Missing `repo` or a value that is not `owner/name` MUST fail parse. Unknown include tokens MUST fail parse. Empty `include` MUST fail parse. Extra keys MUST fail parse.

The widget MUST bind to exactly one Takumi template. Card size MUST be 480×160. Default format MUST be svg (baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject`). Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. The template MUST render a Primer GitHub REST card (owner/name header, optional avatar, Chip wrapping Stat for included counts/strings). The widget MUST NOT use http `chips` split-Chip chrome, MUST NOT expand shieldcn or shields URLs, and MUST NOT wrap http badge payloads. The widget MUST consume a cached single-repo payload and MUST NOT perform HTTP itself. A load helper in the widget folder MAY map the cached payload; the template MUST have fetch none. `animate` MUST be plumbed; gif/apng motion for `repo` is not required. A skipped `repo` widget MUST NOT write files (inherited skip-without-write).

Playground preview for `repo` MUST use fixtures (or an App token) and MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: Repo defaults
- **WHEN** `repo` is enabled with `repo: owner/name` and no other option overrides
- **THEN** `filename` MUST be `repo`, `include` MUST be `stars`, `forks`, `issues`, `license`, `avatar` MUST be true, `animate` MUST be false, the card MUST be 480×160 svg, and the widget MUST NOT perform HTTP

#### Scenario: required repo owner/name
- **WHEN** yaml omits `repo` or sets a value without `/`
- **THEN** parse MUST fail

#### Scenario: include min and unknown tokens
- **WHEN** yaml `include` is empty, contains an unknown token, or contains duplicates
- **THEN** empty or unknown MUST fail parse and duplicates MUST be dropped preserving first-seen order

#### Scenario: repo url headers bits fail parse
- **WHEN** yaml `widgets.repo` includes `url`, `headers`, `bits`, `include_private`, `include_forks`, or `include_archived`
- **THEN** parse MUST fail

#### Scenario: repo is distinct from chips
- **WHEN** widget `repo` renders
- **THEN** the card MUST be a Primer 480×160 GitHub REST card and MUST NOT be an http pack badge row

#### Scenario: playground preview is not an embed API
- **WHEN** the docs playground previews widget `repo`
- **THEN** it MUST use fixtures or an App token, MUST go through `POST /api/preview`, and MUST NOT document or cache that route as a public embed API

### Requirement: repo empty card and fetch none
Empty or unusable payload after a successful fetch (missing `full_name`) MUST render a “No repo data” card and MUST NOT crash. HTTP 200 with zero `stars`, `forks`, `watchers`, or `issues` MUST render those zeros when those tokens are included. Null `license` MUST omit the license chip. Null `language` MUST omit the language chip. `watchers` MUST use REST `subscribers_count` (actual watchers), not `watchers_count` (stargazers alias). `language` MUST be the REST repo object `language` string only. The template MUST NOT call `fetch`. Tests MUST assert zero live network and MUST spy `globalThis.fetch` unused on the template. A 404 for the configured repository MUST fail the widget and MUST NOT write files. A skipped `repo` widget MUST NOT write files.

#### Scenario: empty payload renders No repo data
- **WHEN** the single-repo GET succeeds and the payload has no usable `full_name`
- **THEN** the widget MUST render a “No repo data” card and MUST NOT crash

#### Scenario: zeros render for included counts
- **WHEN** the payload has zero stars, forks, watchers, or open issues and those tokens are included
- **THEN** the widget MUST render those zeros

#### Scenario: null license omits that chip
- **WHEN** `include` contains `license` and the payload `license` is null
- **THEN** the widget MUST omit the license chip and MUST NOT invent a license string

#### Scenario: null language omits that chip
- **WHEN** `include` contains `language` and the payload `language` is null
- **THEN** the widget MUST omit the language chip and MUST NOT call REST `/languages`

#### Scenario: template performs no HTTP
- **WHEN** the repo template renders
- **THEN** it MUST NOT call `fetch` and MUST consume an already-fetched repo record

#### Scenario: 404 repo fails widget without write
- **WHEN** GitHub returns HTTP 404 for `GET /repos/{owner}/{repo}`
- **THEN** the widget MUST fail and MUST NOT skip or write output

#### Scenario: skipped repo does not write
- **WHEN** the repo widget is skipped per inherited skip-without-write policy
- **THEN** the Action MUST NOT write or overwrite that widget’s output file and MUST NOT treat it as `data-changed`
