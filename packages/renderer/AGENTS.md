# @profile-bits/renderer

**Only** Takumi import site. Widgets and the Action call this package; they do not import `takumi-js` / `@takumi-rs/*` directly.

## Own

- `render()` → png | jpeg | webp | ico
- `renderSvg()` → svg (**default**). Takumi SVG is a **baked still** (outlined glyphs/geometry). No `<style>`, `@keyframes`, SMIL, or `foreignObject` in default SVG output. CSS `@keyframes` are authoring input to `render` / `renderAnimation`, not GitHub SVG runtime.
- `renderAnimation()` → gif | apng | animated webp
- Wrap-and-fail: `withTakumi` in `takumi-wrap.ts`. Empty-tree is a recursive drawable walk (`text.trim()` or image `src`) on convert + `render` / `renderSvg` — **not** a tag denylist. `renderAnimation` does not empty-tree (geometry-only pulse smoke). `foreignObject` is checked on SVG output only. `TakumiRenderError` is the mapped failure; Action adapters map it to `fail_widget`. Never catch renderer throws in `engine.ts`.
- Theme: hex SSOT is `@profile-bits/themes`. `themes.ts` re-exports `resolveTheme` / Primer `light`/`dark` as catalog ids. `--pb-*` in stylesheets compile from a resolved `ThemePalette`; CSS vars are not SSOT. Baked SVG has no runtime `<style>` theme sheet as color SSOT.
- `ImageResponse` is docs-only (`takumi-js/response` on the playground route).
- Action GFM: `src/md/processor.ts` (`assertNoMermaidFence` → `ACTION_MD_PIPELINE` → wrapped `fromHtml`). Do not re-export `./md` from this barrel.

## Fonts

Vendor WOFF2 in `fonts/`. Do not call `googleFonts()` in CI (needs network). Geist Latin 300–800 is **last-resort** only. Reuse one `Renderer` + `registerFont` across widgets.

Card size **480×160**. Root Takumi node: `width: 100%`, `height: 100%`.
