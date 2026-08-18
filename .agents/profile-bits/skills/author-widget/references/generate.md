# Generate destinations

Copy from this skill's `assets/templates/` only. Template paths must not
contain `../`. Destinations below are **repo-root** paths (documented here,
not as skill-relative links). Do **not** copy into `apps/docs/**`,
`/generate/widgets`, `/generate/bits`, or any docs playground path.

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

## Classify before copy

Stop before copying templates when:

- The request is a **new card that also needs a new API** (id not in
  `FIRST_PARTY_INTEGRATION_IDS`, or WakaTime-class data source) →
  **`author-integration`**. Do not scaffold the card first.
- `add` without a pack id **and** a widget id → **stop**. Do not invent
  dest (do not default to github).
- Dest uses `../` or `/generate/widgets` → **refuse**. Dest is repo-root
  `packages/plugins/src/{{PACK_ID}}/widgets/{{WIDGET_ID}}/`.
- MCP / `mcp.json` → refuse.

Then apply complete-existing below.

## Complete-existing (no clobber)

Inventory the live pack and widget dirs before writing.

- **Extend** live files. Do not overwrite a complete existing `schema.ts`,
  `fetch.ts`, `widget.*`, `styles.css`, `animation.css`, or `plugin.ts`.
- Copy templates **only** when the widget dir
  `packages/plugins/src/{{PACK_ID}}/widgets/{{WIDGET_ID}}/` is **empty or
  new**. If that dir already has widget sources, edit those files in place.
  Never copy into `/generate/widgets`.
- On the pack registry, **append** the new widget id to `widgets[]`. Do not
  replace the live array. Do not drop existing widget ids.
- Preserve `docsPath: "{{DOCS_PATH}}"`. Do not hardcode `/generate/<id>/`.
  Do not rewrite a live pack's inventoried `docsPath` (github, wakatime,
  rss, and http `/playground/http` stay as inventoried).
- Union bit names into `{{PACK_ID_UPPER}}_BITS_USED` (add-only). Do not
  shrink a live list (including `WAKATIME_BITS_USED`).
- `add` without a pack id **and** a widget id → **stop**. Do not invent
  dest, do not copy templates.

When this skill **runs** for a **new or empty** widget dir, copy into:

```text
packages/plugins/src/{{PACK_ID}}/widgets/{{WIDGET_ID}}/
  schema.ts
  fetch.ts
  widget.tsx          # or widget.md | widget.mdx | widget.html — exactly one
  styles.css          # optional; from stylesheet.css.template
  animation.css       # optional; from keyframes.css.template (gif/apng)
packages/plugins/src/{{PACK_ID}}/plugin.ts
  # append {{WIDGET_ID}} to widgets[]; preserve docsPath: "{{DOCS_PATH}}"
  # union bit names into {{PACK_ID_UPPER}}_BITS_USED on {{PACK_ID}}Plugin
packages/plugins/src/{{PACK_ID}}/plugin.test.ts
  # keep toEqual({{PACK_ID_UPPER}}_BITS_USED); do not hardcode the six-name list
```

Do not assume a given pack dir exists. If `FIRST_PARTY_PLUGIN_IDS` lists an id
but `packages/plugins/src/<pack>/` is missing, that is a typed hole:
`author-plugin` first, then this skill. When the pack dir exists, append the
widget id and union bits on that pack's `{{PACK_ID}}Plugin`. Do not claim
`packages/plugins/src/github/` exists; complete typed holes when that pack
dir is missing.

## Copy map

| Template | Destination filename |
| --- | --- |
| `widget.tsx.template` | `widget.tsx` |
| `widget.md.template` | `widget.md` |
| `widget.mdx.template` | `widget.mdx` |
| `widget.html.template` | `widget.html` |
| `stylesheet.css.template` | `styles.css` (optional) |
| `keyframes.css.template` | `animation.css` (gif/apng) |
| `schema.ts.template` | `schema.ts` |
| `fetch.ts.template` | `fetch.ts` |

Replace placeholders: `{{WIDGET_ID}}` (dir/yaml id), `{{WIDGET_PASCAL}}`
(type prefix, e.g. `languages` → `Languages`), `{{PACK_ID}}`,
`{{PACK_ID_UPPER}}` (for `{{PACK_ID_UPPER}}_BITS_USED`),
`{{WIDGET_TITLE}}`, `{{WIDGET_DESCRIPTION}}` (md/mdx/html subtitle copy;
MDX `<Muted>`), `{{INTEGRATION_ID}}`, `{{INTEGRATION_PASCAL}}`.

`fetch.ts.template` binds a **local**
`{{INTEGRATION_PASCAL}}CachedPayload` type (title, subtitle, avatarUrl,
statLabel, statValue, chip, barPct) and maps that cached payload →
`{{WIDGET_PASCAL}}Payload`. Do not add HTTP. Do not import a missing
payload type from the integration.

## Pack-level `bitsUsed`

Union names this template actually imports into pack-level
`{{PACK_ID_UPPER}}_BITS_USED` on `{{PACK_ID}}Plugin` in
`packages/plugins/src/{{PACK_ID}}/plugin.ts`.

