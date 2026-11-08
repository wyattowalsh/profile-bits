## 1. OpenSpec artifacts (W2-G-01)

- [x] 1.1 Exclusive: `openspec/changes/widen-github/proposal.md`. Cached github payload is the fetched REST/GraphQL JSON dump. Widgets select. Never REST `/languages`. Cap 500. Do not rewrite `docs-full-catalog-playground`.
- [x] 1.2 Exclusive: `openspec/changes/widen-github/design.md`. Spec-only this node; W2-G-02+ own `packages/integrations/src/github/**`. Paginate languages after `first: 10`. Calendar weeks iff `canContributions`.
- [x] 1.3 Exclusive: `specs/integration-contract/spec.md`. MODIFIED crawl/GraphQL dump; ADDED dump fields (`name`, `bio`, `avatar_url`, `created_at`, repo `html_url`/`description`/`language`/`topics`); empty token `fail_job`; no `author-integration add` github/wakatime/rss/http; no `plugin_*_*_*`.
- [x] 1.4 Exclusive: `specs/github-api-fetch-policy/spec.md`. MODIFIED language nodes keep `color`/`id` and paginate after `first: 10`; contributions dump calendar weeks iff capable.
- [x] 1.5 Exclusive: `specs/widget-contract/spec.md`. ADDED github widgets select from the dump; extra keys MUST NOT fail parse; `POST /api/preview` is not an embed API.
- [x] 1.6 `pnpm exec openspec validate --strict --type change widen-github`. Do not archive. Do not edit `openspec/specs/**`.

## 2. Tests (W2-G-01)

- [x] 2.1 Exclusive: `scripts/widen-github.test.ts`. Assert dump fields, widgets select, never REST `/languages`, cap 500, empty token `fail_job`, no flatten, no live dest add, and `docs-full-catalog-playground` stays in place.

## 3. Later apply — payload types (W2-G-02)

- [x] 3.1 Exclusive: promote parsed cache into typed github payload (`user`/`repos`/`repo`/`languages`/`calendar`). Keep language `color`/`id`. Do not `author-integration add github`.

## 4. Later apply — extra endpoints (W2-G-03)

- [x] 4.1 Optional authenticated extra endpoints (pinned, public events). Probe stays capability-only. Missing scopes omit fields and MUST NOT invent `0`. Empty token `fail_job`. Never REST `/languages`.

## 5. Later apply — fixtures (W2-G-04)

- [x] 5.1 Exclusive: github fixtures include dump fields from `GET /users/{login}` and owner-repo pages. Existing crawl tests still forbid REST `/languages` and unauth.

## 6. Later apply — widget readers (W2-G-05)

- [x] 6.1 Exclusive: github widgets select from the dump; no HTTP in widgets. Frozen option schemas stay. Extra dump keys MUST NOT fail parse.

## 7. Later apply — dump tests (W2-G-06)

- [x] 7.1 Github dump tests plus crawl lock tests. Widget tests still pass with extra payload keys present. Do not commit. Do not tag `v1` at `main`.
