# Locks (catalog, yaml, OpenSpec)

Load from `author-integration` when classifying a new id or a public-API change. Do not load unless needed.

## Catalog

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

Read the live constants. Do not paste a frozen github-only table into new work.
`INTEGRATION_AUTH` is live in `types.ts`; today’s snapshot is copied in
[auth](auth.md). Do not bump that copy as law when packs are added.

A plugin is a **pack** (1..N widgets, 0..N integrations), not a single card and
not a single API. Adding a widget or an integration MUST NOT require a new
plugin when an existing pack already owns that card.

WakaTime-class (or any additional API) is a **new integration** when the id is
not in `FIRST_PARTY_INTEGRATION_IDS`. Overwrite gate: if dest `client.ts`
exists, **stop** — do not overwrite any live dest. Do not append ids to
`FIRST_PARTY_PLUGIN_IDS` from this skill. Do not create a second pack for an
id already in live `FIRST_PARTY_PLUGIN_IDS`.

## Dest

This skill writes only under repo-root `packages/integrations/src/<id>/` from
templates (client, auth, scopes, inputs, `client.test.ts`) and only when dest
is empty or new. complete-existing: if dest `client.ts` exists, STOP; do not clobber any live dest.
Never omit `src/` under `packages/integrations/`.
Refuse dest paths that use `../`. Templates MUST NOT contain `../`.
Do not add `index.ts.template`. Barrel
`packages/integrations/src/index.ts` is mention-only; github **is** already
re-exported there. Do not emit `mcp.json`.

## Yaml and Action

- Config SSOT: `.github/profile-bits.yml` with `additionalProperties: false`.
- Yaml present beats `plugin_github`. `plugin_github: true` applies github pack defaults only when the config file is absent.
- Root `action.yml` is **thin**. Allowed inputs: read `ActionInputsSchema`
  only. Do not invent names. Do not enumerate extra `plugin_<id>` pack bools
  as a closed forbid-list — the schema is the allow-list.
- **Never** generate `plugin_<plugin>_<widget>_<option>` (including
  `plugin_github_stats_include`).
- Do not invent Action input names.

## OpenSpec first

Public API includes: **new** integration id in the enum, new yaml keys, new
Action inputs, skip/fail behavior, GitHub crawl contract. Completing an id
already listed does not expand the enum.

1. Propose an OpenSpec change (engine JSON is a **subcommand** flag: `pnpm exec openspec status --change <id> --json` — never `openspec --json`).
2. Apply / implement against that change.
3. Tell the user to run `just generate-action` and `just generate-docs` when codegen or docs fields change.
4. Fail closed on stale codegen. Do not silently expand `IntegrationIdSchema`.

Existing `static` / `github` contracts live in `openspec/specs/integration-contract/spec.md`. Do not MODIFIED-delta that spec from this skill unless the user is executing a separate OpenSpec change.

## Codegen and ownership

- Widgets consume cached payloads and MUST NOT add HTTP (`author-widget`).
- Pack registry / `docsPath` / pack-level `bitsUsed` / derived integration union (`author-plugin`).
- Do not write `packages/core/**`, `apps/**`, `openspec/**`, `action.yml`, `justfile`, or harness skill copies.
- Refuse MCP / `mcp.json`.
