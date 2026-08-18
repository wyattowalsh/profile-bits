---
name: author-integration
description: >-
  Generates a profile-bits data-source integration (client, auth, scopes,
  inputs, mocked HTTP) into packages/integrations/src/{id}/. Completing an
  existing FIRST_PARTY_INTEGRATION_IDS id is allowed; a new id needs OpenSpec
  first. Use when adding a WakaTime-class API, GitHub client, REST/GraphQL,
  auth, scopes, or cache keys. NOT for widgets (author-widget), packs
  (author-plugin), a second pack for an existing plugin id, silent catalog
  append, live GitHub, REST /languages, flattened plugin_*_*_* inputs, or
  unauthenticated GitHub.
license: MIT
compatibility: Requires the profile-bits repo; OpenSpec plugin-contract, widget-contract, integration-contract, and author-plugin specs; packages/core/src/types.ts.
metadata:
  author: profile-bits
  version: "0.1.0"
---

# author-integration

Scaffold a reusable **integration** (data source), not a widget and not a pack.
Copy templates into `packages/integrations/src/<id>/`. Load references on
demand — do not load all at once.

Catalog SSOT is `packages/core/src/types.ts`: `FIRST_PARTY_PLUGIN_IDS`,
`FIRST_PARTY_WIDGET_IDS`, `FIRST_PARTY_INTEGRATION_IDS`, `WIDGET_INTEGRATIONS`,
`INTEGRATION_AUTH`, `ActionInputsSchema`. Do not hardcode github-only.
Completing an id already in those lists is allowed. Adding a new id requires
OpenSpec first. Do not create a second pack for an id already in
`FIRST_PARTY_PLUGIN_IDS`. WakaTime-class **architecture** (client, auth, scopes,
inputs, mocked HTTP) still applies to **new** data sources. Live types already
include wakatime, rss, and http packs. Thin Action names: read
`ActionInputsSchema` (includes optional `wakatime_token`, `http_token_env`);
never invent `plugin_*_*_*`.

Read first (repo-root, not skill-local): `openspec/specs/integration-contract/spec.md`,
`packages/core/src/types.ts`, `packages/integrations/AGENTS.md`.

## Dispatch

| `$ARGUMENTS` | Mode |
| --- | --- |
| *(empty)* / `help` | Empty-args gallery — no writes |
| `add` / `create` / `scaffold` `[id]` | Generate `packages/integrations/src/<id>/` from templates |
| `github` / `fetch-policy` | GitHub crawl locks + implement existing `github` id |
| `wakatime` / new API / data source | Integration only — complete existing id or OpenSpec for a new id |
| widget / card / `languages` option | Stop — route to `author-widget` |
| new pack / new plugin / first-party id | Stop — route to `author-plugin` |
| Natural language about HTTP/auth/cache | Auto-detect (below) |

### Auto-detect

1. New data source, WakaTime-class API, GitHub client, REST/GraphQL, auth, scopes, cache keys → **this skill**.
2. New card / widget option on an existing pack → **`author-widget`**.
3. New pack / extra first-party plugin id → **`author-plugin`**.
4. Completing `wakatime` / `rss` / `http` / `github` / `static` already in `FIRST_PARTY_INTEGRATION_IDS` stays here. Do not create a second pack for those plugin ids.

### Empty args

When `$ARGUMENTS` is empty, print this gallery: modes above, destination table,
critical rules 1–12, reference index. Do not copy templates, do not invent an
integration id, do not mutate the repo, do not inventory the next product add
(that is `author` ideate).

## Canonical vocabulary

Use these exactly:

| Term | Meaning |
| --- | --- |
| integration | Reusable data source (`id`, auth, `scopes[]`, inputs, client) |
| plugin / pack | 1..N widgets + 0..N integrations. Live ids: read `FIRST_PARTY_PLUGIN_IDS` |
| widget | Card that **consumes** a cached integration payload (no HTTP) |
| shared client | One client instance per Action / playground / generate run |
| `static` | Auth `none`; fixtures; never GitHub |
| `github` | Token-class + capability; Action token required; never unauth |
| WakaTime-class | Client / auth / scopes / inputs / mocked HTTP shape for **new** data sources |
| filter-then-cap | Filter forks/archived **then** cap 500 (never cap-then-filter) |
| OpenSpec first | New integration id / yaml / Action input → delta before code |

## Critical rules

