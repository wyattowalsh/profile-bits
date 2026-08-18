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
`INTEGRATION_AUTH`, `ActionInputsSchema`. Do not hardcode github-only.
Completing an id already in those lists is allowed. Adding a new id requires
OpenSpec first. Do not create a second pack for an id already in
`FIRST_PARTY_PLUGIN_IDS`. WakaTime-class **architecture** (client, auth, scopes,
inputs, mocked HTTP) still applies to **new** data sources. Live types already
include wakatime, rss, and http packs. Thin Action names: read
`ActionInputsSchema` (includes optional `wakatime_token`, `http_token_env`);
never invent `plugin_*_*_*`.

Load references on demand. Frontmatter is for discovery; references carry
deep procedure. Do not load all at once.

## Dispatch

| `$ARGUMENTS` | Mode |
| --- | --- |
| *(empty)* / `help` | Empty-args gallery |
| `add [id] [pack]` | New card on an existing pack |
| `option [widget] [field]` | Add a yaml option (OpenSpec first) |
| `animation [gif\|apng]` | CSS `@keyframes` for `renderAnimation` |
| `mdx` | Canonical `widget.mdx`; omit `source` |
| `stylesheet` / `tailwind` | Takumi-safe `tw` / `className` |
| `families [family] [member]` | Exclusive `md.families` swap |
| `discover [path]` | `discoverSource` rules |
| New data source / WakaTime-class | Refuse → `author-integration` |
| New pack / plugin id | Refuse → `author-plugin` |

Natural language uses the same table. Do not invent a mutating default.

### Auto-detect

1. "option" / languages field / yaml schema on an existing widget → **option**
2. `@keyframes` / gif / apng / animation → **animation**
3. `widget.mdx` / "no source" / drop MDX → **mdx**
4. Tailwind / `tw` / `className` / stylesheets → **stylesheet**
5. `md.families` / starry-night / pretty-code / katex / mermaid → **families**
6. "discover" / ambiguous `widget.md` + `widget.tsx` / MIME sniff → **discover**
7. New card / widget / template on a named or existing pack → **add**
8. New API / WakaTime-class → refuse (`author-integration`)
9. New pack / second pack for an existing `FIRST_PARTY_PLUGIN_IDS` id → refuse (`author-plugin`)

### Empty args

When `$ARGUMENTS` is empty (or the user only asks how widget authoring works),
show this gallery and stop. Do not write files. Do not inventory the next
product add (that is `author` ideate).

1. **add** — new card on an existing pack (read `FIRST_PARTY_PLUGIN_IDS`; do not assume github-only).
2. **option** — yaml option on an existing widget; OpenSpec delta first.
3. **animation** — `@keyframes` authoring for gif/apng; APNG named `.png`.
4. **mdx** — canonical `widget.mdx`; prefer omit `source`.
5. **stylesheet** — `tw` / `className`; bits composition.
6. **families** — exclusive `md.families` swap; do not stack.
7. **discover** — extension → MIME → sniff; mismatch / ambiguous fail.

Locks: live catalog from `types.ts`. Widgets do not HTTP. Default SVG is a
baked still. Union bits into pack-level `{{PACK_ID_UPPER}}_BITS_USED` on
`{{PACK_ID}}Plugin`. Load [locks](references/locks.md) and
[generate](references/generate.md) before copying templates.

## Critical rules

1. Cards land on an existing pack id from `FIRST_PARTY_PLUGIN_IDS`. Do not create a second pack for an existing id.
2. If the pack dir `packages/plugins/src/<pack>/` is missing, stop and name `author-plugin` (typed hole). Do not assume `packages/plugins/src/github/` exists.
3. Union composed bit names into pack-level `{{PACK_ID_UPPER}}_BITS_USED` on `{{PACK_ID}}Plugin`. Never a widget-entry `bitsUsed`. Never yaml.
4. Widgets do not HTTP. Consume the cached integration payload. Never REST `/languages`. Never unauthenticated GitHub.
5. Public API (new widget id, yaml option, `FIRST_PARTY_WIDGET_IDS`) → OpenSpec first. Completing an id already in types does not append the enum.
6. Never invent `plugin_<plugin>_<widget>_<option>` Action inputs. Read `ActionInputsSchema` (optional `wakatime_token`, `http_token_env`).
7. Prefer omit `source`. Canonical `widget.tsx` \| `widget.md` \| `widget.mdx` \| `widget.html`. Ambiguous dual canonical files fail.
8. Templates MUST NOT contain `../`. Destinations are `packages/plugins/src/<pack>/widgets/<id>/`.

## Before generating

