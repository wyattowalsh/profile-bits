---
name: author-widget
description: >-
  Generates a profile-bits widget on an existing pack: option schema, fetch
  that consumes a cached integration payload (no HTTP), optional source (prefer
  omit; name widget.tsx|.md|.mdx|.html), bits-based Takumi-safe template,
  formats allow-list, md.presets/md.families for md/mdx, examples, and pack-level
  bitsUsed unioned into the pack Plugin. Use when adding a card, languages yaml
  option, CSS animation gif/apng, widget.mdx without source, Tailwind
  tw/className stylesheets, or swapping md.families.code. NOT for new data
  sources (author-integration), new packs (author-plugin), Action runtime,
  renderer internals, MCP, Marketplace, flattened plugin_*_*_* inputs, or a
  second pack for an id already in types.ts.
license: MIT
compatibility: Requires the profile-bits repo; OpenSpec plugin-contract, widget-contract, integration-contract, and author-plugin specs; packages/core/src/types.ts.
metadata:
  author: profile-bits
  version: "0.1.0"
---

# Author widget

Generate a **card** on an existing pack. A new widget is not a new plugin.
Write from this skill's templates. Do not hand-edit a second skills tree. Do
not invent Action input names.

Catalog SSOT is `packages/core/src/types.ts`: `FIRST_PARTY_PLUGIN_IDS`,
`FIRST_PARTY_WIDGET_IDS`, `FIRST_PARTY_INTEGRATION_IDS`, `WIDGET_INTEGRATIONS`,
`INTEGRATION_AUTH`, `ActionInputsSchema`. Read those registries every mutating
run. Do not hardcode github-only. Do **not** maintain a closed
widget→integration table in this skill (the collection grows). Resolve pack,
widget, and integration from the live catalog:
`WIDGET_INTEGRATIONS[widgetId]`. Do **not** update this skill when a pack is
added. Completing an id already in those lists is allowed. Adding a new id
requires OpenSpec first. Do not create a second pack for an id already in
`FIRST_PARTY_PLUGIN_IDS`. WakaTime-class **architecture** (client, auth, scopes,
inputs, mocked HTTP) still applies to **new** data sources. Thin Action names:
read live `ActionInputsSchema`; never invent `plugin_*_*_*`.

Load references on demand. Frontmatter is for discovery; references carry
deep procedure. Do not load all at once.

## Dispatch

| `$ARGUMENTS` | Mode |
| --- | --- |
| *(empty)* / `help` | Empty-args gallery |
| `add [id] [pack]` | New card on a **named** existing pack. Missing pack or id → **stop** |
| `option [pack] [widget] [field]` | Add a yaml option (OpenSpec first). Missing pack or widget → **stop** |
| `animation [gif\|apng] [pack] [widget]` | CSS `@keyframes` for `renderAnimation` (named existing pack, not github-only). Missing pack → **stop**. Named one-widget pack → use the sole live widget id; do not invent a new card |
| `mdx [pack] [widget]` | Canonical `widget.mdx`; omit `source`. Missing pack or id → **stop** |
| `stylesheet` / `tailwind` `[pack] [widget]` | Takumi-safe `tw` / `className` only on native `div` / `span` / `img`; typed bit props. Missing pack or id → **stop** |
| `families [family] [member] [pack] [widget]` | Exclusive `md.families` swap. Missing pack or id → **stop** |
| `discover [path]` | `discoverSource` rules (read-only; no dest) |
| New card + new API | Refuse → `author-integration` (do not copy widget templates first) |
| New data source / WakaTime-class | Refuse → `author-integration` |
| New pack / plugin id / second pack | Refuse → `author-plugin` |
| MCP / `mcp.json` | Refuse. No `mcp.json`. |
| dest `../` / `/generate/widgets` | Refuse. Dest is repo-root `packages/plugins/src/<pack>/widgets/<id>/`. |

Natural language uses the same table. Do not invent a mutating default.

### Auto-detect

Write modes (`add`, `option`, `animation`, `mdx`, `stylesheet`, `families`)
need a named pack id **and** widget id. Missing dest → **stop**. Do not
invent dest. Do not default to github.

