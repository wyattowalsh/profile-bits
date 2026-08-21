---
name: author-integration
description: >-
  Generates a profile-bits data-source integration (client, auth, scopes,
  inputs, mocked HTTP) into packages/integrations/src/{id}/. Completing an
  existing FIRST_PARTY_INTEGRATION_IDS id is allowed when dest is empty or new;
  if dest client.ts exists, stop. A new id needs OpenSpec first. Use when
  adding a WakaTime-class API, GitHub client, REST/GraphQL, auth, scopes, or
  cache keys. NOT for shared bits (author-bit), yaml themes or named palettes
  (author-palette), widgets (author-widget), packs (author-plugin), a second
  pack for an existing plugin id, silent catalog append, live GitHub, REST
  /languages, flattened plugin_*_*_* inputs, unauthenticated GitHub, MCP /
  mcp.json, or dest paths that use ../.
license: MIT
compatibility: Requires the profile-bits repo; OpenSpec plugin-contract, widget-contract, integration-contract, and author-plugin specs; packages/core/src/types.ts.
metadata:
  author: profile-bits
  version: "0.1.0"
---

# author-integration

Scaffold a reusable **integration** (data source), not a widget and not a pack.
Copy templates into `packages/integrations/src/<id>/` only when that directory
is empty or new. Load references on demand — do not load all at once.

Catalog SSOT is `packages/core/src/types.ts`: `FIRST_PARTY_PLUGIN_IDS`,
`FIRST_PARTY_WIDGET_IDS`, `FIRST_PARTY_INTEGRATION_IDS`, `WIDGET_INTEGRATIONS`,
`INTEGRATION_AUTH`, `ActionInputsSchema`. Do not hardcode github-only.
Completing an id already in those lists is allowed. Adding a new id requires
OpenSpec first. Do not create a second pack for an id already in
`FIRST_PARTY_PLUGIN_IDS`. WakaTime-class **architecture** (client, auth, scopes,
inputs, mocked HTTP) still applies to **new** data sources. Read live
`FIRST_PARTY_*` from `types.ts`; never invent names. Today’s packs
(`github`, `wakatime`, `rss`, `http`) are a snapshot — not a frozen four-id
table to bump when packs are added. Thin Action names: read
`ActionInputsSchema` (includes optional `wakatime_token`, `http_token_env`);
never invent `plugin_*_*_*`.

## Dispatch

| `$ARGUMENTS` | Mode |
| --- | --- |
| *(empty)* / `help` | Empty-args gallery — no writes |
| `add` / `create` / `scaffold` `[id]` | Generate dest from templates only if dest is empty or new; if `client.ts` exists, **stop** |
| `github` / add github | Implement existing `github` id — overwrite gate: stop if `client.ts` exists |
| `fetch-policy` | GitHub crawl locks only (load [github-fetch](references/github-fetch.md)). Do not copy templates. |
| `wakatime` / new API / data source | Integration only — stop if dest `client.ts` exists; OpenSpec for a new id |
| `Theme` / `Chip` / shared bit | Stop — route to `author-bit` |
| yaml `theme` / named palette / flavor / tokens | Stop — route to `author-palette` |
| widget / card / `languages` option | Stop — route to `author-widget` |
| new pack / new plugin / first-party id | Stop — route to `author-plugin` |
| MCP / `mcp.json` | Refuse. No `mcp.json`. |
| dest `../` / plugin-relative escape | Refuse. Dest is repo-root `packages/integrations/src/<id>/`. |
| Natural language about HTTP/auth/cache | Auto-detect (below) |

### Auto-detect

