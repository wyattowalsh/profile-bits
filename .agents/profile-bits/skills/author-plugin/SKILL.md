---
name: author-plugin
description: >-
  Scaffolds a profile-bits plugin pack registry (named idPlugin with widgets,
  derived integration union, pack-level bitsUsed, defaults, and docsPath) into
  packages/plugins/src/{id}/. Completing an id already in FIRST_PARTY_PLUGIN_IDS
  is allowed; a new id needs OpenSpec first. Use when adding a pack registry,
  plugin.ts, docsPath, or pack defaults. NOT for a card on an existing pack
  (author-widget), a new data source (author-integration), a second pack for an
  existing id, silent FIRST_PARTY_* append, or flattened plugin_*_*_* Action
  inputs.
license: MIT
compatibility: Requires the profile-bits repo; OpenSpec plugin-contract, widget-contract, integration-contract, and author-plugin specs; packages/core/src/types.ts.
metadata:
  author: profile-bits
  version: "0.1.0"
---

# Author plugin pack

Generate a **plugin pack** (1..N widgets, 0..N integrations). A plugin is not
a single card and not a single API.

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

Read before writing:

- `openspec/specs/plugin-contract/spec.md`
- `openspec/specs/widget-contract/spec.md`
- `openspec/specs/integration-contract/spec.md`
- `openspec/specs/author-plugin/spec.md` when present
- `packages/core/src/types.ts`

Long lock tables: [references/locks.md](references/locks.md) (load on demand).
Do not load all at once.

## Empty args

When `$ARGUMENTS` is empty (or the user only asks how pack authoring works:
`help`, "what does author-plugin do"), print the gallery below. **Do not
write files.** Do not inventory the next product add (that is `author` ideate).

1. Dispatch table
2. Live catalog: read `FIRST_PARTY_PLUGIN_IDS` in `types.ts` (not github-only)
3. Sibling skills: `author` (router + ideate), `author-widget`, `author-integration`
4. Template destinations under `packages/plugins/src/<id>/`
5. Export `{{PLUGIN_ID}}Plugin` + pack-level `{{PLUGIN_ID_UPPER}}_BITS_USED`
6. `docsPath: "{{DOCS_PATH}}"` — do not hardcode `/generate/<id>/`
7. After public API: tell the user to run `just generate-action` and
   `just generate-docs`. Fail closed on stale codegen — never hand-edit
   `action.yml`.

## Dispatch

### Modes

| `$ARGUMENTS` | Mode |
| --- | --- |
| *(empty)* / `help` | Empty-args gallery (no writes) |
| New pack / pack registry / `plugin.ts` / `docsPath` / pack defaults | **Pack** (this skill) |
| Complete existing id in `FIRST_PARTY_PLUGIN_IDS` | **Pack** for that id (no second directory) |
| New card / widget on an **existing** pack | Stop → `author-widget` |
| New data source / client / auth / scopes | Stop → `author-integration` |
| Second pack for `wakatime` / `rss` / `http` / `github` | **Refuse** duplicate id |
| `plugin_<plugin>_<widget>_<option>` Action input | **Refuse** |

### Natural language

Natural language about a new pack, pack registry, or `docsPath` → Pack.
Ambiguous "add GitHub languages option" is a widget/yaml change, not a pack.

## Critical rules

1. Catalog SSOT is `types.ts`. Completing an existing `FIRST_PARTY_PLUGIN_IDS` id is allowed. A new id needs OpenSpec first, then types.ts. Never silent enum append.
2. Do not create a second pack directory for an id already in `FIRST_PARTY_PLUGIN_IDS`.
3. Export `{{PLUGIN_ID}}Plugin` and `{{PLUGIN_ID_UPPER}}_BITS_USED`. `bitsUsed` is pack-level. Do not export a nameless pack const.
4. `docsPath: "{{DOCS_PATH}}"`. Do not hardcode `/generate/<id>/`.
5. `integrations` MUST equal `deriveIntegrationUnion(...)`. Defaults omit `demo`.
6. Destinations: `packages/plugins/src/<id>/{plugin.ts,index.ts,plugin.test.ts}`. Templates MUST NOT contain `../`.
7. Never invent flattened `plugin_*_*_*` Action inputs. Read `ActionInputsSchema` (optional `wakatime_token`, `http_token_env`).
8. `PluginIdentitySchema` has no `bitsUsed`. Use `satisfies PluginIdentity & { bitsUsed: typeof … }`. Do not edit `packages/core`.

## Pack identity

Mirror `PluginIdentitySchema` plus pack-level `bitsUsed`:

| Field | Rule |
| --- | --- |
| `id` | Pack id. Must match `FIRST_PARTY_PLUGIN_IDS` after OpenSpec+types for a **new** id. Completing an existing id is allowed. |
| `title` | Human title. |
| `docsPath` | `"{{DOCS_PATH}}"`. Live packs differ (`wakatime`, `rss`, `/playground/http`). Do not hardcode `/generate/<id>/`. |
| `widgets` | 1..N widget ids owned by this pack. |
| `integrations` | **Derived union** of those widgets' integrations. Never a hand-maintained parallel list. |
| `defaults.widgets` | Enabled when the pack is on with no widget list. **Omit `demo`.** |
| `bitsUsed` | Pack-level `{{PLUGIN_ID_UPPER}}_BITS_USED` on `{{PLUGIN_ID}}Plugin`. author-widget unions names into this array. |

