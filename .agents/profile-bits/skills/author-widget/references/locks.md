# Widget authoring locks

Load after dispatch and before copying templates. These locks also apply when
this skill is invoked via the `author` router.

Repo contract files (prose paths from the profile-bits repo root):

- `openspec/specs/plugin-contract/spec.md`
- `openspec/specs/widget-contract/spec.md`
- `openspec/specs/integration-contract/spec.md`
- `packages/core/src/types.ts`
- `openspec/specs/author-plugin/spec.md` when present

Do not use parent-relative (`../`) paths from this skill. Do not treat
generated `.cursor/skills/openspec-*` or `.agents/skills/openspec-*` as SSOT.

## Catalog

Catalog SSOT is `packages/core/src/types.ts`: `FIRST_PARTY_PLUGIN_IDS`,
`FIRST_PARTY_WIDGET_IDS`, `FIRST_PARTY_INTEGRATION_IDS`, `WIDGET_INTEGRATIONS`,
`INTEGRATION_AUTH`, `ActionInputsSchema`. Do not hardcode github-only.
Completing an id already in those lists is allowed. Adding a new id requires
OpenSpec first. Do not create a second pack for an id already in
`FIRST_PARTY_PLUGIN_IDS`. WakaTime-class **architecture** (client, auth, scopes,
inputs, mocked HTTP) still applies to **new** data sources. Thin Action names:
read live `packages/core/src/types.ts`; never invent names.

- Plugin = pack: 1..N widgets, 0..N integrations. A new card stays on an
  existing pack unless the user asked for a new pack.
- New data source → `author-integration` (not this skill). Dest:
  `packages/integrations/src/<id>/`.
- New pack → `author-plugin` (not this skill). Completing a typed pack hole
  (id in types, dir missing) is `author-plugin` first.
- Do not add a second pack for an id already in live
  `FIRST_PARTY_PLUGIN_IDS`.
- A **new card that also needs a new API** → `author-integration` first.
  Do not copy widget templates first.
- `add` without a pack id **and** a widget id → **stop**. Do not invent dest.
- Animation / gif / apng is not github-only. Land on a **named** existing
  pack from `FIRST_PARTY_PLUGIN_IDS`. Do not default dest to `github`.

## Destinations

- Dest is repo-root `packages/plugins/src/<pack>/widgets/<id>/`.
- Refuse dest `../`. Templates MUST NOT contain `../`.
- Never copy into `/generate/widgets`, `/generate/bits`, or `apps/docs/**`.
- Complete-existing: **extend** live files. Copy full templates
  (`schema.ts`, `fetch.ts`, `widget.*`) **only** when the widget dir is
  empty or new. Missing optional `animation.css` / `styles.css` may copy
  into a non-empty dir; do not clobber existing files. **Append**
  `widgets[]`. `"{{DOCS_PATH}}"` is for **new packs** only; complete-existing
  leaves inventoried `docsPath` unchanged (read live pack objects).
- Refuse MCP / `mcp.json`.

## Config and Action

- Config SSOT: committed `.github/profile-bits.yml`
  (`additionalProperties: false`). Unknown yaml keys and unknown `include`
  tokens fail parse.
- Yaml present beats `plugin_github`. `plugin_github: true` applies github pack
  defaults only when the config file is absent.
- Root `action.yml` is **thin**. Never invent names. Never generate
  `plugin_<plugin>_<widget>_<option>` (including `plugin_github_stats_include`,
  `plugin_github_languages_*`, `plugin_github_widgets` CSV,
  `plugin_github_filename_*`).
- Allowed Action inputs: read live `ActionInputsSchema`. Do not invent names.
- Empty / `""` / whitespace `github_token` fails the Action. Omitted token
  uses `${{ github.token }}`.
- Action commits widget files under `output_dir` only. It does not patch
  consumer `README.md`.

## Bits and Takumi

Bits (composition metadata, **not** yaml keys): `Theme`, `Frame`, `Stack`,
`Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`, `Divider`. Widgets
compose bits. Union used names into pack-level `{{PACK_ID_UPPER}}_BITS_USED`
on `{{PACK_ID}}Plugin`. Not a widget-entry field.

- Takumi **2.9.2** via `@profile-bits/renderer` only. Do not import
  `takumi-js` / `@takumi-rs/*` from widgets or the Action.
- Card **480×160**. Default format `svg`.
- Default SVG is a **baked still**: no `<style>`, `@keyframes`, SMIL, or
  `foreignObject` in `renderSvg()` output. CSS `@keyframes` are authoring
  input to `render` / `renderAnimation`. APNG files are named `.png`.
- Takumi-safe markup: `tw` / `className` / `style` only on `div` /
  `span` / `img`, never on bits. Bits use typed props (`gap`, `size`,
  `weight`, `pct`, `src`). No `react-dom`, `useEffect`, portals,
  Radix/shadcn DOM.
- Replace `{{WIDGET_DESCRIPTION}}` in md/mdx/html templates (subtitle copy;
  MDX `<Muted>`). Do not leave the placeholder in emitted files.

## Fetch (widgets)

- Widgets **must not** perform HTTP. Consume the cached integration payload.
  Never `fetch(`, octokit, or REST `/languages` inside `fetch.ts`.
- One shared integration client per run. Cache keys: REST
  `(method, url, params)`, GraphQL `(query, variables)`.
- Never unauthenticated GitHub (60/h/IP). Empty token fails the Action.
- Never REST `/languages`. Crawl (integration, not widget): REST owner repos,
  **filter forks/archived then cap 500**, GraphQL `nodes(ids:)` batches of 100.
- Generic widget fetch does not read `include_private`. github-class widgets
  add that option via OpenSpec; `include_private` without `canPrivate` fails
  that widget.
- Do not paint contributions `0` when viewer ≠ user or `canContributions` is
  false.
- Empty language data after filters → “No language data” card, not a crash.
- 404 user fails the widget. Partial repo pages fail (not a short star total).

## OpenSpec and codegen

- Public API change → OpenSpec delta first (yaml schema, plugin/widget ids,
  Action inputs, option trees). A **languages option** is yaml schema = delta
  first. Completing an id already in types does not append the enum.
- Fail closed on stale codegen. If generated `action.yml` would contain a
  flattened option input, stop.
- After a public-API or docs-field change, tell the user to run
  `just generate-action` and `just generate-docs` when those recipes exist.
  CI: `just generate-action --check` and `just generate-docs --check`.
- Read registries and `packages/core/src/types.ts`. Do not invent Action
  input names.
- Write from this skill's templates. Do not hand-edit a second skills tree.