1. "option" / languages field / yaml schema on an existing widget → **option** (named pack + widget; missing dest → **stop**)
2. `@keyframes` / gif / apng / animation → **animation** (named existing pack; not github-only). Missing pack → **stop**. Named one-widget pack → use the sole live widget id; do not invent a new card
3. `widget.mdx` / "no source" / drop MDX → **mdx** (named pack + widget; missing dest → **stop**)
4. Tailwind / `tw` / `className` / stylesheets → **stylesheet** (named pack + widget; missing dest → **stop**)
5. `md.families` / starry-night / pretty-code / katex / mermaid → **families** (named pack + widget; missing dest → **stop**)
6. "discover" / ambiguous `widget.md` + `widget.tsx` / MIME sniff → **discover** (read-only)
7. New card that also needs a **new API** / WakaTime-class data source → refuse (`author-integration`). Do not copy widget templates first.
8. New card / widget / template on a **named** existing pack (pack id + widget id) → **add**. Missing pack or id → **stop**.
9. New pack / second pack for an existing `FIRST_PARTY_PLUGIN_IDS` id → refuse (`author-plugin`)
10. MCP / `mcp.json` → refuse
11. dest `../` / `/generate/widgets` → refuse

### Empty args

When `$ARGUMENTS` is empty (or the user only asks how widget authoring works:
`help`), show this gallery and **stop**. This path sits **above** Before
generating and **never enters it**.

Do not write files. Do not inventory the next product add (that is `author`
ideate). Do not load [locks](references/locks.md) or
[generate](references/generate.md). Do **not** read
`packages/core/src/types.ts` or the OpenSpec contracts.

1. **add** — new card on a **named** existing pack (missing pack or id → stop; do not assume github-only).
2. **option** — yaml option on an existing widget; OpenSpec delta first.
3. **animation** — `@keyframes` for gif/apng on a named existing pack (not github-only); APNG named `.png`.
4. **mdx** — canonical `widget.mdx`; prefer omit `source`.
5. **stylesheet** — Takumi-safe `tw` / `className` only on `div` / `span` / `img`; typed bit props; bits composition.
6. **families** — exclusive `md.families` swap; do not stack.
7. **discover** — extension → MIME → sniff; mismatch / ambiguous fail.

Gallery items are names only. Mutating modes load locks, generate, and the
catalog after empty args is ruled out.

## Critical rules

1. Cards land on an existing pack id from `FIRST_PARTY_PLUGIN_IDS`. Do not create a second pack for an existing id.
2. If the pack dir `packages/plugins/src/<pack>/` is missing, stop and name `author-plugin` (typed hole). Do not assume `packages/plugins/src/github/` exists.
3. Union composed bit names into pack-level `{{PACK_ID_UPPER}}_BITS_USED` on `{{PACK_ID}}Plugin`. Never a widget-entry `bitsUsed`. Never yaml.
4. Widgets do not HTTP. Consume the cached integration payload. Never REST `/languages`. Never unauthenticated GitHub. Never `fetch(` in `fetch.ts`.
5. Public API (new widget id, yaml option, `FIRST_PARTY_WIDGET_IDS`) → OpenSpec first. Completing an id already in types does not append the enum.
6. Never invent `plugin_<plugin>_<widget>_<option>` Action inputs. Read `ActionInputsSchema` (optional `wakatime_token`, `http_token_env`).
7. Prefer omit `source`. Canonical `widget.tsx` \| `widget.md` \| `widget.mdx` \| `widget.html`. Ambiguous dual canonical files fail.
8. Templates MUST NOT contain `../`. Dest is repo-root `packages/plugins/src/<pack>/widgets/<id>/`. Refuse dest `../` and `/generate/widgets`.
9. Write modes (`add`, `option`, `animation`, `mdx`, `stylesheet`, `families`) without a pack id **and** a widget id → **stop**. Do not invent dest. Animation on a named one-widget pack uses the sole live widget id; do not invent a new card.
10. New card + new API → `author-integration` first. Refuse MCP / `mcp.json`.

## Before generating

Empty args / `help` never enter this section.

1. Read (repo-root prose paths — not skill-relative links):
   - `openspec/specs/plugin-contract/spec.md`
   - `openspec/specs/widget-contract/spec.md`
   - `openspec/specs/integration-contract/spec.md`
   - `packages/core/src/types.ts`
   - `openspec/specs/author-plugin/spec.md` when present
