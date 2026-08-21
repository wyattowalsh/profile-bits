# Vendored Geist (Latin last-resort)

Geist Latin last-resort weights **300–800** (regular; no italics). Takumi `registerFont` loads these at renderer init. Do not call `googleFonts()` in CI — it needs network; these files keep CI deterministic.

| Weight | File |
| ---: | --- |
| 300 | `Geist-Light.woff2` |
| 400 | `Geist-Regular.woff2` |
| 500 | `Geist-Medium.woff2` |
| 600 | `Geist-SemiBold.woff2` |
| 700 | `Geist-Bold.woff2` |
| 800 | `Geist-ExtraBold.woff2` |

Source: [vercel/geist-font v1.7.2](https://github.com/vercel/geist-font/releases/tag/v1.7.2) (`geist-font-v1.7.2.zip`). License: SIL OFL 1.1 (`OFL.txt`).
