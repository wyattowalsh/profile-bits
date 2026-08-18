## Why

The three-layer contract plus sibling packs already freeze first-party ids as `github`, `wakatime`, `rss`, and `http`. Consumers still need a yaml-enabled public RSS/Atom card. This change **adds** pack `rss` without claiming a github+rss-only catalog. Review findings additionally require: never send `Authorization` (including URL userinfo), rss `fail_widget` MUST NOT fail the job when other widgets rendered, and docs preview MUST wrap rss fixtures without `/playground/rss` routes.

## What Changes

- First-party plugin ids are `github`, `wakatime`, `rss`, and `http`. This change **adds** `rss` (widget `feed`, integration `rss`). GitHub v0 widgets (`demo`, `stats`, `languages`) stay unchanged. Do not invent further first-party packs. Do **not** write “github and rss only”.
- Pack `rss` is off unless yaml `plugins.rss` is present. `widgets.feed.url` is required (`plugins: { rss: {} }` fails parse). Defaults: `filename: feed`, `limit: 5` (1–8), `animate: false`.
- **MODIFY** plugin-contract catalog and yaml document shape so `plugins.rss` is an optional sibling of `plugins.github`. Default committed yaml stays github-only. Yaml MUST NOT forbid other optional siblings (`wakatime`, `http`). Unknown keys still fail parse. `http://` URLs fail parse. URLs with userinfo (username or password) fail parse.
- **No** `plugin_rss` Action bool. **No** flattened `plugin_rss_*` / `plugin_rss_feed_url` Marketplace inputs. `plugin_github` and thin `action.yml` stay as specified.
- Integration `rss` uses auth `none`. It MUST never send an `Authorization` header, including credentials from URL userinfo. Run-scoped https GET + `(method, url, params)` cache inside the rss client (no shared http-json helper), GitHub-host fail-before-connect, DNS-pinned SSRF, and rss-parser **or equivalent**. HTTP 429/5xx retry then **fail the widget** (not `fail_job` / `fail_run`). Do not fold rss into the github all-skipped job rule.
- Widget `feed` consumes the cached payload (no HTTP). Empty payload renders “No feed items”. 404 URL and malformed XML fail the widget (not skip). Card 480×160 baked SVG still.
- Action: enable `feed` after github widgets when yaml `plugins.rss.widgets.feed` is present. Preflight `feed` is render (no `include_private`). Rss `fail_widget` MUST NOT fail the job when other widgets rendered. Rss-only 404: job succeeds with no files.
- Docs preview wraps rss fixture XML (parse fixture bytes, then render). **Zero live feeds.** MUST NOT add `/playground/rss` routes. MUST NOT add `data-group="feed"`. MUST NOT add `feed` to the github playground widget-id list.
- Do not patch consumer or repo `README.md`. Do not touch GitHub crawl policy (never REST `/languages`, never unauthenticated GitHub). Do not rewrite the http pack.

## Capabilities

### New Capabilities

- (none — rss is a first-party pack/widget/integration on the existing three-layer contracts, not a fourth capability)

### Modified Capabilities

- `plugin-contract`: First-party catalog is `github`, `wakatime`, `rss`, and `http`. This change adds `rss` without removing the others. Yaml document shape accepts optional `plugins.rss` as a sibling of `plugins.github` and MUST NOT forbid `wakatime`/`http` siblings. ADDED pack `rss` (`widgets: [feed]`, `integrations: [rss]`), yaml-only enablement, no `plugin_rss` Action bool. Rss `fail_widget` MUST NOT fail the job when other widgets rendered; rss-only 404 MUST NOT fail the job solely because of rss.
- `widget-contract`: ADDED widget `feed` (integration `rss` only, 480×160, required https `url` with no userinfo, `limit` 1–8 default 5, empty copy, skip/fail/parse).
- `integration-contract`: ADDED integration `rss` (auth none, never `Authorization` including URL userinfo, cache, SSRF with drained 3xx bodies and one 10s hop-loop deadline, GitHub-host fail, HTTP matrix with `fail_widget` after RSS backoff, frozen payload, rss-parser or equivalent). Docs preview wraps rss fixture XML and MUST NOT add `/playground/rss` routes.

## Impact

- Specs: MODIFIED deltas under this change for `plugin-contract`, `widget-contract`, and `integration-contract`. After archive/sync those become the contract SSOT. Catalog text names `github`, `wakatime`, `rss`, and `http`; it does not claim github+rss exclusivity.
- Code (library already applied; remaining apply is review remediation): `FeedOptionsSchema` userinfo refine; rss SSRF pin path (ssrfcheck, hostname-only TLS option bag, drain 3xx, one 10s deadline); `parseFeedUrl` userinfo reject; Action `EnabledWidget` + `feed` enablement + `render-feed` dispatcher; docs `rss-fixtures.ts` wrap. No `plugin_rss` on `ActionInputsSchema` or `action-yml.ts`.
- Out of scope: JSON/http widget rewrite, JSON Feed, WakaTime, authenticated feeds, extra plugins, flattened inputs, consumer README, GitHub crawl changes, `/playground/rss` routes, `PREVIEW_WIDGET_IDS` / `data-group="feed"`, Fumadocs playground UI, full renderer format matrix (gif/apng/webp animation), git commit.
