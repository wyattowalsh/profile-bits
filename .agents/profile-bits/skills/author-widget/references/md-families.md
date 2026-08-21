# Action markdown (GFM only)

Takumi has `fromHtml` / `fromJsx`, not a markdown parser. Widgets and the
Action call **Takumi 2.9.2** only through `@profile-bits/renderer` — never
`takumi-js` / `@takumi-rs/*` directly. `source` is optional; the processor
calls `discoverSource` first.

Action `widget.md` is **GFM only**. That is the shipped default. Do not
author mermaid, MDX, Shiki, KaTeX, pretty-code, or starry-night as if they
were in the Action ncc graph.

## Action pipeline

```text
remark-parse
  → remark-gfm { singleTilde: false }
  → remark-rehype { allowDangerousHtml: true }
  → rehype-sanitize
  → rehype-stringify
  → wrapped fromHtml
  → wrapped renderSvg
```

`fromHtml` and `renderSvg` are wrap-and-fail (`withTakumi` in
`@profile-bits/renderer`). Default SVG is a **baked still** (outlined
glyphs/geometry). Do not expect `<style>`, `@keyframes`, SMIL, or
`foreignObject` in `renderSvg()` output.

`singleTilde: false` is GitHub strikethrough (`~~`, not `~`).
`allowDangerousHtml: true` lets raw HTML reach rehype; `rehype-sanitize`
runs before stringify.

Keep CommonMark/GFM in `widget.md`. PascalCase tags / `import` / `export` /
JSX promote `.md` to `mdx` at discovery — MDX is **not** Action.

## Not a profile yaml field

`md.families` is **not** a `.github/profile-bits.yml` field. Neither is
`md.presets`, `md.allow_network`, or any other `md.` key.

`ConfigSchema` is `z.strictObject`. Profile yaml `md.` already fails parse.
Unknown yaml keys still fail parse (`additionalProperties: false`). Do
**not** put `md.families` / `md.presets` in profile-bits.yml. Do not invent
a flattened Action input for them.

Options that *are* yaml live under
`plugins.<pack>.widgets.<widget>` on the existing first-party packs
(`github`, `wakatime`, `rss`, `http`). Do not invent extra packs.

## Fail parse (Action)

| Input | Result |
| --- | --- |
| `mermaid` / `mermaidjs` fences in widget markdown | parse fail |
| `md.` / `md.families` / `md.presets` in `.github/profile-bits.yml` | parse fail (`strictObject`) |
| Unknown yaml keys / unknown `include` tokens | parse fail |

A paragraph that merely contains the word “mermaid” is fine. Fenced
`mermaid` / `mermaidjs` blocks are not.

## Action ncc vs later `packages/renderer` md

Action ships the GFM pipeline above. These packages are **later
`packages/renderer` md extras**. They MUST NOT enter the Action ncc graph:

| Extra | Role (later renderer/md only) |
| --- | --- |
| mermaid (`rehype-mermaid`, `isomorphic-mermaid`, …) | diagram fences |
| shiki / `@shikijs/rehype` | highlighting |
| katex / `rehype-katex` / `remark-math` | math |
| `@mdx-js/mdx` | MDX compile / evaluate |
| pretty-code (`rehype-pretty-code`) | code family default (later) |
| starry-night (`rehype-starry-night`) | code family swap (later) |

No Playwright in the Action. No kroki.ink / plantuml.com / mermaid.ink from
the Action. If a later renderer cannot emit SVG, fail that widget — do not
call a network diagram backend.

---

## Appendix — later `packages/renderer` md (not shipped in Action)

The catalog below is a **future renderer/md** design. It is **not** the
Action default. It is **not** `.github/profile-bits.yml`. Do not splice it
into profile yaml or the Action ncc graph. When extras land, they live
under `packages/renderer` md, not as profile keys.

### Pipelines (later)

- **md extras:** remark plugins / rehype plugins after the GFM core, then
  stringify → wrapped `fromHtml` → wrapped `renderSvg`.
- **mdx:** `@mdx-js/mdx` `compile` / `evaluate` with the same
  `remarkPlugins` / `rehypePlugins` arrays (pass `[plugin, options]`
  tuples). Do not fake MDX with `remark-mdx` + `remark-html`. MDX
  `components` map **is** the bits index (`Theme`, `Frame`, `Stack`, `Row`,
  `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`, `Divider`).
- **Serializer xor (later):** `remark-html` **xor** `remark-rehype`. Never
  both. Action already fixed the rehype path; do not add `remark-html` to
  ncc.

Extra CSS a later plugin needs (KaTeX, pretty-code `data-*`, starry-night,
callouts) compiles into `stylesheets` passed to Takumi. Still no `<style>`
in `renderSvg()` output.

Later `rehype-sanitize` may deep-merge `defaultSchema` so SVG/math/code
`data-*` survive. Action GFM uses sanitize as shipped — do not widen the
Action schema for extras that are not in ncc.

### Exclusive families (later; do not stack)

A later processor `.use()`s **exactly one** member of a family. Default
member is listed first. Changing a family is a **swap**, not an append.
This is renderer/md processor config — **not** a profile-bits.yml field,
**not** an Action input.

#### code (default `pretty-code`)

`rehype-pretty-code` + peer `shiki` **xor** `@shikijs/rehype` **xor**
`rehype-starry-night` **xor** `rehype-highlight` **xor** `rehype-prism`
**xor** `rehype-prism-plus` **xor** `rehype-expressive-code` **xor**
`remark-highlight.js` **xor** `remark-prism` **xor** `remark-tree-sitter`.

Swap to starry-night **replaces** pretty-code+shiki. Do not enable both.
`rehype-twoslash` only with starry-night. `rehype-highlight-code-lines`
runs after the chosen highlighter.

#### math (default `katex`)

`remark-math` always (syntax). Renderer: `rehype-katex` +
`rehype-katex-notranslate` **xor** `rehype-mathjax/svg` **xor**
`rehype-mathml`.

#### mermaid (default `rehype-mermaid`)

`rehype-mermaid` **xor** `rehype-mermaidjs` **xor** `remark-mermaidjs`.
Do not run remark + rehype mermaid together. Later Action-adjacent
renderer: `strategy: 'inline-svg'` plus `isomorphic-mermaid` as the Node
renderer — still **no Playwright**, still **no** kroki/plantuml/mermaid.ink.

Until that extra ships, mermaid fences in Action `widget.md` **fail parse**.

#### slug (default `rehype-slug`)

`rehype-slug` **xor** `rehype-slug-custom-id` **xor** `remark-heading-id`
**xor** `remark-custom-header-id`.

#### section (default `rehype-sectionize`)

`remark-sectionize` **xor** `rehype-sectionize` **xor** `rehype-section`.

### Network backends (later; off)

`remark-kroki`, `rehype-kroki`, `remark-simple-plantuml` (plantuml.com),
`remark-refer-plantuml` stay `enabled: false` unless a later widget
descriptor sets an explicit base URL **and** an allow-network flag. Default
Action: off (self-contained; never unauth third-party). That flag is still
**not** a profile-bits.yml `md.` field today.

### Presets (later)

Named plugin groups for later renderer/md. Extra plugin ids may be listed;
unknown id → fail parse. Default preset would include the default member of
each exclusive family above. Changing a family remains a **swap**, not an
append. Presets are not `.github/profile-bits.yml` keys.
