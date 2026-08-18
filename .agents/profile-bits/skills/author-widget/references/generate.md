# Generate destinations

Copy from this skill's `assets/templates/` only. Template paths must not
contain `../`. Destinations below are **repo-root** paths (documented here,
not as skill-relative links).

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

When this skill **runs** for a user request, copy into:

```text
packages/plugins/src/{{PACK_ID}}/widgets/{{WIDGET_ID}}/
  schema.ts
  fetch.ts
  widget.tsx          # or widget.md | widget.mdx | widget.html — exactly one
  styles.css          # optional; from stylesheet.css.template
  animation.css       # optional; from keyframes.css.template (gif/apng)
packages/plugins/src/{{PACK_ID}}/plugin.ts
  # union bit names into {{PACK_ID_UPPER}}_BITS_USED on {{PACK_ID}}Plugin
```

Do not assume a given pack dir exists. If `FIRST_PARTY_PLUGIN_IDS` lists an id
but `packages/plugins/src/<pack>/` is missing, that is a typed hole:
`author-plugin` first, then this skill. When the pack dir exists, union bits
into that pack's `{{PACK_ID_UPPER}}_BITS_USED` on `{{PACK_ID}}Plugin`. Do not
claim `packages/plugins/src/github/` exists; complete typed holes when that
pack dir is missing.

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
`{{WIDGET_TITLE}}`, `{{INTEGRATION_ID}}`, `{{INTEGRATION_PASCAL}}`.

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
  bitsUsed: {{PACK_ID_UPPER}}_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof {{PACK_ID_UPPER}}_BITS_USED };
```

List only bits the template composes. Docs `/generate/widgets` and
`/generate/bits` read this pack array. Do not set `bitsUsed` on a widget
registry entry. Do not duplicate it in `packages/core` (`widget-bits.ts` is
forbidden). Do not put bits in yaml. `PluginIdentitySchema` has no
`bitsUsed` — do not edit `packages/core`.

Frozen 11 names: `Theme`, `Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`,
`Bar`, `Chip`, `Avatar`, `Divider`. `Avatar` stays in that list even when a
pack's `bitsUsed` omits it.

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

## OpenSpec-first checklist

A new first-party widget id or a new option (including a languages option)
touches public API:

1. OpenSpec change (do not silently edit `openspec/specs/` by hand).
2. Align `packages/core/src/types.ts` (`FIRST_PARTY_WIDGET_IDS`, option
   schemas). This skill does not invent Action input names.
3. Copy templates into the widget dir **when that pack dir exists**.
4. Union `bitsUsed` into `{{PACK_ID_UPPER}}_BITS_USED` on `{{PACK_ID}}Plugin`.
5. Tell the user to run `just generate-action` and `just generate-docs`.
6. `just generate-action --check` must reject flattened
   `plugin_<plugin>_<widget>_<option>` inputs.

Completing a widget id already in `FIRST_PARTY_WIDGET_IDS` does not append
the enum. Completing a pack id already in `FIRST_PARTY_PLUGIN_IDS` does not
create a second pack.

## Fail closed

- Two canonical `widget.*` files without `source`.
- Explicit `source` that does not match bytes.
- HTTP inside `fetch.ts` (`fetch(`, octokit, REST `/languages`).
- Import of `takumi-js` / `@takumi-rs/*` / `react-dom` / `@radix-ui/*`.
- `useEffect`, portals, `"use client"`.
- Stacking exclusive md family members (pretty-code + starry-night).
- Kroki/plantuml.com without `md.allow_network`.
- Playwright in the Action mermaid path.
- New first-party pack id, or a second pack for an existing id, from this skill.
- `bitsUsed` on a widget entry instead of the pack-level union.
