# Badge fragment notes

Shieldcn rows for the project README. Theme-derived GitHub badges use `<picture>` + `mode`. Color-locked static `/badge/…-COLOR.svg` pins are plain `<img>`.

Shared query on GitHub badges: `font=geist&theme=zinc&variant=outline&size=xs`.

Do not mix `img.shields.io`. Do not use a shieldcn header as the hero. Do not fake CI passing.

Validate with GET on each `.svg` URL. Native GHA `badge.svg` is out (different grammar).