1. Catalog SSOT is `packages/core/src/types.ts`. Completing an id already in `FIRST_PARTY_INTEGRATION_IDS` is allowed. Do not silently append `FIRST_PARTY_*`. A new id needs OpenSpec first.
2. Do not create a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS` (`github`, `wakatime`, `rss`, `http` in live types). Pack work is `author-plugin`.
3. Dest is `packages/integrations/src/<id>/` (client, auth, scopes, inputs, `client.test.ts`). Never omit `src/` under `packages/integrations/`.
4. `static` auth = `none`. `github` = token required in the Action. Never unauthenticated GitHub (60/h/IP). Empty / `""` / whitespace token **fails the Action** (`fail_job`) before any request.
5. Auth is per integration **and** per widget option (`include_private` without `canPrivate` fails that widget). Types may list github as `optional`; that MUST NOT mean unauthenticated.
6. One shared client per run. Widgets do not construct extra HTTP clients.
7. REST cache key = `(method, url, params)`. GraphQL cache key = `(query, variables)` — never `POST /graphql` alone.
8. Never REST `/languages` (`GET /repos/{owner}/{repo}/languages`). Never 500 per-repo GraphQL calls.
9. GitHub crawl: REST `GET /users/{login}` + paginated `/repos?type=owner&per_page=100`. **Filter forks/archived then cap 500.** Stars and language bytes share that ordered id list. GraphQL `nodes(ids:)` batches of **100**.
10. Never invent flattened `plugin_<plugin>_<widget>_<option>` Action inputs. Config SSOT is `.github/profile-bits.yml` (`additionalProperties: false`). Thin Action only — read `ActionInputsSchema` (optional `wakatime_token`, `http_token_env`).
11. Tests: mocked HTTP only. No live GitHub, WakaTime, or network.
12. Copy from `assets/templates/*.template`. Templates MUST NOT contain `../`. Do not add `index.ts.template`. Barrel re-exports in `packages/integrations/src/index.ts` are mention-only (github **is** already in that barrel). After public schema/codegen impact: tell the user to run `just generate-action` and `just generate-docs`.

## Workflow

1. **Classify.** Data source → continue. Widget → `author-widget`. Pack → `author-plugin`. Empty args → gallery and stop.
2. **OpenSpec gate.** New id, yaml keys, or Action surface → propose/apply an OpenSpec change first. Completing an existing `FIRST_PARTY_INTEGRATION_IDS` id does not append the enum. Existing `static` / `github` implementation follows `openspec/specs/integration-contract/spec.md`.
3. **Read contracts.** `packages/core/src/types.ts` (`FIRST_PARTY_INTEGRATION_IDS`, `INTEGRATION_AUTH`, `TOKEN_CLASSES`). Reuse core `auth-policy` — do not fork a second skip/fail matrix.
4. **Substitute placeholders** in templates: `{{id}}` kebab, `{{Id}}` Pascal, `{{ID}}` CONSTANT, `{{auth}}` = `none` \| `optional` \| `required`.
5. **Copy** templates to destinations below (strip `.template`). Do not write live package source except at those destinations. Do not hand-edit a second skills tree.
6. **Specialize.** `github`: load [github-fetch](references/github-fetch.md). Other ids: keep cache/auth/shared-client; omit GitHub REST crawl and language `nodes(ids:)`; keep the REST `/languages` guard if the client might call GitHub.
7. **Tests.** Fill `client.test.ts` with mocked `fetch`. Cover empty token, shared client, cache keys, and (github-class) filter-then-cap + batches of 100.
8. **Stop at the integration boundary.** Do not add widgets, packs, or Action inputs. Point the user at `just generate-action` / `just generate-docs` when codegen is affected.

## Destinations

Repo-root paths (replace `<id>`). Skill templates live under `assets/templates/` with a `.template` suffix so Biome does not parse placeholders.

| Template | Destination |
| --- | --- |
| `assets/templates/client.ts.template` | `packages/integrations/src/<id>/client.ts` |
| `assets/templates/auth.ts.template` | `packages/integrations/src/<id>/auth.ts` |
| `assets/templates/scopes.ts.template` | `packages/integrations/src/<id>/scopes.ts` |
| `assets/templates/inputs.ts.template` | `packages/integrations/src/<id>/inputs.ts` |
| `assets/templates/client.test.ts.template` | `packages/integrations/src/<id>/client.test.ts` |

Do not emit `plugin.json`, widgets, packs, `action.yml`, `index.ts`, or files under `packages/core/**` / `apps/**` / `openspec/**` from this skill. Barrel re-exports in `packages/integrations/src/index.ts` are out of template scope — mention them; do not invent `../` imports. github is already re-exported from that barrel.

## Placeholders

| Token | Example (`wakatime`) |
| --- | --- |
| `{{id}}` | `wakatime` |
| `{{Id}}` | `WakaTime` |
| `{{ID}}` | `WAKATIME` |
| `{{auth}}` | `required` (WakaTime-class); `none` (static); github Action still requires a token |

After copy, set `{{ID}}_GRAPHQL_URL` (exported from `client.ts`) to the provider endpoint (`https://api.github.com/graphql` for github).

## Reference index

Do not load all at once.

| File | Load when |
| --- | --- |
| [locks](references/locks.md) | Catalog, yaml SSOT, OpenSpec, flattened-input ban |
| [auth](references/auth.md) | Token classes, static/github/required, per-widget options |
| [github-fetch](references/github-fetch.md) | Crawl, cache keys, skip/fail, `nodes(ids:)` |

## WakaTime-class (canonical)

Prompt like "add a WakaTime integration":

- Integration id `wakatime` is already in `FIRST_PARTY_INTEGRATION_IDS`. Complete it at `packages/integrations/src/wakatime/`. Do not create a second pack or a second integration directory.
- Auth `required` (API key as run secret — not a flattened Action input). Thin Action already has optional `wakatime_token`.
- Mocked HTTP tests in `packages/integrations/src/wakatime/client.test.ts`.
- OpenSpec first only before adding an id that is **not** already in the enum.
- **Do not** create a second `packages/plugins/src/wakatime` pack. **Do not** silently append `FIRST_PARTY_PLUGIN_IDS`. **Do not** invent `plugin_wakatime_*` inputs.

New data sources that are not yet in `FIRST_PARTY_INTEGRATION_IDS` still use this client/auth/scopes/inputs/mocked-HTTP shape after OpenSpec.

## Examples

**Empty:** `/author-integration` → gallery only.

**WakaTime:** `/author-integration add wakatime` → complete existing id at `packages/integrations/src/wakatime/`, mocked HTTP, no second pack.

**Refuse second pack:** "Add another first-party WakaTime plugin pack" → refuse duplicate id; offer complete existing pack (`author-plugin`) or existing integration dest.

**Refuse widget:** "Add a languages option" → `author-widget` (OpenSpec for yaml; no flattened Action input).

## Proof

From the plugin root:

```bash
bash scripts/validate.sh
pnpm dlx skills-ref validate skills/author-integration
```
