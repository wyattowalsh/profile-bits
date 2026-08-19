# Pack authoring locks

Load from SKILL.md when scaffolding a pack. Do not treat this file as a
second SSOT — OpenSpec specs and `packages/core/src/types.ts` win.

## Catalog

Catalog SSOT is `packages/core/src/types.ts`: `FIRST_PARTY_PLUGIN_IDS`,
`FIRST_PARTY_WIDGET_IDS`, `FIRST_PARTY_INTEGRATION_IDS`, `WIDGET_INTEGRATIONS`,
`INTEGRATION_AUTH`, `ActionInputsSchema`. Do not hardcode github-only.
Completing an id already in those lists is allowed. Adding a new id requires
OpenSpec first. Do not create a second pack for an id already in
`FIRST_PARTY_PLUGIN_IDS`. WakaTime-class **architecture** (client, auth, scopes,
inputs, mocked HTTP) still applies to **new** data sources. Read live
`FIRST_PARTY_*` from `types.ts` — do not hardcode a closed pack table.
Thin Action names: read `ActionInputsSchema`; never invent `plugin_*_*_*`.

Read the live constants. Completing an id already in
`FIRST_PARTY_PLUGIN_IDS` means write `packages/plugins/src/<id>/` for that
existing id — not a second directory and not a silent enum append.

MUST NOT rewrite `plugin-contract`, `widget-contract`, or `integration-contract`.
A second **new** pack id is an OpenSpec change (`author-plugin`) **plus** a
types change. Never append to `FIRST_PARTY_PLUGIN_IDS` inside this skill as
a silent catalog add. Completing an existing catalog id is allowed.

Refuse a **second** pack for any id already in live
`FIRST_PARTY_PLUGIN_IDS`. Completing that existing pack is allowed.

## Pack-level `bitsUsed`

Export `{{PLUGIN_ID}}Plugin` and `{{PLUGIN_ID_UPPER}}_BITS_USED`. Union widget
bit names into that pack array (add-only). `PluginIdentitySchema` has no
`bitsUsed`; live packs use `PluginIdentity & { bitsUsed }`. Do not edit
`packages/core`. Do not put `bitsUsed` on a widget entry. Do not put bits in
yaml.

Starter `{{PLUGIN_ID_UPPER}}_BITS_USED` is the six layout names `Theme`,
`Frame`, `Stack`, `Row`, `Text`, `Muted` **for new packs only**. Keep the
comment “plus Stat, Bar, Chip, Avatar, Divider when the template imports
them.” Do **not** stamp the frozen 11 names into the pack starter. Live
packs are subsets of the frozen 11. MDX omits Avatar. Do not copy the
six-name starter over an existing pack.

Frozen 11 names (membership allow-list, **not** the starter): `Theme`,
`Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`,
`Divider`.

When unioning `bitsUsed`, update `plugin.test.ts`. Keep
`toEqual({{PLUGIN_ID_UPPER}}_BITS_USED)`. Do not leave a hardcoded `Theme`,
`Frame`, `Stack`, `Row`, `Text`, `Muted` literal array. Assert every entry
is in the frozen 11.

`docsPath: "{{DOCS_PATH}}"`. Do not hardcode `/generate/<id>/`. Live packs
may differ; read them from disk.

## Completing an existing pack

When the pack id is already in `FIRST_PARTY_PLUGIN_IDS` (typed hole or
existing dir):

- Read live `types.ts` and inventory `packages/plugins/src/<id>/`.
- Widgets, derived union, and defaults come from live `WIDGET_INTEGRATIONS`
  plus the pack’s files — not a closed skill table.
- `docsPath`: `"{{DOCS_PATH}}"` for new writes; do not rewrite an inventoried
  live docsPath.
- If the live pack has widget-entry `bitsUsed` and no pack-level `bitsUsed`,
  pack-level `{{PLUGIN_ID_UPPER}}_BITS_USED` on `<id>Plugin` = unique union of
  that pack’s widget-entry `bitsUsed` arrays. Widget-entry `bitsUsed` does
  not close the pack-level hole. Keep any existing widget registry export
  (`<id>WidgetRegistry`). Do **not** copy the six-name starter over the
  existing pack. `openspec=no`. No fifth skill / no `author-bit`.

Do not change another live pack’s defaults when scaffolding a **different**
pack. Do not assume `packages/plugins/src/<id>/` exists until inventory says
so.

Complete-existing: inventory live files; extend, do not overwrite; keep any
existing widget registry export; attach pack-level `bitsUsed` as that
widget-entry union when pack-level is missing; do not shrink any live
pack-level `{{ID}}_BITS_USED`.

## Derived integration union

```text
union = sort(unique(integrations of each listed widget))
plugin.integrations === union
```

Fail closed when:

- a listed widget has no integrations array
- a listed widget declares zero integrations
- `plugin.integrations` includes an id no listed widget consumes
- `plugin.integrations` omits an id a listed widget declares

New pack using **existing** integration ids from
`FIRST_PARTY_INTEGRATION_IDS`: union must include every named id. If a
widget needs an integration that is not in `FIRST_PARTY_INTEGRATION_IDS`,
run `author-integration` first (dest `packages/integrations/src/<id>/`).
Read the live integrations barrel; do not assume a closed id set.

## Yaml SSOT

`.github/profile-bits.yml` parse uses `additionalProperties: false`
(`ConfigSchema` is `z.strictObject`). Unknown keys and unknown stats
`include` tokens fail parse.

Yaml present **beats** `plugin_github`. `plugin_github: true` applies
github pack defaults only when the config file is absent.

Tokens, `user`, `output_action`, `dry_run`, `allow_skipped`, `committer_*`,
`output_condition`, and `config` path stay in thin `action.yml`, not in the
yaml document.

Bits (`Theme`, `Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`,
`Chip`, `Avatar`, `Divider`) are not yaml keys.

## Thin action.yml

Allowed inputs: read `ActionInputsSchema`. Do not invent names.

**Forbidden:** `plugin_<plugin>_<widget>_<option>` including
`plugin_github_stats_include`, `plugin_github_widgets` CSV, and
`plugin_github_filename_*`. `plugin_github` (pack bool) is allowed. Do not
invent extra `plugin_<id>` pack bools.

## Codegen fail-closed

- Do not hand-edit generated `action.yml`.
- After OpenSpec+types+pack registry: tell the user `just generate-action`
  and `just generate-docs`.
- `just generate-action --check` must fail on flattened names or stale
  `action.yml`. If it fails, regenerate — do not patch.

## Template containment

Skill-relative paths only (`assets/templates/*.template`). No `../` in
template paths. Destinations are repo-root paths in SKILL.md:

`packages/plugins/src/<id>/plugin.ts`  
`packages/plugins/src/<id>/plugin.test.ts`

Refuse dest `../` including `../packages/plugins/...`. Dest is repo-root
`packages/plugins/src/<id>/`. No per-pack `index.ts`. No `index.ts.template`.
Refuse MCP / `mcp.json`. Do not emit `mcp.json`.
