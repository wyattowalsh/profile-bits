# MD / MDX families

Takumi has `fromHtml` / `fromJsx`, not a markdown parser. Widgets set
`md.presets` and optional `md.families`. Unknown plugin ids fail parse.
`source` is optional; the processor calls `discoverSource` first.

## Pipelines

- **md:** `remark-parse` → remark plugins → `remark-rehype` → rehype plugins
  → `rehype-stringify` → `fromHtml`.
- **mdx:** `@mdx-js/mdx` `compile` / `evaluate` with the same
  `remarkPlugins` / `rehypePlugins` arrays (pass `[plugin, options]` tuples).
  Do not fake MDX with `remark-mdx` + `remark-html`.
- MDX `components` map **is** the bits index (`Theme`, `Frame`, `Stack`,
  `Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`, `Divider`).

**Serializer xor:** `remark-html` **xor** `remark-rehype`. Never both.
Default is `remark-rehype` then `rehype-stringify`. `remark-html` is a
configured alternate serializer only.

Extra CSS a plugin needs (KaTeX, pretty-code `data-*`, starry-night,
callouts) is compiled into `stylesheets` and passed to Takumi. Do not expect
`<style>` in `renderSvg()` output.

`rehype-sanitize` runs after injectors, before stringify/react, with
`defaultSchema` deep-merged so SVG/math/code `data-*` survive.

## Exclusive families (do not stack)

A processor `.use()`s **exactly one** member of a family. Default member is
listed first. Widget yaml: `md.families.code`, `md.families.math`,
`md.families.mermaid`, plus slug/section.

### code (default `pretty-code`)

`rehype-pretty-code` + peer `shiki` **xor** `@shikijs/rehype` **xor**
`rehype-starry-night` **xor** `rehype-highlight` **xor** `rehype-prism`
**xor** `rehype-prism-plus` **xor** `rehype-expressive-code` **xor**
`remark-highlight.js` **xor** `remark-prism` **xor** `remark-tree-sitter`.

Swap to starry-night:

```yaml
md:
  families:
    code: starry-night
```

That **replaces** pretty-code+shiki. Do not enable both. `rehype-twoslash`
only with starry-night. `rehype-highlight-code-lines` runs after the chosen
highlighter.

### math (default `katex`)

`remark-math` always (syntax). Renderer: `rehype-katex` +
`rehype-katex-notranslate` **xor** `rehype-mathjax/svg` **xor**
`rehype-mathml`.

### mermaid (default `rehype-mermaid`)

`rehype-mermaid` **xor** `rehype-mermaidjs` **xor** `remark-mermaidjs`.
Do not run remark + rehype mermaid together.

Action: `strategy: 'inline-svg'` plus `isomorphic-mermaid` as the Node
renderer. **No Playwright** in the Action (`npx playwright install` is
forbidden). If the renderer cannot emit SVG, fail the widget with that
error — do not call kroki.ink / plantuml.com / mermaid.ink.

### slug (default `rehype-slug`)

`rehype-slug` **xor** `rehype-slug-custom-id` **xor** `remark-heading-id`
**xor** `remark-custom-header-id`.

### section (default `rehype-sectionize`)

`remark-sectionize` **xor** `rehype-sectionize` **xor** `rehype-section`.

## Network backends (off by default)

`remark-kroki`, `rehype-kroki`, `remark-simple-plantuml` (plantuml.com),
`remark-refer-plantuml` are configured but `enabled: false` unless the
widget sets an explicit base URL **and** `md.allow_network: true`. Default
Action: off (self-contained; never unauth third-party).

## Presets

`md.presets`: `default` plus named groups. Extra plugin ids may be listed;
unknown id → fail parse. Default preset includes the default member of each
exclusive family above. Changing a family is a **swap**, not an append.