```ts
export const {{PACK_ID_UPPER}}_BITS_USED = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  // plus Stat, Bar, Chip, Avatar, Divider when the template imports them
] as const;

export const {{PACK_ID}}Plugin = {
  // ...
  docsPath: "{{DOCS_PATH}}",
  widgets:  [/* existing ids */, "{{WIDGET_ID}}"],
  bitsUsed: {{PACK_ID_UPPER}}_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof {{PACK_ID_UPPER}}_BITS_USED };
```

Starter is the six layout names. Frozen 11
(`Theme`, `Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`,
`Avatar`, `Divider`) is membership via `BIT_EXPORTS` only — do not stamp
11 names into the starter. List only bits the template composes. Import
bits from `@profile-bits/bits` with typed props (`gap=`, `pct=`,
`Avatar src`). Forbidden: `tw=` on bit tags, `Bar value=`, HTTP in fetch.

Do not set `bitsUsed` on a widget registry entry. Do not duplicate it in
`packages/core` (`widget-bits.ts` is forbidden). Do not put bits in yaml.
`PluginIdentitySchema` has no `bitsUsed` — do not edit `packages/core`.
Do not treat `/generate/widgets` as a copy dest.

Keep that six-name starter. When unioning, update `plugin.test.ts` so it
keeps `toEqual({{PACK_ID_UPPER}}_BITS_USED)` without a hardcoded six-name
Theme, Frame, Stack, Row, Text, Muted array.

`Avatar` stays in the frozen 11 even when a pack's `bitsUsed` omits it.

## Bits props and `tw`

Bits take typed props (`gap`, `size`, `weight`, `pct`, `src`). Never pass
`tw` / `className` / `style` to bits. Use `tw` / `className` only on native
`div` / `span` / `img`. Numeric `gap` / `size` / `weight`. `Avatar` requires
`src: string`. `Bar` requires `pct: number`. `Stat` is the only `value` bit.

## Formats allow-list

Every widget lists formats from `OUTPUT_FORMATS`:

`svg` | `png` | `jpeg` | `webp` | `ico` | `gif` | `apng`

Default `svg`. Required formats include still and animated webp, gif, and
apng. `format: apng` uses a `.png` extension. `gif` / `apng` / animated
`webp` go through `renderAnimation()`. Default SVG remains a baked still.

## Schema / examples

- Zod `strictObject` matching yaml (`additionalProperties: false` at parse).
- Options live in `.github/profile-bits.yml` under
  `plugins.{{PACK_ID}}.widgets.{{WIDGET_ID}}`.
- Include at least one example object (playground / docs tables).
- md/mdx widgets also declare `md.presets` (default `default`) and optional
  `md.families`.
- Theme tokens on bits `Theme`: `bg`, `card`, `text`, `muted`, `accent`,
  `border`, `font`.
- Do not add `include_private` to the generic widget schema. github-class
  widgets add that option via OpenSpec and fail closed on `canPrivate`.

## OpenSpec-first checklist

A new first-party widget id or a new option (including a languages option)
touches public API:

1. OpenSpec change (do not silently edit `openspec/specs/` by hand).
2. Align `packages/core/src/types.ts` (`FIRST_PARTY_WIDGET_IDS`, option
   schemas). This skill does not invent Action input names.
3. Copy templates into the widget dir **only when that dir is empty or
   new** and the pack dir exists.
4. Append `{{WIDGET_ID}}` to pack `widgets[]`. Preserve
   `docsPath: "{{DOCS_PATH}}"`. Union `bitsUsed` into
   `{{PACK_ID_UPPER}}_BITS_USED` on `{{PACK_ID}}Plugin`.
5. Tell the user to run `just generate-action` and `just generate-docs`.
6. `just generate-action --check` must reject flattened
   `plugin_<plugin>_<widget>_<option>` inputs. CI also runs
   `just generate-docs --check`.

Completing a widget id already in `FIRST_PARTY_WIDGET_IDS` does not append
the enum. Completing a pack id already in `FIRST_PARTY_PLUGIN_IDS` does not
create a second pack.

## Fail closed

- `add` without a named pack id and widget id.
- New card that also needs a new API (stop; `author-integration`).
- Two canonical `widget.*` files without `source`.
- Explicit `source` that does not match bytes.
- HTTP inside `fetch.ts` (`fetch(`, octokit, REST `/languages`).
- Generic `fetch.ts` reading `options.include_private` (github-class only,
  via OpenSpec).
- Unauthenticated GitHub (empty / `""` / whitespace token).
- Flattened `plugin_<plugin>_<widget>_<option>` Action inputs.
- MCP / `mcp.json`.
- `tw` / `className` / `style` on bits.
- Import of `takumi-js` / `@takumi-rs/*` / `react-dom` / `@radix-ui/*`.
- `useEffect`, portals, `"use client"`.
- Stacking exclusive md family members (pretty-code + starry-night).
- Kroki/plantuml.com without `md.allow_network`.
- Playwright in the Action mermaid path.
- New first-party pack id, or a second pack for an existing id, from this skill.
- `bitsUsed` on a widget entry instead of the pack-level union.
- Overwriting a complete existing widget dir with templates.
- Replacing live `widgets[]` or rewriting live `docsPath`.
- Copy dest under `/generate/widgets` or `apps/docs/**`.
- Template or dest path containing `../`.
