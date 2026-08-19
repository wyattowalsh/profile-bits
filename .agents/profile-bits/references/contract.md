# Authoring contracts

Read these from the profile-bits repo root. They **exist** (plugin-contract,
widget-contract, integration-contract, and author-plugin are synced). Do not
treat generated OpenSpec skill trees (`.cursor/skills/openspec-*`,
`.agents/skills/openspec-*`) as SSOT.

Canonical plugin SSOT is `.agents/profile-bits/` (`plugin.json`, `skills/`,
`scripts/`, `references/`, `AGENTS.md`). There is no `agent-plugin/`
directory, alias, or copy.

Install is a documented human command, not an agent step in this repo.

```bash
npx skills add ./.agents/profile-bits
```

MUST NOT pass `--all`. MUST NOT pass `-a claude-code` or create `.claude/` /
`.claude/skills`. This repo already commits relative symlinks (git `120000`):
`.agents/skills/author{,-integration,-widget,-plugin}` →
`../profile-bits/skills/<id>`. Agents MUST NOT run `skills add` here (it can
replace `120000` with copies).

## OpenSpec specs

| Layer | Path |
| --- | --- |
| Plugin (pack of widgets + integrations) | `openspec/specs/plugin-contract/spec.md` |
| Widget (one Takumi template + option schema) | `openspec/specs/widget-contract/spec.md` |
| Integration (reusable data source + GitHub fetch policy) | `openspec/specs/integration-contract/spec.md` |
| Authoring plugin (Agent Plugin 1.0.0 + skills) | `openspec/specs/author-plugin/spec.md` |

Read `openspec/specs/author-plugin/spec.md` for Agent Plugin packaging,
skill routing, contained templates, harness projections, evals, and validate.

Four skills: `author` (router + ideate mode), `author-integration`,
`author-widget`, `author-plugin`. No `author-bit`. Empty-args gallery does
not inventory.

## Types

Live catalogs and schemas: `packages/core/src/types.ts`

Catalog SSOT is live `packages/core/src/types.ts` (`FIRST_PARTY_*`,
`WIDGET_INTEGRATIONS`, `INTEGRATION_AUTH`, `ActionInputsSchema`). Completing
an id already in those lists is allowed. Adding a new id requires OpenSpec
first. Do not create a second pack for an id already in
`FIRST_PARTY_PLUGIN_IDS`. Do not invent names or silently append catalog. A
new pack is OpenSpec-first, then types, then skills. Today’s `github` /
`wakatime` / `rss` / `http` is a snapshot — not a frozen table to bump.
WakaTime-class **architecture** (client, auth, scopes, inputs, mocked HTTP)
still applies to **new** data sources. Thin Action names: read
`ActionInputsSchema` (includes optional `wakatime_token`, `http_token_env`);
never invent `plugin_*_*_*`.

Integration dest: `packages/integrations/src/<id>/`. Pack dest:
`packages/plugins/src/<pack>/`. Pack export: `<id>Plugin` with pack-level
`bitsUsed` and `docsPath: "{{DOCS_PATH}}"`. github **is** in
`packages/integrations/src/index.ts`. A typed github **pack** hole (if present)
is `packages/plugins/src/github/`. `packages/bits` may be absent; the frozen
11 names are `Theme`, `Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`,
`Chip`, `Avatar`, `Divider`.

In-flight OpenSpec work lives under `openspec/changes/<id>/`. After archive +
sync, `openspec/specs/` is the contract SSOT.