Derived union: unique integration ids from each listed widget, sorted.
Fail if a listed widget has no integrations list. Do not invent an
integration no listed widget consumes. Do not omit one a listed widget
declares.

## Integrations on a pack

A pack **references** existing or new integrations. It does not create
clients. Integration dest (when needed) is `packages/integrations/src/<id>/`.
github **is** already in `packages/integrations/src/index.ts`.

| Integrations needed | Action |
| --- | --- |
| Only existing ids in `FIRST_PARTY_INTEGRATION_IDS` | Pack may proceed; OpenSpec+types only for a **new** pack id |
| Any **new** data source id | `author-integration` **first**, then pack references that id |
| "Second wakatime pack" | Refuse duplicate; complete `packages/plugins/src/wakatime/` instead |

Worked fill for **new pack using github + static**: at least one widget
consumes `github`, at least one consumes `static` (may be the same widget).
`plugin.integrations` must equal `deriveIntegrationUnion(...)` and include
both `github` and `static`. Still OpenSpec+types **before** expanding plugin
ids.

GitHub pack (id already in the enum) fill:

- `WIDGET_INTEGRATIONS`: `demo → static`; `stats` / `languages` → `github`
- `widgets`: `demo`, `stats`, `languages`
- `defaults.widgets`: `stats`, `languages` (`demo` opt-in)
- `integrations`: `["github", "static"]`
- Do not assume `packages/plugins/src/github/` exists; complete that typed hole when missing.

## Templates

Copy from this skill. **No `../` in template paths.** Destination paths are
repo-root, documented here — not inside the template files.

| Skill-relative template | Destination |
| --- | --- |
| `assets/templates/plugin.ts.template` | `packages/plugins/src/<id>/plugin.ts` |
| `assets/templates/index.ts.template` | `packages/plugins/src/<id>/index.ts` |
| `assets/templates/plugin.test.ts.template` | `packages/plugins/src/<id>/plugin.test.ts` |

Replace `{{PLUGIN_ID}}`, `{{PLUGIN_ID_UPPER}}`, `{{PLUGIN_TITLE}}`,
`{{DOCS_PATH}}`, `{{WIDGET_IDS}}`, `{{DEFAULT_WIDGET_IDS}}`,
`{{WIDGET_INTEGRATION_ENTRIES}}`.

Do **not** write live widget sources (`widget.tsx` / `widget.md` / fetch).
That is `author-widget`. Do **not** write `packages/integrations/**`.
Do **not** register a **new** pack in `packages/plugins/src/index.ts` or in
`FIRST_PARTY_PLUGIN_IDS` until OpenSpec+types have widened the catalog.
Completing an existing id does not append the enum.

## Workflow

1. Read OpenSpec + `types.ts`. Classify: existing pack vs new pack id;
   existing vs new integrations; widget vs pack vs integration.
2. Reroute or refuse per the dispatch table.
3. **Public API → OpenSpec first.** New pack id, new widget ids on a new
   pack, or a new yaml `plugins.<id>` key are public API. Propose/apply the
   OpenSpec change, then widen `types.ts`. Do not silently edit the enum.
4. Copy templates into `packages/plugins/src/<id>/`. Keep
   `integrations = deriveIntegrationUnion(...)`. Keep `demo` out of defaults.
   Export `{{PLUGIN_ID}}Plugin` with pack-level `bitsUsed`.
5. Yaml options stay in `.github/profile-bits.yml` with
   `additionalProperties: false`. Yaml present beats `plugin_github`.
   Never add `plugin_<plugin>_<widget>_<option>` inputs. Never flatten
   options into `action.yml`. Root `action.yml` stays **thin**.
6. **Fail closed on stale codegen.** Do not hand-edit generated
   `action.yml`. Tell the user to run:

```bash
just generate-action
just generate-docs
```

   In CI / after edits that must match generated output:
   `just generate-action --check`. If `--check` fails, regenerate — do not
   patch yaml by hand.

## Yaml and Action locks

- Config SSOT: committed `.github/profile-bits.yml`. Unknown keys fail parse.
- Thin Action inputs only — read `ActionInputsSchema` (includes optional
  `wakatime_token`, `http_token_env`). Breaking a thin input is semver major.
- `plugin_github: true` applies github pack defaults **only** when the
  config file is absent. No `plugin_wakatime` / `plugin_rss` / `plugin_http`
  bools.
- Widget options live in yaml and may change without a Marketplace input bump.

## Checklist

- [ ] OpenSpec + `types.ts` read; new catalog ids gated; existing ids not duplicated
- [ ] Not a widget-only or integration-only request
- [ ] Not a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`
- [ ] Templates copied with no `../` paths
- [ ] Export `{{PLUGIN_ID}}Plugin` (not `plugin`) with pack-level `bitsUsed`
- [ ] `docsPath` is `"{{DOCS_PATH}}"`
- [ ] `integrations` is the derived union
- [ ] Defaults omit `demo`
- [ ] No flattened Action inputs; no hand-edited `action.yml`
- [ ] User told to run `just generate-action` and `just generate-docs`

## Reference index

Do not load all at once.

| File | Load when |
| --- | --- |
| [locks](references/locks.md) | Catalog, dest, bitsUsed, yaml, thin Action, template containment |

## Proof

From the plugin root:

```bash
bash scripts/validate.sh
pnpm dlx skills-ref validate skills/author-plugin
```
