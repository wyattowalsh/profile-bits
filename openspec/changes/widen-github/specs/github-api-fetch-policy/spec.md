## MODIFIED Requirements

### Requirement: GraphQL nodes ids language bytes
Language bytes MUST be loaded via GraphQL `nodes(ids:)` in batches of 100 using the REST-ordered ids. Each batch MUST request `languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color id } } pageInfo { hasNextPage endCursor } }`. When a repository languages connection has `pageInfo.hasNextPage` true, the system MUST paginate that connection with GraphQL (`after` cursor, same `first: 10` page size) until complete. Follow-up pages MUST use GraphQL and MAY query only the repository node ids that still have `hasNextPage`. Follow-up pagination MUST NOT replace the batched `nodes(ids:)` first page and MUST NOT call REST `/repos/{owner}/{repo}/languages`. The system MUST NEVER issue 500 per-repo GraphQL calls as the initial language load. The system MUST NOT paginate `repositories(first: 100)` as a second independent 500. Language bytes MUST come from those GraphQL sizes, not REST `repo.language` counts. Cached language nodes MUST keep `color` and `id` alongside `name` and size.

#### Scenario: GraphQL nodes ids batches of 100
- **WHEN** language bytes are fetched
- **THEN** the system MUST call GraphQL `nodes(ids:)` in batches of 100 with `languages(first: 10, orderBy: { field: SIZE, direction: DESC })` and MUST NOT issue one GraphQL call per repository as the initial language load

#### Scenario: Independent repositories pagination is forbidden
- **WHEN** language bytes are fetched
- **THEN** the system MUST NOT paginate GraphQL `repositories(first: 100)` as a second independent 500-repository list

#### Scenario: Language nodes keep color and id
- **WHEN** language bytes are fetched
- **THEN** each cached language node MUST include `name`, size, `color`, and `id`

#### Scenario: GraphQL languages paginate after first 10
- **WHEN** a repository languages connection has more than 10 languages
- **THEN** the system MUST paginate that GraphQL connection after `first: 10` and MUST NOT call REST `/repos/{owner}/{repo}/languages`

### Requirement: contributionsCollection only with capability
A separate `contributionsCollection` GraphQL query MUST run if and only if `canContributions` is true. When `canContributions` is false, that query MUST be omitted. Contributions MUST NOT be rendered as `0` when the query is omitted. When the query runs, the cached payload MUST dump `contributionCalendar.totalContributions` and calendar `weeks` (each week's `contributionDays` including `date`, `contributionCount`, and `weekday`). Missing capability MUST omit those fields and MUST NOT invent `0`.

#### Scenario: contributionsCollection only with capability
- **WHEN** `canContributions` is true
- **THEN** the system MUST issue a separate `contributionsCollection` query; when `canContributions` is false that query MUST be omitted

#### Scenario: Calendar weeks dump when capable
- **WHEN** `canContributions` is true
- **THEN** the cached payload MUST dump `contributionCalendar.totalContributions` and calendar `weeks`

#### Scenario: Missing contributions capability omits calendar
- **WHEN** `canContributions` is false
- **THEN** the dump MUST omit calendar weeks and MUST NOT invent `0` for contributions