2. Load [locks](references/locks.md).
3. If the request is a **new data source**, or a **new card that also needs
   a new API**, stop and name `author-integration`
   (dest `packages/integrations/src/<id>/`). Do not copy widget templates first.
4. If they **asked for a new pack**, stop and name `author-plugin`.
5. Write modes without a pack id **and** a widget id → **stop**. Animation on
   a named one-widget pack: use the sole live widget id; do not invent a new
   card. MCP / dest `../` / `/generate/widgets` → refuse.
6. Otherwise pick the **named** existing pack from live `FIRST_PARTY_PLUGIN_IDS`
   / `WIDGET_INTEGRATIONS`. Skills follow that catalog — not a frozen four-id
   table. Do not invent pack or widget names without OpenSpec + types.
   Completing a typed widget id on an existing pack is allowed. Today’s
   `github` / `wakatime` / `rss` / `http` is a snapshot. Animation is not
   github-only.
7. Public API (new widget id, yaml option, `FIRST_PARTY_WIDGET_IDS`, Action
   inputs) → OpenSpec delta **first**. Then copy full widget templates only
   if the widget dir is empty or new. A missing optional `animation.css` /
   `styles.css` may still be copied into a non-empty dir (no-clobber when
   the file already exists). Fail closed on stale codegen.

## Generate

Load [generate](references/generate.md) on mutating write modes only.
Complete-existing: **extend** live files; copy full widget templates
(`schema.ts`, `fetch.ts`, `widget.*`) **only** when
`packages/plugins/src/<pack>/widgets/<id>/` is empty or new; **append**
`widgets[]` only for a **new** widget id (do not duplicate a live id).
Leave inventoried `docsPath` unchanged — do not rewrite it to
`"{{DOCS_PATH}}"`. That placeholder is for **new packs** (`author-plugin`).
Read the live pack's `docsPath` from disk; do not freeze values here. A
missing optional `animation.css` / `styles.css` may be copied into a
**non-empty** dir; do not clobber those files when they already exist. Never copy into `/generate/widgets` or `apps/docs/**`. A new
card that needs a new API stops (`author-integration`). Write modes without
pack id and widget id stop.

Copy templates from `assets/templates/` into the repo-root destination
`packages/plugins/src/<pack>/widgets/<id>/` for a new or empty widget dir,
or copy only a missing optional `animation.css` / `styles.css` into a
non-empty dir. Destination paths are documented in
[generate](references/generate.md). Template paths must not contain `../`.

Replace `{{WIDGET_ID}}`, `{{WIDGET_PASCAL}}`, `{{PACK_ID}}`,
`{{PACK_ID_UPPER}}`, `{{WIDGET_TITLE}}`, `{{WIDGET_DESCRIPTION}}`,
`{{INTEGRATION_ID}}`, `{{INTEGRATION_PASCAL}}`.
`{{WIDGET_DESCRIPTION}}` is subtitle copy in `widget.md` / `widget.mdx` /
`widget.html` (MDX `<Muted>`). Emit:

| Artifact | Rule |
| --- | --- |
| Option schema | Zod `strictObject`. Yaml keys only. Not bits. Not Action inputs. |
| Fetch | Consume cached integration payload. **No HTTP.** Shared client lives on the integration. `include_private` is github-class only (OpenSpec). |
| Source file | Prefer **omit** `source`. Name `widget.tsx` \| `widget.md` \| `widget.mdx` \| `widget.html`. |
| Template | Bits-based, Takumi-safe. Typed bit props; `tw` only on native `div` / `span` / `img`. Root `width: 100%` `height: 100%`. Card **480×160**. |
| Formats | Allow-list: `svg`, `png`, `jpeg`, `webp`, `ico`, `gif`, `apng`. Default `svg`. |
| `md.presets` / `md.families` | Required for md/mdx. Exclusive families — do not stack. |
| Examples | At least one yaml-shaped example. |
| `bitsUsed` | Union into pack-level `{{PACK_ID_UPPER}}_BITS_USED` on `{{PACK_ID}}Plugin`. Not yaml. Not a widget entry. |

Resolve `{{INTEGRATION_ID}}` from live `WIDGET_INTEGRATIONS[widgetId]` in
`packages/core/src/types.ts`. Do not copy a closed widget→integration table
into this skill. A new card declares the integrations it consumes (OpenSpec
+ types first if the id is new). Fetch maps
cached payload → render props. Empty languages data → “No language data”,
not a crash. Generic fetch does **not** read `include_private`. github-class
widgets add that option via OpenSpec and fail closed on `canPrivate`. Do
not paint contributions `0` when `canContributions` is false or viewer ≠
user.

