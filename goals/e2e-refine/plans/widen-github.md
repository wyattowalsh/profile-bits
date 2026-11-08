# Workstream: widen-github

Wave 2. OpenSpec change of its own. Extend live `packages/integrations/src/github/client.ts` — do **not** `author-integration add github`.

## Files

- `packages/integrations/src/github/{client,rest,graphql,cache}.ts`
- `openspec/specs/integration-contract/spec.md` (delta via new change)
- github widget readers under `packages/plugins/src/github/widgets/**`

## Steps

1. OpenSpec: cached typed payload is the already-fetched REST/GraphQL JSON (user, owner repos, repo GET, language nodes, contributions calendar when capable). Widgets select fields.
2. Promote parsed cache into the typed model. Keep language `color`/`id`; paginate GraphQL languages after `first: 10`. Dump calendar weeks when `canContributions`.
3. Extra authenticated endpoints may be added (pinned, public events). Probe stays capability-only. Missing scopes omit fields, never invent `0`.
4. Locks: Authorization always; empty token `fail_job`; never REST `/languages`; filter forks/archived then cap 500; GraphQL `nodes(ids:)` batches of 100.
5. Widgets keep reading the cache; no HTTP in widgets.

## Verify

- Tests that payload types include dropped-today fields from `GET /users/{login}` (name, bio, avatar_url, created_at) and repo list (html_url, description, language, topics)
- Existing crawl tests still forbid REST `/languages` and unauth
- Widget tests still pass with extra payload keys present

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W2-G-01 | G0 | — |
| W2-G-02 | G1 | G-01 |
| W2-G-03 | G2 | G-02 |
| W2-G-04 | G2 | G-02 |
| W2-G-05 | G3 | G-03, G-04 |
| W2-G-06 | G4 | G-05 |
