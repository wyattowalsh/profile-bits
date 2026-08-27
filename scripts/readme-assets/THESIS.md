# README image thesis

This is **README chrome plus product stills** for GitHub developers who are deciding whether to add the profile-bits Action. The job is to show that widgets are real **JSX → image** cards, not a text dump, not a badge farm, and not a public embed API.

## Audience, job, surface, register

| Field | Choice |
| --- | --- |
| **Audience** | GitHub developers scanning a repo README. High expertise, low time, README-dark or GitHub-light page behind the images. |
| **Job** | Recognize the product in one glance: dense Primer-native 480×160 cards, committed by the Action, authored as JSX. |
| **Surface** | Marketing-adjacent README proof. Hero is chrome (1200×400). Widget PNGs are the product at native **480×160 / 3:1**. |
| **Register** | Dense technical. Skip-the-browser. JSX-as-design-file. Quiet GitHub-native, not launch-page expressive. |
| **Density** | Data-first. One accent. Fixture numbers, not lorem. |
| **Motion** | None in these files. Static PNG. Takumi motion is authoring input (`render` / `renderAnimation`), not GitHub SVG runtime. |
| **System precedence** | `DESIGN.md` tokens, `packages/bits`, `@profile-bits/renderer` only. Shieldcn is the README **badge** grammar (`font=geist`, `theme=zinc`, `variant=outline`), not the hero. |

## Signature move

A **sampled 480×160 widget still** sits inside the hero collage (scaled 320×107, stacked). JSX is the design file; Takumi rasterizes it; the README shows the frame, not a screenshot of takumi.kane.tw or a shieldcn header banner.

## What this lane refused

- Cloning takumi.kane.tw aurora/neon/CRT or shieldcn glow headers
- Inventing first-party plugins beyond `github`, `wakatime`, `rss`, `http`
- Documenting a public embed API
- Extra hues, a second typeface, Material elevation
- Live GitHub/WakaTime/feed fetches in the raster script
- Animated README GIF/WebP
- Importing `takumi-js` from widgets or the Action
- Mixing `img.shields.io` into the badge row
- A third GitHub alert (NOTE + WARNING only)
