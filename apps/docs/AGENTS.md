# @profile-bits/docs

Fumadocs + shadcn playground (`/playground`, `/playground/{github,wakatime,rss,http}` and `[widget]`). Catalog `/generate/catalog` lists all four packs and eight widgets (`demo`, `stats`, `languages`, `repo`, `coding`, `feed`, `json`, `chips`). Emits thin Action YAML, `.github/profile-bits.yml`, and README markdown for the user to paste. `/playground` redirects to `/playground/github`.

## Preview

- `POST /api/preview` is a **docs layout/time-axis preview**, not a stable embed API. `GET /api/preview` is 405. Do not cache or document it as an embed.
- Dual pane: WASM layout + README mode (`renderSvg` / `renderAnimation` bytes).
- Default preview is **non-empty fixtures** (octocat including `repo` from `repos[0]`, WakaTime `last_7_days`, Atom feed via `rss-fixtures.ts`, `chipFixture` / json sample). **No App token → fixtures, zero outbound GitHub.** Never unauthenticated REST. Never log visitor tokens (sessionStorage only). POST body and permalinks omit token fields.
- Optional live (server-side only): GitHub App token (`GITHUB_APP` / `GITHUB_APP_TOKEN`); WakaTime preview env; rss/http SSRF for a visitor https URL; HTML scrape through the same SSRF gates. Never unauthenticated WakaTime. Never visitor tokens in POST or permalinks.
- Playground **wakatime** is `/playground/wakatime` (`coding`). Fixtures `last_7_days` unless a server WakaTime preview token is set.
- Playground **rss** is `/playground/rss` (`feed`). Wrap rss fixture XML via `rss-fixtures.ts` (`parseRssXml(loadFixture(...))`; not a second static JSON pack). Live feed only for a typed https URL through the SSRF client. Do not add `feed` to github widget ids.
- Playground **http** is a first-class pack in the shared PlaygroundShell (`json` and `chips` tuners; keep `/playground/http`). Fixtures remain the no-network default (`chipFixture` / committed json sample). Live vendor fetch uses the http origin allowlist / SSRF path only. Do not proxy arbitrary vendor images or embed live `shieldcn.dev` / `img.shields.io` URLs in the README rail.
- `PREVIEW_PLUGIN_IDS` is `github`, `wakatime`, `rss`, `http`. Github routes use `PREVIEW_GITHUB_WIDGET_IDS`: `demo` / `stats` / `languages` / `repo`. `PREVIEW_WIDGET_IDS` is the eight-id POST union. Do not add `coding`, `feed`, `json`, or `chips` to github widget ids. Do not add `repo` to the http playground. Plugin-scope github still renders demo+stats+languages only; `repo` is explicit widget scope. Empty repo card copy is “No repo data”, distinct from chips “No data”.
- Keep `github_token`, `wakatime_token`, `http_token_env`, and `http_token` in `PREVIEW_TOKEN_QUERY_KEYS` so permalinks cannot round-trip secrets.
- Playground is not a Camo/sanitize oracle.

`ImageResponse` (`takumi-js/response`) is allowed here for still frames; animation preview uses `renderAnimation` and returns the file.

## Catalog / library

- `/generate/catalog` lists packs `github`, `wakatime`, `rss`, and `http` and widgets `demo`, `stats`, `languages`, `repo`, `coding`, `feed`, `json`, and `chips`. It is a first-party visual gallery, not a plugin marketplace.
- `/generate/{github,wakatime,rss,http}` (and `[widget]`) show that pack's `bitsUsed`. Do not index `githubWidgetRegistry` for `coding` / `feed` / `json` / `chips`.
- `/generate/bits` shows Frozen 11 samples, not names-only. `/generate/themes` lists `NAMED_THEME_IDS` via `listFamilies`.

## Theme chrome

- Shared GlobalBar family picker + mixer on `/generate/*` and `/playground/*`.
- Permalink: named `theme=<id>`; custom `theme=custom` plus `cbg`/`ccard`/`ctext`/`cmuted`/`caccent`/`cborder`/`cpair`.
- Contrast warnings are warn-only (do not block render or mix).
- `POST /api/preview` is still not an embed API. Unknown custom refs return 400.
- `/playground/http` MUST consume the shared theme, not a private `light`|`dark` list.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