After public-API or docs-field work, tell the user:

```bash
just generate-action
just generate-docs
```

CI uses `just generate-action --check` and `just generate-docs --check`.
`generate-action --check` **must** fail if a flattened
`plugin_<plugin>_<widget>_<option>` input appears (including
`plugin_github_stats_include`, `plugin_github_languages_*`).

## `discoverSource({ path, filename, mime, body })`

Do not fork a second heuristic. Core owns `packages/core/src/discover-source.ts`
(Action, playground, this skill, `just render`). Encode the same rules:

**Order:** extension (path/filename, case-insensitive) → MIME → content sniff.

| Extension | Kind |
| --- | --- |
| `.tsx` `.jsx` `.ts` `.js` `.mts` `.cts` | `react` |
| `.mdx` | `mdx` |
| `.md` `.markdown` `.mdown` | `md` (then maybe promote) |
| `.html` `.htm` | `html` |

MIME: `text/jsx`, `text/tsx`, `application/javascript` → `react`; `text/mdx` →
`mdx`; `text/markdown` → `md`; `text/html` → `html`.

Sniff (no extension, or `.md` / `text/markdown`):

- **react** — ESM/JSX module (`import`/`export`/`function` plus JSX)
- **mdx** — markdown **and** (`import`/`export` at line start, JSX
  `<PascalCase`, or `{expr}` that is not `{#id}`)
- **md** — CommonMark/GFM without those MDX markers
- **html** — leading `<!doctype html>` / `<html` / a root tag without headings
- else fail: `could not discover source; use .md, .mdx, .tsx or set source`

**`.md` promotion:** if the path says markdown but sniff says MDX, discover
`mdx` and record `promotedFrom: 'md'`. Do not compile JSX-in-`.md` through
the md-only pipeline.

**Explicit `source`:** still validate against bytes. Mismatch fails
(`source mismatch: declared react, discovered md`). Prefer omit `source`
when the file is named correctly.

**Ambiguous:** `widget.md` + `widget.tsx` (two canonical entries, different
kinds) and no `source` → fail
(`ambiguous widget entries: widget.md and widget.tsx`).

**Canonical (exactly one unless `source` is set):** `widget.tsx` |
`widget.mdx` | `widget.md` | `widget.html`. Also accept `index.*` /
`render.tsx` / `source.md(x)` only if `widget.*` is absent.

Full matrix: [discover-source](references/discover-source.md).

## Templates

| File | When |
| --- | --- |
| `assets/templates/widget.tsx.template` | React (first-party `stats`/`languages` stay React) |
| `assets/templates/widget.md.template` | Markdown → remark/rehype → `fromHtml` (CommonMark; no PascalCase tags) |
| `assets/templates/widget.mdx.template` | MDX → `@mdx-js/mdx` → `fromJsx`; bits as `components` |
| `assets/templates/widget.html.template` | HTML → `fromHtml` |
| `assets/templates/stylesheet.css.template` | `tw` / `className` on `div` / `span` / `img` only; compiled `stylesheets[]`; copy when `styles.css` is missing |
| `assets/templates/keyframes.css.template` | gif/apng `@keyframes` → `renderAnimation`; copy when `animation.css` is missing |
| `assets/templates/schema.ts.template` | Option schema + formats + examples |
| `assets/templates/fetch.ts.template` | Cached-payload fetch (no HTTP; `include_private` github-class only) |

Copy the matching source template as the canonical filename. Do not emit
`source:` unless the user asked to override discovery.

## Bits and Takumi

Bits (composition metadata, **not** yaml keys): `Theme`, `Frame`, `Stack`,
`Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`, `Divider`. Import
`@profile-bits/bits`. Union used names into pack-level
`{{PACK_ID_UPPER}}_BITS_USED` on `{{PACK_ID}}Plugin`. Users never put `bits:`
in `.github/profile-bits.yml`. `PluginIdentitySchema` has no `bitsUsed` —
do not edit `packages/core`.

