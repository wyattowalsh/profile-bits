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
inputs, mocked HTTP) still applies to **new** data sources. Live types already
include wakatime, rss, and http packs. Thin Action names: read
`ActionInputsSchema` (includes optional `wakatime_token`, `http_token_env`);
never invent `plugin_*_*_*`.

Read the live constants. Completing `github` / `wakatime` / `rss` / `http`
means write `packages/plugins/src/<id>/` for that existing id — not a second
directory and not a silent enum append.

A second **new** pack id is an OpenSpec change (`plugin-contract` and related
yaml shape) **plus** a types change. Never append to `FIRST_PARTY_PLUGIN_IDS`
inside this skill as a silent catalog add.

`wakatime` is already a first-party pack in live types. Refuse a **second**
wakatime pack. Completing the existing `wakatime` pack is allowed.

## Pack-level `bitsUsed`

Export `{{PLUGIN_ID}}Plugin` and `{{PLUGIN_ID_UPPER}}_BITS_USED`. Union widget
bit names into that pack array. `PluginIdentitySchema` has no `bitsUsed`; live
packs use `PluginIdentity & { bitsUsed }`. Do not edit `packages/core`. Do not
put `bitsUsed` on a widget entry. Do not put bits in yaml.

`docsPath: "{{DOCS_PATH}}"`. Do not hardcode `/generate/<id>/`. Live examples
differ (`wakatime`, `rss`, `/playground/http`).

## Completing github (existing id)

When the pack id is already `github` (typed hole or existing dir):

- Widgets: `demo`, `stats`, `languages`
- Derived union: `["github", "static"]`
- Defaults: `stats`, `languages`
- `demo` stays opt-in (playground smoke / explicit yaml)
- `docsPath`: `"{{DOCS_PATH}}"` (live github uses `"github"`)

Do not change github pack defaults when scaffolding a **different** pack.
Do not assume `packages/plugins/src/github/` exists until inventory says so.

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

New pack using **github + static**: union must include both existing
integration ids. If a widget needs an integration that is not in
`FIRST_PARTY_INTEGRATION_IDS`, run `author-integration` first (dest
`packages/integrations/src/<id>/`). github **is** already in
`packages/integrations/src/index.ts`.

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

Allowed inputs: read `ActionInputsSchema`. Includes optional `wakatime_token`
and `http_token_env` (no defaults). Do not invent names.

**Forbidden:** `plugin_<plugin>_<widget>_<option>` including
`plugin_github_stats_include`, `plugin_github_widgets` CSV, and
`plugin_github_filename_*`. `plugin_github` (pack bool) is allowed. There is
no `plugin_wakatime` / `plugin_rss` / `plugin_http` bool.

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
`packages/plugins/src/<id>/index.ts`  
`packages/plugins/src/<id>/plugin.test.ts`
