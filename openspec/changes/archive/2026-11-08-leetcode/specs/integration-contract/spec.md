## ADDED Requirements

### Requirement: LeetCode fetch is GraphQL POST with auth none
Integration `leetcode` MUST fetch by `POST https://leetcode.com/graphql` with a JSON body `{ query, variables }`. Catalog auth MUST be `none`. Every GraphQL request MUST omit `Authorization` and MUST NOT send `{ Authorization: "" }`. The client MUST NOT send Bearer, Basic, or a query-key secret. There MUST NOT be a `leetcode_token` Action input. Username MUST travel in GraphQL `variables` (not interpolated into the URL). GraphQL cache key MUST be `(query, variables)` and MUST NOT be `POST /graphql` alone. Secrets MUST NEVER persist in the dump, logs, or cache keys. Wave 2 MUST NOT run `author-integration add` for `github`, `wakatime`, `rss`, or `http`. This change MUST NOT add flattened `plugin_<plugin>_<widget>_<option>` Action inputs. Pack agents MUST NOT edit `packages/core/src/types.ts`.

#### Scenario: GraphQL POST to leetcode.com
- **WHEN** the leetcode integration loads a payload
- **THEN** it MUST `POST https://leetcode.com/graphql` with JSON `{ query, variables }` and MUST NOT use integration `http` or GitHub GraphQL

#### Scenario: Auth none sends no Authorization
- **WHEN** a leetcode GraphQL request is sent
- **THEN** the request MUST NOT include an `Authorization` header and MUST NOT send `{ Authorization: "" }`

#### Scenario: Username is a GraphQL variable
- **WHEN** yaml `plugins.leetcode.user` or Action `user` names a LeetCode username
- **THEN** that value MUST be a GraphQL variable and MUST NOT be interpolated into the GraphQL URL

#### Scenario: GraphQL cache key is query and variables
- **WHEN** a leetcode GraphQL request is cached
- **THEN** the cache key MUST be `(query, variables)` and MUST NOT be `POST /graphql` alone

#### Scenario: No leetcode_token or flatten
- **WHEN** this change lands
- **THEN** the system MUST NOT add `leetcode_token`, MUST NOT add a `plugin_leetcode` bool, and MUST NOT add `plugin_<plugin>_<widget>_<option>` Action inputs

#### Scenario: Wave 2 does not author-integration add live dests
- **WHEN** wave 2 extends github, wakatime, rss, or http
- **THEN** it MUST NOT run `author-integration add` for those ids

#### Scenario: Pack agents do not edit types.ts
- **WHEN** a Wave 3 leetcode pack agent runs
- **THEN** it MUST NOT edit `packages/core/src/types.ts`

### Requirement: LeetCode cached payload is the complete public GraphQL dump
The leetcode cached typed payload MUST be a dump of public GraphQL JSON, not a leftover widget slice. Widgets MUST select fields from that dump. Include/limit filters MUST stay widget-side and MUST NOT drop dump fields at fetch.

The dump MUST include complete fields from these public operations when the GraphQL JSON returns them:

- public profile (`matchedUser` / `userPublicProfile`): `username`; profile `ranking`, `userAvatar`, `realName`, `aboutMe`, `school`, `websites`, `countryName`, `company`, `jobTitle`, `skillTags`, `reputation`, `solutionCount`; `allQuestionsCount` `{ difficulty, count }`; `submitStatsGlobal.acSubmissionNum` `{ difficulty, count, submissions }`; `problemsSolvedBeatsStats` `{ difficulty, percentage }`
- contest ranking (`userContestRanking` / `userContestRankingHistory`): `attendedContestsCount`, `rating`, `globalRanking`, `totalParticipants`, `topPercentage`, `badge.name`; history `attended`, `problemsSolved`, `rating`, `ranking`, `contest.title`, `contest.startTime`
- submission calendar (`userProfileCalendar` / `userCalendar`): `activeYears`, `streak`, `totalActiveDays`, `submissionCalendar`
- recent AC (`recentAcSubmissionList`): `id`, `title`, `titleSlug`, `timestamp`

Missing GraphQL fields MUST be omitted and MUST NOT be invented as `0`. Docs and playground MUST default to fixtures.

#### Scenario: Dump keeps public profile fields
- **WHEN** GraphQL returns `matchedUser` profile, `allQuestionsCount`, and `submitStatsGlobal`
- **THEN** the cached payload MUST include those complete fields and MUST NOT drop them because widget `solved` renders a slice

#### Scenario: Dump keeps contest ranking
- **WHEN** GraphQL returns `userContestRanking` and `userContestRankingHistory`
- **THEN** the cached payload MUST include those complete fields

#### Scenario: Dump keeps submission calendar
- **WHEN** GraphQL returns `userCalendar.submissionCalendar`
- **THEN** the cached payload MUST include `activeYears`, `streak`, `totalActiveDays`, and `submissionCalendar`