Takumi **2.9.2** only via `@profile-bits/renderer`. Do not import `takumi-js`
or `@takumi-rs/*` from widgets. Card **480×160**. Default format `svg`
(baked still: no `<style>`, `@keyframes`, SMIL, or `foreignObject` in
`renderSvg()` output). CSS `@keyframes` are authoring input to `render` /
`renderAnimation`. APNG files are named `.png`.

Takumi-safe: `tw` / `className` / `style` only on native `div` / `span` /
`img`, never on bits. Bits use typed props (`gap`, `size`, `weight`, `pct`,
`src`) and never take `tw` / `className` / `style`. Numeric `gap` / `size` /
`weight`. `Avatar` requires `src: string`. `Bar` requires `pct: number`.
`Stat` is the only `value` bit.
Hooks: server semantics only (`useState` initial, `useContext`, `use()`).
**No** `react-dom`, `useEffect`, portals, Radix/shadcn DOM, `"use client"`,
canvas/WebGL.

## MD / MDX

Pipeline: remark/rehype → `fromHtml` (md) or `fromJsx` (mdx). Load
[md-families](references/md-families.md) before setting `md.presets` /
`md.families`.

Exclusive families (do **not** stack members):

| Family | Default |
| --- | --- |
| code | `rehype-pretty-code` + peer `shiki` |
| math | `remark-math` + `rehype-katex` |
| mermaid | `rehype-mermaid` `strategy: 'inline-svg'` via `isomorphic-mermaid` |
| slug | `rehype-slug` |
| section | `rehype-sectionize` |

Serializer: `remark-html` **xor** `remark-rehype` (never both). No Playwright
in the Action. Kroki / plantuml.com stay **off** unless `md.allow_network`
and an explicit base URL.

Swap example: `md.families.code: starry-night` replaces pretty-code+shiki.
Do not `.use()` both.

## OpenSpec gate

New widget id, new yaml option (including a **languages option**), or
expanding `FIRST_PARTY_WIDGET_IDS` is public API:

1. OpenSpec delta first (`widget-contract` and/or yaml schema).
2. Then `packages/core/src/types.ts` to match.
3. Then templates + pack-level `bitsUsed` union.
4. Then `just generate-action` / `just generate-docs`.

Never add `plugin_github_languages_*` or any `plugin_<plugin>_<widget>_<option>`
to `action.yml`. Widget options live in `.github/profile-bits.yml`. Yaml
present beats `plugin_github`. Read `ActionInputsSchema` — do not invent names.

## Refuse (NOT-for)

- New data source / WakaTime-class / **new card + new API** → `author-integration`
- New pack / second pack for an existing plugin id → `author-plugin`
- Write modes (`add`, `option`, `animation`, `mdx`, `stylesheet`, `families`) without pack id and widget id (do not invent dest). Animation on a named one-widget pack uses the sole live widget id; do not invent a new card
- Action runtime, thin `action.yml`, Marketplace flattened inputs
- Takumi renderer internals (`packages/renderer`) except calling it
- Docs `/playground` or `/generate`; copy dest `/generate/widgets`
- MCP (`mcp.json`)
- dest `../`
- HTTP inside widgets / `fetch.ts`; REST `/languages`; unauthenticated GitHub
- Two canonical `widget.*` files without `source`

## Gotchas

- Prefer omit `source`. Canonical names discover correctly.
- Explicit `source` must match bytes or fail.
- Ambiguous `widget.md` + `widget.tsx` without `source` fails.
- `.md` with import/export/JSX promotes to `mdx`.
- Default SVG stays a baked still even when gif/apng animation exists.
- APNG output filename uses `.png`.
- `bitsUsed` is pack-level registry metadata, not a yaml enablement layer.

## Reference index

Do not load all at once.

| File | Load when |
| --- | --- |
| [locks](references/locks.md) | Mutating modes only (after empty args). Catalog, yaml SSOT, Action, bits, fetch, OpenSpec |
| [generate](references/generate.md) | Mutating write modes only. Destinations, pack-level `bitsUsed` union, copy map |
| [discover-source](references/discover-source.md) | `discoverSource` matrix |
| [md-families](references/md-families.md) | Exclusive `md.families` / presets (mutating `families` / md/mdx write) |

## Proof

From the plugin root:

```bash
bash scripts/validate.sh
pnpm dlx skills-ref@0.1.5 validate skills/author-widget
```

No `agentskills` fallback.
