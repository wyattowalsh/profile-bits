# @profile-bits/docs

Fumadocs + shadcn playground (`/playground`, `/playground/github`, `/playground/http`). Emits thin Action YAML, `.github/profile-bits.yml`, and README markdown for the user to paste.

## Preview

- `POST /api/preview` is a **docs layout/time-axis preview**, not a stable embed API. Do not cache or document it as one.
- Dual pane: WASM layout + README mode (`renderSvg` / `renderAnimation` bytes).
- **No App token → fixtures, zero outbound GitHub.** Never unauthenticated REST. Never log visitor tokens (sessionStorage only).
- Playground **wakatime** uses wakatime integration JSON fixtures or skips live. Never unauthenticated WakaTime.
- Preview wraps rss XML fixtures via `rss-fixtures.ts` (`parseRssXml(loadFixture(...))` + `renderFeedSvg`; not a second static JSON pack), with **zero live feeds**. Rss has no playground route in this change.
- Playground **http** uses fixtures only (`chipFixture` for chips). **Zero live URLs.** No live shieldcn/shields fetches. `/playground/http` is a fixtures-only chips explorer (preset/types tuners; baked SVG; yaml/README copy). Keep `http_token_env` / `http_token` in `PREVIEW_TOKEN_QUERY_KEYS` so permalinks cannot round-trip secrets. `PREVIEW_PLUGIN_IDS` is `github` then `http`. Do not add `chips` or `json` to github `PREVIEW_WIDGET_IDS`.
- Playground is not a Camo/sanitize oracle.

`ImageResponse` (`takumi-js/response`) is allowed here for still frames; animation preview uses `renderAnimation` and returns the file.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
