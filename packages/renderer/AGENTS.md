# @profile-bits/renderer

**Only** Takumi import site. Widgets and the Action call this package; they do not import `takumi-js` / `@takumi-rs/*` directly.

## Own

- `render()` → png | jpeg | webp | ico
- `renderSvg()` → svg (**default**). Takumi SVG is a **baked still** (outlined glyphs/geometry). No `<style>`, `@keyframes`, SMIL, or `foreignObject` in default SVG output. CSS `@keyframes` are authoring input to `render` / `renderAnimation`, not GitHub SVG runtime.
- `renderAnimation()` → gif | apng | animated webp
- `ImageResponse` is docs-only (`takumi-js/response` on the playground route).

## Fonts

Vendor WOFF2 in `fonts/`. Do not call `googleFonts()` in CI (needs network). Geist Latin 300–800 is **last-resort** only. Reuse one `Renderer` + `registerFont` across widgets.

Card size **480×160**. Root Takumi node: `width: 100%`, `height: 100%`.