#### Scenario: Dump keeps recent AC
- **WHEN** GraphQL returns `recentAcSubmissionList`
- **THEN** the cached payload MUST include `id`, `title`, `titleSlug`, and `timestamp` for each item

#### Scenario: Missing fields are omitted not invented
- **WHEN** a public GraphQL field is absent
- **THEN** the dump MUST omit it and MUST NOT invent `0`

### Requirement: LeetCode Cloudflare 403 is fail_widget not fail_job
HTTP 403 or a Cloudflare challenge on the leetcode GraphQL POST MUST `fail_widget` and MUST NOT `fail_job`. That outcome MUST NOT use GitHub `fail_after_backoff`. Other enabled widgets in the same run MUST still render. HTTP 404 or GraphQL HTTP 200 with a missing `matchedUser` MUST `fail_widget`. Empty / `""` / whitespace username when pack `leetcode` is on MUST `fail_widget` and MUST NOT send. When pack `leetcode` is absent, a missing username MUST NOT fail the job. Playground and docs preview MUST use fixtures or skip live leetcode fetches and MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: GraphQL 403 fails the widget not the job
- **WHEN** `POST https://leetcode.com/graphql` returns HTTP 403 or a Cloudflare challenge
- **THEN** the outcome MUST be `fail_widget` and MUST NOT be `fail_job`

#### Scenario: Cloudflare 403 is not GitHub fail_after_backoff
- **WHEN** leetcode GraphQL is blocked with HTTP 403
- **THEN** the client MUST NOT classify that as GitHub `fail_after_backoff`

#### Scenario: Unknown user fails the widget
- **WHEN** GraphQL returns HTTP 404 or HTTP 200 with a missing `matchedUser`
- **THEN** the outcome MUST be `fail_widget`

#### Scenario: Missing username with pack on fails the widget
- **WHEN** yaml enables pack `leetcode` and the username is empty, `""`, or whitespace
- **THEN** the outcome MUST be `fail_widget` and the client MUST NOT send

#### Scenario: Pack absent does not require a username
- **WHEN** yaml omits `plugins.leetcode`
- **THEN** a missing LeetCode username MUST NOT fail the job

#### Scenario: Playground is not an embed API
- **WHEN** the docs playground previews a leetcode widget
- **THEN** it MUST use fixtures or skip live and MUST NOT treat `POST /api/preview` as a public embed API

### Requirement: HTML scrape is SSRF fallback only
HTML scrape of a LeetCode public profile MUST run only after GraphQL is blocked (HTTP 403 / Cloudflare). The fallback MUST be `https` GET through the existing html-scrape SSRF gates (manual redirects, DNS pin, 1 MiB, no private IPs, no GitHub-owned hosts). Extracted fields MUST map into the same typed dump. HTML scrape MUST NOT be the primary fetch when GraphQL succeeds. Login walls, ToS-hostile/challenge pages, and scrape failures MUST `fail_widget`. Path segments MUST use `encodeURIComponent` on the username. The fallback MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: Scrape is not the primary path
- **WHEN** GraphQL POST succeeds
- **THEN** the client MUST NOT HTML-scrape the profile for that dump

#### Scenario: Scrape runs only after GraphQL is blocked
- **WHEN** leetcode GraphQL returns HTTP 403 or a Cloudflare challenge
- **THEN** the client MAY GET the public profile HTML through html-scrape SSRF and MUST NOT fetch HTML first

#### Scenario: Scrape uses existing SSRF gates
- **WHEN** the HTML fallback runs
- **THEN** it MUST use the existing html-scrape SSRF gates and MUST be `https` GET

#### Scenario: Scrape maps into the same dump
- **WHEN** HTML scrape succeeds after GraphQL is blocked
- **THEN** extracted fields MUST map into the same typed leetcode dump

#### Scenario: Scrape failure still fails the widget
- **WHEN** the HTML fallback hits a login wall, ToS-hostile page, or SSRF denial
- **THEN** the outcome MUST be `fail_widget` and MUST NOT be `fail_job`

### Requirement: LeetCode must not use community proxies or Playwright
The leetcode integration MUST call `leetcode.com` directly. It MUST NOT use a community proxy, third-party LeetCode API, or CORS relay. Playwright MUST NOT enter the Action runtime or the leetcode fetch path. Node HTML parsing through html-scrape is the only allowed scrape implementation.

#### Scenario: No community proxy
- **WHEN** leetcode data is fetched
- **THEN** the client MUST NOT call a community proxy and MUST POST GraphQL to `leetcode.com` (HTML scrape SSRF fallback only)

#### Scenario: No Playwright in the Action
- **WHEN** leetcode fetch or HTML fallback runs
- **THEN** it MUST NOT use Playwright and Playwright MUST NOT enter the Action runtime
