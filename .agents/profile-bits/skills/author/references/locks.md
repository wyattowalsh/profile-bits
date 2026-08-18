# Shared authoring locks

Load this file after classifying kind and before handing off. These locks apply
to `author-integration`, `author-widget`, and `author-plugin`. Do not load
[next.md](next.md) from here — that file is ideate-only.

Repo contract files (prose paths from the profile-bits repo root):

- `openspec/specs/plugin-contract/spec.md`
- `openspec/specs/widget-contract/spec.md`
- `openspec/specs/integration-contract/spec.md`
- `packages/core/src/types.ts`
- `openspec/specs/author-plugin/spec.md` when present

Do not use parent-relative file paths from this skill. Do not treat generated
`.cursor/skills/openspec-*` or `.agents/skills/openspec-*` as SSOT.

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

Read the live constants. Do not paste a frozen github-only table into new work.

- Plugin = pack: 1..N widgets, 0..N integrations. Adding a widget or
  integration MUST NOT require a new plugin when an existing pack owns it.
- New card → existing pack unless the user asked for a new pack.
- New pack → `author-plugin`, referencing existing or new integrations.
- Integration dest: `packages/integrations/src/<id>/` (never without `src/`).
- Completing `wakatime` / `rss` / `http` / `github` already in types is
  allowed. A second pack for those ids is forbidden.

## Config and Action

- Config SSOT: committed `.github/profile-bits.yml` (`additionalProperties:
  false`). Unknown yaml keys and unknown `include` tokens fail parse.
- Yaml present beats `plugin_github`. `plugin_github: true` applies github pack
  defaults only when the config file is absent.
- Root `action.yml` is **thin**. Never invent names. Never generate
  `plugin_<plugin>_<widget>_<option>` (including `plugin_github_stats_include`,
  `plugin_github_widgets` CSV, `plugin_github_filename_*`).
- Allowed Action inputs: read `ActionInputsSchema` (includes optional
  `wakatime_token`, `http_token_env`).
- Empty / `""` / whitespace `github_token` fails the Action. Omitted token
  uses `${{ github.token }}`.
- Action commits widget files under `output_dir` only. It does not patch
  consumer `README.md`.

## Bits and Takumi

Bits (composition metadata, **not** yaml keys): `Theme`, `Frame`, `Stack`,
`Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`, `Divider`. Widgets
compose bits. `bitsUsed: string[]` lives on the pack registry
(`{{id}}Plugin` / `{{ID}}_BITS_USED`), not a widget entry.

- Takumi **2.9.2** via `@profile-bits/renderer` only. Do not import
  `takumi-js` / `@takumi-rs/*` from widgets or the Action.
- Card **480×160**. Default format `svg`.
- Default SVG is a **baked still**: no `<style>`, `@keyframes`, SMIL, or
  `foreignObject` in output. CSS `@keyframes` are authoring input to
  `render` / `renderAnimation`. APNG files are named `.png`.
- Takumi-safe markup: `div` / `span` / `img` plus `tw` / `style` /
  `className`. No `react-dom`, `useEffect`, portals, Radix/shadcn DOM.

## GitHub fetch

- Never unauthenticated GitHub (60/h/IP). Empty token fails the Action.
- Never REST `/languages`. Crawl: REST owner repos, **filter forks/archived
  then cap 500**, GraphQL `nodes(ids:)` batches of 100.
- `include_private` without `canPrivate` fails that widget.
- Do not paint contributions `0` when viewer ≠ user or `canContributions` is
  false.
- Widgets do not perform HTTP. One shared client per run. Cache keys: REST
  `(method, url, params)`, GraphQL `(query, variables)`.
- github **is** in `packages/integrations/src/index.ts`. Missing-pack holes
  live under `packages/plugins/src/github/`, not the integrations barrel.

## OpenSpec and codegen

- Public API change → OpenSpec delta first (yaml schema, plugin ids, Action
  inputs, widget option trees). Completing an existing id does not append
  the enum.
- Fail closed on stale codegen. If generated `action.yml` would contain a
  flattened option input, stop.
- After a public-API or docs-field change, tell the user to run
  `just generate-action` and `just generate-docs` when those recipes exist.
  CI: `just generate-action --check`.
- Read registries and `packages/core/src/types.ts`. Do not invent Action
  input names.
- Write from the specialized skill's templates. Do not hand-edit a second
  skills tree.
- Pack `docsPath` is `"{{DOCS_PATH}}"`. Do not hardcode `/generate/<id>/`.
