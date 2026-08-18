# GitHub fetch (crawl, cache, skip/fail)

Load when `{{id}}` is `github` or when a client might call GitHub. Non-github integrations omit live crawl/language bytes but MUST still refuse REST `/languages` if they can hit GitHub.

Tests: mocked HTTP only. Fixture user `octocat`. No live GitHub.

## Cache (run-scoped, shared)

| Kind | Key | Forbidden |
| --- | --- | --- |
| REST | `(method, url, params)` | Keying on URL alone when query params differ |
| GraphQL | `(query, variables)` | Keying on `POST /graphql` alone |

Stats and languages MUST share one run-scoped cache and the same ordered repository id list.

## Crawl

1. Identity probe once (see [auth](auth.md)).
2. REST `GET /users/{login}`.
3. Paginated `GET /users/{login}/repos?type=owner&per_page=100`. When `include_private` and `canPrivate` and probe login equals `user`, use authenticated `GET /user/repos?type=owner&per_page=100`.
4. **Filter** forks and archived first (unless the widget options include them).
5. **Then cap 500** remaining. Cap-before-filter is forbidden.
6. Stars and language bytes use that ordered id list.
7. Language bytes: GraphQL `nodes(ids:)` in batches of **100** with

   `languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }`

8. Separate 1-point `contributionsCollection` **iff** `canContributions`; omit otherwise. Log `rateLimit.cost` on every GraphQL response.

Every REST/GraphQL request MUST include `Authorization`.

## Forbidden

- REST `/languages` (`GET /repos/{owner}/{repo}/languages`)
- One GraphQL call per repository (500 per-repo)
- Paginating `repositories(first: 100)` as a second independent 500
- Unauthenticated requests
- Mid-pagination REST `/repos` failure that still returns a partial star total — stats **and** languages fail together

## Skip / fail matrix

Fail-after-backoff retries with backoff then fails the **run** (not skip-widget).

| Condition | Outcome |
| --- | --- |
| Empty / `""` / whitespace Action token | `fail_job` |
| HTTP 401 | `fail_run` |
| HTTP 403 secondary/abuse | `fail_after_backoff` |
| HTTP 429 | `fail_after_backoff` |
| GraphQL HTTP 200 + `errors[]` and/or remaining 0 | `fail_after_backoff` |
| HTTP 404 configured user | `fail_widget` |
| HTTP 200 zeros for allowed public fields | `render` those zeros only; never invent `0` for skipped contributions |
| `gist` without `canGist` | `fail_run` |
| `gist` with non-`svg` format | `fail_run` |
| Every github widget skipped and `allow_skipped` false | `fail_job` |
| Widget skipped | no write, not `data-changed` |

Classify via core `classifyGithubHttp` / `decideIncludePrivate` / `decideContributionsField`. Do not reimplement in the integration.
