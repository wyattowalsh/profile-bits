## Context

Archived playground specs required github-only codegen and explicitly forbade `/playground/wakatime` and `/playground/rss`. Http chips landed as a fixtures-only explorer that did not use `PlaygroundShell` tuners. Catalog listed github widgets only. Live types already have four packs and eight widgets.

## Goals / Non-Goals

**Goals:**

- Real playground + generate catalog/library for `github`, `wakatime`, `rss`, `http`.
- Non-empty fixture happy path for every widget.
- Keep preview POST as layout preview (no GET embed, no token fields, never unauth GitHub).

**Non-Goals:**

- Fifth pack, extra palettes, mixer invert APIs, OG/embed/CDN.
- Visitor tokens in permalink or POST body.
- Making widgets perform HTTP.
- Marketplace listing / tagging `v1`.

## Decisions

- Per-pack widget id lists. `PREVIEW_WIDGET_IDS` is the union for POST `widget`; github routes use `PREVIEW_GITHUB_WIDGET_IDS` only.
- Plugin-scope github still renders `demo` + `stats` + `languages`. `repo` stays explicit widget scope.
- Default enabled: github `demo`; wakatime `coding`; rss `feed`; http `chips`.
- Live rss/json when `options.feed.url` / `options.json.url` is a non-empty https URL (SSRF client). Otherwise fixtures.
- Live chips when `PREVIEW_HTTP_LIVE` is a non-empty env (allowlisted http client). Otherwise `chipFixture`.
- Live WakaTime when `WAKATIME_PREVIEW_TOKEN` or `WAKATIME_APP` is set. Otherwise `last_7_days.json`.
- Fold `/playground/http` into `PlaygroundShell` (keep the URL).

## Risks / Migration

- Docs server must not become an open proxy: SSRF + origin allowlist + no-store + no GET embed.
- Existing tests lock github-only ids and “source must not contain wakatime”; update those tests, not the landing redirect file.

## Open Questions

- (none — locks taken from the approved plan)