1. New data source, WakaTime-class API, GitHub client, REST/GraphQL, auth, scopes, cache keys → **this skill**.
2. Shared bit, `Theme` component, or in-card `Chip` → **`author-bit`**.
3. Yaml theme, named flavor, or palette tokens → **`author-palette`**.
4. New card / widget option on an existing pack → **`author-widget`**.
5. New pack / extra first-party plugin id → **`author-plugin`**.
6. Completing an id already in live `FIRST_PARTY_INTEGRATION_IDS` stays here. Do not create a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`. If dest `client.ts` exists, **stop**.
7. MCP / `mcp.json` → refuse. Dest `../` → refuse.

### Empty args

When `$ARGUMENTS` is empty (or `help`), print this gallery and **stop**: modes
above, overwrite gate (stop if dest `client.ts` exists), critical rules 1–13,
reference index **names**. Do not copy templates, do not invent an integration
id, do not mutate the repo, do not inventory the next product add (that is
`author` ideate).

Do **not** Read `openspec/specs/integration-contract/spec.md`,
`packages/core/src/types.ts`, or `packages/integrations/AGENTS.md`. Do **not**
load dest copy-path refs (Destinations table, auth filename copy map, template
paths). Those load on mutating add/scaffold only. Do not weaken the overwrite
gate on mutating paths.

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
2. Do not create a second pack for an id already in live `FIRST_PARTY_PLUGIN_IDS`. Pack work is `author-plugin`.
3. Dest is repo-root `packages/integrations/src/<id>/` (client, auth, scopes, inputs, `client.test.ts`). Never omit `src/` under `packages/integrations/`. Refuse dest paths that use `../`. Templates MUST NOT contain `../`.
4. If dest `client.ts` already exists, **stop**. Do not overwrite complete existing sources. Copy templates only into empty or new directories.
5. `static` auth = `none`. `github` = token required in the Action. Never unauthenticated GitHub (60/h/IP). Empty / `""` / whitespace token **fails the Action** (`fail_job`) before any request.
6. Auth is per integration **and** per widget option (`include_private` without `canPrivate` fails that widget). Types may list github as `optional`; that MUST NOT mean unauthenticated. Read live `INTEGRATION_AUTH`.
7. One shared client per run. Widgets do not construct extra HTTP clients.
8. REST cache key = `(method, url, params)`. GraphQL cache key = `(query, variables)` — never `POST /graphql` alone.
9. Never REST `/languages` (`GET /repos/{owner}/{repo}/languages`). Never 500 per-repo GraphQL calls.
10. GitHub crawl: REST `GET /users/{login}` + paginated `/users/{login}/repos?type=owner&per_page=100`. REST `{login}` path segments MUST use `encodeURIComponent(login)` — do not interpolate raw login. When `include_private` and `canPrivate` and probe login equals `user`, authenticated `GET /user/repos?type=owner&per_page=100` (no login segment). **Filter forks/archived then cap 500.** Stars and language bytes share that ordered id list. GraphQL `nodes(ids:)` batches of **100**.
11. Never invent flattened `plugin_<plugin>_<widget>_<option>` Action inputs. Config SSOT is `.github/profile-bits.yml` (`additionalProperties: false`). Thin Action only — read `ActionInputsSchema` (optional `wakatime_token`, `http_token_env`).
12. Tests: mocked HTTP only. No live GitHub, WakaTime, or network. Refuse MCP / `mcp.json`.
13. Copy from `assets/templates/*.template` using the destination table and the four-file auth scheme→filename map (`auth.none.ts.template` / `auth.github-bearer.ts.template` / `auth.wakatime-basic.ts.template` / `auth.http-optional.ts.template`). There is no default `auth.ts.template`. If `id` is already in live `INTEGRATION_AUTH`, copy that scheme file; else OpenSpec names `{{scheme}}` in `{none, github-bearer, wakatime-basic, http-optional}` and copy that named file. Unknown **scheme** **stops**. Do not interpolate `auth.{{scheme}}.ts.template` as a path. Templates are for **new** ids; do not emit a parallel `auth.ts` onto any live dest from the catalog (any dest with `client.ts`). Do not add `index.ts.template`. Barrel re-exports in `packages/integrations/src/index.ts` are mention-only (github **is** already in that barrel). After public schema/codegen impact: tell the user to run `just generate-action` and `just generate-docs`.

## Workflow

1. **Classify.** Data source → continue. Widget → `author-widget`. Pack → `author-plugin`. MCP → refuse. Dest `../` → refuse. Empty args / `help` → gallery and **stop** (do not Read first; no dest copy-path refs). `fetch-policy` → load [github-fetch](references/github-fetch.md) only; do not copy templates; do not Read first.
2. **OpenSpec gate.** New id, yaml keys, or Action surface → propose/apply an OpenSpec change first. Completing an existing `FIRST_PARTY_INTEGRATION_IDS` id does not append the enum. Existing `static` / `github` implementation follows `openspec/specs/integration-contract/spec.md`.
3. **Read first (mutating add/scaffold only).** Skip for empty-args, help, `fetch-policy`, refuse, and route-away. Then read `openspec/specs/integration-contract/spec.md`, `packages/core/src/types.ts` (`FIRST_PARTY_INTEGRATION_IDS`, `INTEGRATION_AUTH`, `TOKEN_CLASSES`), `packages/integrations/AGENTS.md`. Reuse core `auth-policy` — do not fork a second skip/fail matrix.
4. **Overwrite gate.** If dest `packages/integrations/src/<id>/client.ts` exists, **STOP** (complete-existing; do not clobber any live dest). Copy templates only into empty or new directories. Do not weaken this stop on mutating paths.
5. **Substitute placeholders** in templates: `{{id}}` kebab, `{{Id}}` Pascal, `{{ID}}` CONSTANT, `{{auth}}` = catalog `none` \| `optional` \| `required`, `{{scheme}}` = `none` \| `github-bearer` \| `wakatime-basic` \| `http-optional` (header/fail policy; OpenSpec names it for a new id). Do not interpolate `{{scheme}}` into filenames. After substitute, ids `^[a-z][a-z0-9-]*$` (no `..`, no `/`).
6. **Copy** templates to destinations below (strip `.template`) only after the overwrite gate. Auth: if `id` is already in live `INTEGRATION_AUTH`, copy that scheme file; else OpenSpec names `{{scheme}}` — look it up in the four-row scheme→filename table. Unknown **scheme** stops. A new id whose named scheme is one of the four copies that named file. Do not interpolate `auth.{{scheme}}.ts.template` as a path. Templates are for **new** ids — do not emit a parallel `auth.ts` onto any live dest from the catalog. Do not write live package source except at those destinations. Do not hand-edit a second skills tree.
7. **Specialize.** `github` (new dest only): load [github-fetch](references/github-fetch.md). Other ids: keep cache/auth/shared-client; omit GitHub REST crawl and language `nodes(ids:)`; keep the REST `/languages` guard if the client might call GitHub.
8. **Tests.** Fill `client.test.ts` with mocked `fetch`. Cover empty token, shared client, cache keys, and (github-class) filter-then-cap + batches of 100.
9. **Stop at the integration boundary.** Do not add widgets, packs, or Action inputs. Point the user at `just generate-action` / `just generate-docs` when codegen is affected.

## Destinations

Repo-root paths (replace `<id>`). Skill templates live under `assets/templates/` with a `.template` suffix so Biome does not parse placeholders. Dest MUST NOT use `../`.

| Template | Destination |
| --- | --- |
| `assets/templates/client.ts.template` | `packages/integrations/src/<id>/client.ts` |
| `assets/templates/scopes.ts.template` | `packages/integrations/src/<id>/scopes.ts` |
| `assets/templates/inputs.ts.template` | `packages/integrations/src/<id>/inputs.ts` |
| `assets/templates/client.test.ts.template` | `packages/integrations/src/<id>/client.test.ts` |

### Auth copy map (scheme → filename)

There is **no** default `auth.ts.template`. Skills are a static 1:1 copy table plus in-file `{{placeholders}}` — do not interpolate `auth.{{scheme}}.ts.template` as a path.

Copy **one** scheme file onto `packages/integrations/src/<id>/auth.ts` only when dest is empty or new. If dest `client.ts` exists, **stop**. Completing a live first-party id MUST NOT emit a parallel `auth.ts` onto any live dest from the catalog. Do not infer `github-bearer` from catalog `optional` (github and http are both `optional`).

If `id` is already in live `INTEGRATION_AUTH`, copy that scheme file (see the live id→scheme snapshot in [auth](references/auth.md)). Else OpenSpec names `{{scheme}}` in `{none, github-bearer, wakatime-basic, http-optional}`; copy that named file from the four-file list. Unknown **scheme** **stops**. A new id with a named allowed scheme does **not** stop.

Scheme lookup (new ids after OpenSpec names `{{scheme}}`):

| `{{scheme}}` | Scheme file |
| --- | --- |
| `none` | `assets/templates/auth.none.ts.template` |
| `github-bearer` | `assets/templates/auth.github-bearer.ts.template` |
| `wakatime-basic` | `assets/templates/auth.wakatime-basic.ts.template` |
| `http-optional` | `assets/templates/auth.http-optional.ts.template` |
| any other **scheme** | **stop** |

Shared export names (behavior is per scheme; see [auth](references/auth.md)): `{{ID}}_AUTH`, `is{{Id}}TokenMissing`, `assert{{Id}}ActionToken`, `{{id}}AuthorizationHeader`, `{{id}}RequiresAuthorization`. Header functions return `{}` for none-kind — never `{ Authorization: "" }`.

Do not emit `plugin.json`, `mcp.json`, widgets, packs, `action.yml`, `index.ts`, or files under `packages/core/**` / `apps/**` / `openspec/**` from this skill. Barrel re-exports in `packages/integrations/src/index.ts` are out of template scope — mention them; do not invent `../` imports. github is already re-exported from that barrel.

## Placeholders

| Token | Example (`wakatime`) |
| --- | --- |
| `{{id}}` | `wakatime` |
| `{{Id}}` | `WakaTime` |
| `{{ID}}` | `WAKATIME` |
| `{{auth}}` | Catalog `none` \| `optional` \| `required` from live `INTEGRATION_AUTH`. Example: `required`. Today’s snapshot: `none` = static/rss; github and http are both `optional`. |
| `{{scheme}}` | Header/fail policy: `none` \| `github-bearer` \| `wakatime-basic` \| `http-optional`. Example: `wakatime-basic`. **Not** 1:1 with `{{auth}}`. If `id` is already in live `INTEGRATION_AUTH`, copy that scheme file; else OpenSpec names this. Substitute in-file only (client tests). Look up the named scheme in the four-row scheme→filename table. Do not interpolate `auth.{{scheme}}.ts.template` as a path. Unknown scheme stops. |

After copy, set `{{ID}}_GRAPHQL_URL` (exported from `client.ts`) to the provider endpoint (`https://api.github.com/graphql` for github).

## Reference index

Do not load all at once.

| File | Load when |
| --- | --- |
| [locks](references/locks.md) | Catalog, yaml SSOT, OpenSpec, flattened-input ban, dest `../`, MCP |
| [auth](references/auth.md) | Live `INTEGRATION_AUTH` (id→scheme snapshot of that map), token classes, per-widget options |
| [github-fetch](references/github-fetch.md) | `fetch-policy` crawl, cache keys, skip/fail, `nodes(ids:)` — not the add-github scaffold |

## WakaTime-class (canonical)

Prompt like "add a WakaTime integration":

- Integration id `wakatime` is already in `FIRST_PARTY_INTEGRATION_IDS`. Overwrite gate: any dest with `client.ts` **stops** (including `packages/integrations/src/wakatime/client.ts`). Do not overwrite complete existing sources. Do not create a second pack or a second integration directory. Do not emit a parallel `auth.ts` onto any live dest from the catalog.
- Auth `required` (API key as run secret — not a flattened Action input). Thin Action already has optional `wakatime_token`. `{{scheme}}` is `wakatime-basic`: RFC Basic `base64(api_key + ":")`. Never Bearer. Never `?api_key=`. Do not copy github `decideActionToken` into wakatime auth.
- Mocked HTTP tests stay in the live `packages/integrations/src/wakatime/client.test.ts` — do not overwrite them from templates when `client.ts` exists.
- OpenSpec first only before adding an id that is **not** already in the enum. A new id still needs OpenSpec to name `{{scheme}}`. Unknown **scheme** stops. A new id whose named scheme is one of `{none, github-bearer, wakatime-basic, http-optional}` copies that named file from the four-file list.
- **Do not** create a second `packages/plugins/src/wakatime` pack. **Do not** silently append `FIRST_PARTY_PLUGIN_IDS`. **Do not** invent `plugin_wakatime_*` inputs.

New data sources that are not yet in `FIRST_PARTY_INTEGRATION_IDS` still use this client/auth/scopes/inputs/mocked-HTTP shape after OpenSpec, and only when dest `client.ts` does not exist.

## Examples

**Empty:** `/author-integration` → gallery only. Do not read `types.ts`, `integration-contract`, or `AGENTS.md`. Do not load dest copy-path refs.

**WakaTime:** `/author-integration add wakatime` → **stop** if `packages/integrations/src/wakatime/client.ts` exists; do not overwrite; no second pack; no parallel `auth.ts`.

**GitHub add:** `/author-integration add github` → **stop** if `packages/integrations/src/github/client.ts` exists; do not overwrite.

**Fetch-policy:** `/author-integration fetch-policy` → crawl locks only (`encodeURIComponent(login)` on REST `{login}`, authenticated `GET /user/repos` with no login segment, filter-then-cap, `nodes(ids:)` batches of 100, never REST `/languages`). Do not copy templates.

**Refuse MCP:** "Add an MCP server" → refuse. No `mcp.json`.

**Refuse dest `../`:** dest `../packages/integrations/...` → refuse. Repo-root dest only.

**Refuse second pack:** "Add another first-party WakaTime plugin pack" → refuse duplicate id; offer existing pack (`author-plugin`) or existing integration dest (stop if client exists).

**Refuse widget:** "Add a languages option" → `author-widget` (OpenSpec for yaml; no flattened Action input).

## Proof

From the plugin root:

```bash
bash scripts/validate.sh
pnpm dlx skills-ref@0.1.5 validate skills/author-integration
```
