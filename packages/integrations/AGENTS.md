# @profile-bits/integrations

Reusable data sources. v0: **`static`** (auth `none`, fixtures) and **`github`** (token-class + capability; never unauth).

One client instance per Action/playground run, shared by every widget that needs it.

## Cache

- REST key: `(method, url, params)`
- GraphQL key: `(query, variables)` — not `POST /graphql` alone

## GitHub crawl

- Never send a request without `Authorization`. Empty token does not mean unauthenticated 60/h.
- REST: `GET /users/{login}` + paginated `/repos?type=owner&per_page=100`. **Filter** forks/archived **then cap 500** remaining. Stars and language bytes share that ordered id list.
- **Never** REST `/languages`. **Never** 500 per-repo GraphQL calls.
- Languages: GraphQL `nodes(ids:)` batches of 100. Separate cheap `contributionsCollection` iff `canContributions`.
- GraphQL HTTP 200 + `errors[]` / remaining 0 = **fail-after-backoff** (not skip-widget). Secondary/abuse 403 = fail-after-backoff. Mid-pagination REST failure fails stats+languages together.