1. Read (repo-root prose paths — not skill-relative links):
   - `openspec/specs/plugin-contract/spec.md`
   - `openspec/specs/widget-contract/spec.md`
   - `openspec/specs/integration-contract/spec.md`
   - `packages/core/src/types.ts`
   - `openspec/specs/author-plugin/spec.md` when present
2. Load [locks](references/locks.md).
3. If the request is a **new data source**, stop and name `author-integration`
   (dest `packages/integrations/src/<id>/`).
4. If they **asked for a new pack**, stop and name `author-plugin`.
5. Otherwise pick an existing pack from `FIRST_PARTY_PLUGIN_IDS`. Do not
   invent extra first-party packs. Completing a typed widget id is allowed.
6. Public API (new widget id, yaml option, `FIRST_PARTY_WIDGET_IDS`, Action
   inputs) → OpenSpec delta **first**. Then copy templates. Fail closed on
   stale codegen.

## Generate

Copy templates from `assets/templates/` into the repo-root destination
`packages/plugins/src/<pack>/widgets/<id>/`. Destination paths are documented
in [generate](references/generate.md). Template paths must not contain `../`.

Replace `{{WIDGET_ID}}`, `{{WIDGET_PASCAL}}`, `{{PACK_ID}}`,
`{{PACK_ID_UPPER}}`, `{{WIDGET_TITLE}}`, `{{INTEGRATION_ID}}`,
`{{INTEGRATION_PASCAL}}`. Emit:

| Artifact | Rule |
| --- | --- |
| Option schema | Zod `strictObject`. Yaml keys only. Not bits. Not Action inputs. |
| Fetch | Consume cached integration payload. **No HTTP.** Shared client lives on the integration. |
| Source file | Prefer **omit** `source`. Name `widget.tsx` \| `widget.md` \| `widget.mdx` \| `widget.html`. |
| Template | Bits-based, Takumi-safe. Root `width: 100%` `height: 100%`. Card **480×160**. |
| Formats | Allow-list: `svg`, `png`, `jpeg`, `webp`, `ico`, `gif`, `apng`. Default `svg`. |
| `md.presets` / `md.families` | Required for md/mdx. Exclusive families — do not stack. |
| Examples | At least one yaml-shaped example. |
| `bitsUsed` | Union into pack-level `{{PACK_ID_UPPER}}_BITS_USED` on `{{PACK_ID}}Plugin`. Not yaml. Not a widget entry. |

`demo` → integration `static`. `stats` / `languages` → `github`. `coding` →
`wakatime`. `feed` → `rss`. `json` → `http`. A new card declares the
integrations it consumes. Fetch maps cached payload → render props. Empty
languages data → “No language data”, not a crash. `include_private` without
`canPrivate` fails that widget. Do not paint contributions `0` when
`canContributions` is false or viewer ≠ user.

After public-API or docs-field work, tell the user:

```bash
just generate-action
just generate-docs
```

CI uses `just generate-action --check`. That check **must** fail if a
flattened `plugin_<plugin>_<widget>_<option>` input appears (including
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
| `assets/templates/widget.md.template` | Markdown → remark/rehype → `fromHtml` |
| `assets/templates/widget.mdx.template` | MDX → `@mdx-js/mdx` → `fromJsx`; bits as `components` |
| `assets/templates/widget.html.template` | HTML → `fromHtml` |
| `assets/templates/stylesheet.css.template` | `tw` / `className` / compiled `stylesheets[]` |
| `assets/templates/keyframes.css.template` | gif/apng `@keyframes` → `renderAnimation` |
| `assets/templates/schema.ts.template` | Option schema + formats + examples |
| `assets/templates/fetch.ts.template` | Cached-payload fetch (no HTTP) |

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

Takumi-safe: `div` / `span` / `img` plus `tw` / `style` / `className`.
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

- New data source / WakaTime-class → `author-integration`
- New pack / second pack for an existing plugin id → `author-plugin`
- Action runtime, thin `action.yml`, Marketplace flattened inputs
- Takumi renderer internals (`packages/renderer`) except calling it
- Docs `/playground` or `/generate`
- MCP (`mcp.json`)
- HTTP inside widgets; REST `/languages`; unauthenticated GitHub
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
| [locks](references/locks.md) | Catalog, yaml SSOT, Action, bits, fetch, OpenSpec |
| [generate](references/generate.md) | Destinations, pack-level `bitsUsed` union, copy map |
| [discover-source](references/discover-source.md) | `discoverSource` matrix |
| [md-families](references/md-families.md) | Exclusive `md.families` / presets |

## Proof

From the plugin root:

```bash
bash scripts/validate.sh
pnpm dlx skills-ref validate skills/author-widget
```
