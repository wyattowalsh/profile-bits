## Context

See `proposal.md` Why. Library W0–W4 already shipped the rss pack, parser, fixtures, and renderer stub. Live `FIRST_PARTY_PLUGIN_IDS` are `github`, `wakatime`, `rss`, and `http`. This design rebases the in-flight change onto that four-pack catalog and locks review remediations: URL userinfo MUST NOT become `Authorization`, RSS `fail_widget` MUST NOT fail the job when other widgets rendered, and docs preview MUST wrap rss fixtures without `/playground/rss` routes.

`decideAllGithubWidgetsSkipped` still filters via `WIDGET_INTEGRATIONS[widgetId]` including `"github"`; rss must not join that rule. Action `EnabledWidget` is still github-only (`demo` / `stats` / `languages`); `preflightWidget` still assumes `include_private` for every non-demo widget. Docs playground routes remain `/playground` → `/playground/github`. Http pack SSRF stays untouched.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Takumi 2.9.2 via `@profile-bits/renderer` only, Zod 4.4.3 already in catalog, Vitest 4, Biome 2.5. Thin `action.yml`. Never REST `/languages`. Never unauthenticated GitHub. No `plugin_rss` Action bool. No flattened `plugin_<plugin>_<widget>_<option>` inputs.

## Goals / Non-Goals

**Goals:**

- Keep first-party pack `rss` (widget `feed`, integration `rss`) enabled only by yaml `plugins.rss`, on a catalog of `github`, `wakatime`, `rss`, and `http`.
- Reject URL userinfo at yaml parse and at `parseFeedUrl`; never send `Authorization` (including from userinfo).
- DNS-pin production RSS GETs without injectable `fetch`; hostname-only TLS option bag; drain 3xx bodies; one 10s deadline for the hop loop.
- Enable Action `feed` after github widgets; preflight `feed` as render; rss `fail_widget` does not latch job failure; rss-only 404 succeeds with no files.
- Docs preview wraps rss fixture XML via `rss-fixtures.ts` (`parseRssXml(loadFixture)` + `renderFeedSvg`). Zero live feeds.

**Non-Goals:**

- JSON/http widget rewrite, JSON Feed, WakaTime, authenticated feeds, extra first-party plugins.
- Flattened Action inputs, `plugin_rss` bool, consumer or repo `README.md` patches.
- GitHub crawl policy changes, `/playground/rss` routes, `PREVIEW_WIDGET_IDS` / `data-group="feed"` / schema-form edits, full renderer format matrix.
- A generic shared http helper rewrite, changing `RSS_MAX_REDIRECTS` away from 5, or a second static JSON fixture pack.
- Applying, archiving, or committing in this propose/update workflow.

## Decisions

### 1. MODIFIED three-layer deltas; four-pack catalog

- **Choice:** Delta `plugin-contract`, `widget-contract`, and `integration-contract`. No fourth capability. Catalog text MUST name first-party ids `github`, `wakatime`, `rss`, and `http`. This change **adds** `rss`. It MUST NOT say “github and rss only”.
- **Why:** An exclusive github+rss catalog would delete `wakatime` and `http` on archive. Live `types.ts` already lists all four. Rss is a pack/widget/integration, not a new layer.
- **Alternative:** “github and rss only” — rejected; fights sibling packs. Alternative: new `rss-feed` capability — rejected; would fork the three-layer model.

### 2. Yaml-only enablement; userinfo fails parse; types.ts does not shrink the catalog

- **Choice:** Off unless yaml `plugins.rss` is present. `widgets.feed.url` required. Defaults: `filename: feed`, `limit: 5` (1–8), `animate: false`. `http://` fails **parse** (`z.url({ protocol: /^https$/ })`, protocol regex **without colon**). Userinfo fails parse: `FeedOptionsSchema.superRefine` — `new URL(url)` MUST have empty `username` and `password`. Unknown keys fail (`z.strictObject`). `DEFAULT_YAML` stays github-only; optional `rss` is additive on `PluginsConfigSchema`. Yaml MUST NOT forbid `wakatime` / `http` siblings.
- **Exclusive file for schema refine:** [`packages/core/src/types.ts`](packages/core/src/types.ts) plus parse-fail coverage in [`packages/core/src/parse-config.test.ts`](packages/core/src/parse-config.test.ts):
  - Keep `FIRST_PARTY_PLUGIN_IDS` as `github`, `wakatime`, `rss`, `http` (append-only; never replace with `["github","rss"]`)
  - `WIDGET_INTEGRATIONS.feed = ["rss"]`, `INTEGRATION_AUTH.rss = "none"`
  - Freeze comment: post-v0 exceptions are the four-pack catalog
- **Do not** add `plugin_rss` to `ActionInputsSchema` or [`packages/core/src/codegen/action-yml.ts`](packages/core/src/codegen/action-yml.ts).
- **Why:** Schema freeze lives in `types.ts`. URL userinfo would otherwise become an `Authorization` header on some HTTP clients. Flattened Action inputs are already banned.
- **Alternative:** `plugin_rss` Action bool — rejected. Alternative: rely on SSRF alone for userinfo — rejected; yaml must fail closed.

### 3. Layout: rss client owns HTTP; widget owns slice and card

- **Choice:**
  - Client: `packages/integrations/src/rss/` (`client.ts`, `hosts.ts`, `ssrf.ts`, `cache.ts`, `parse.ts`, `outcomes.ts`, `fixtures/`, `loadFixture.ts`)
  - Widget: `packages/plugins/src/rss/widgets/feed/` (`index.ts`, `template.ts`) plus pack `packages/plugins/src/rss/plugin.ts`
  - Barrel: `packages/integrations/src/index.ts`, `packages/plugins/src/index.ts`
- **Lock:** `createRssClient({ lookup })` one instance per Action run. Production Action/preview **omit** `fetch` so the DNS-pin path runs. Tests for pin call `ssrfGet(url, { lookup })` with **no** `fetch`. Order: github-host → cache/single-flight → ssrf GET → parse → freeze. **Client returns the full frozen list; widget slices to `limit`.** Widget does **no HTTP**. Empty payload → “No feed items”.
- **`plugin.ts`:** id `rss`, widgets `[feed]`, integrations `[rss]`, `bitsUsed: ["Theme","Frame","Stack","Row","Text","Muted"]` as **string literals** (do not create `packages/bits`).
- **Template:** Takumi node `width/height 100%`, card 480×160, theme tokens only `bg card text muted accent border font`. Follow existing core import style (`./x.js`).
- **Why:** Matches github: widgets consume cached payloads. Injecting `fetch` in production skips the pin path (RV-S-002).
- **Alternative:** Client slices to limit — rejected; two widgets could not share. Alternative: production `createRssClient({ fetch })` — rejected; that is the pin-path bypass.

### 4. Parser is `@rowanmanning/feed-parser`, not rss-parser HTTP

- **Choice:** Catalog pin `@rowanmanning/feed-parser@2.1.4`. ESM `parseFeed(xmlString)` only; does **not** fetch. Normalize RSS 0.9/1.0/2.0 + Atom 0.3/1.0. Map `published ?? updated` → ISO `published_at`. Slice to `limit` after parse (no `maxItems`). Throws `code: INVALID_FEED` → typed `RssParseError` → `fail_widget`. Spec text stays “rss-parser or equivalent”; this design names rowanmanning.
- **Why:** User allowed equivalent. `rss-parser@3.13.0` is stale CJS, ships HTTP (`parseURL`), xml2js, worse Atom `link rel=alternate`. Never call parser HTTP.
- **Alternative:** `feedsmith` — rejected; also parses JSON Feed. Alternative: `@extractus/feed-extractor` — rejected; defaults to fetching URLs. Alternative: `fast-xml-parser` — rejected; we would reimplement mapping.

### 5. SSRF: ssrfcheck + ipaddr.js + hostname-only TLS; never pass a URL with userinfo

- **Choice:** Reuse `ssrfcheck` already in integrations `package.json` (same options as [`http/ssrf.ts`](packages/integrations/src/http/ssrf.ts)): `isSSRFSafeURL(href, { allowedProtocols: ["https"], allowUsername: false, autoPrependProtocol: false })`. Catalog pin `ipaddr.js@2.5.0`. `lookup({ all: true })`; allow only `unicast` after IPv4-mapped conversion. Pin the validated address set into the connect lookup. TLS `servername` = original hostname (or IP literal hostname).
- **`pinnedHttpsGet`:** pass **option bag only** (`hostname`, `port`, `path`, `servername`, `headers`, `lookup`, `signal`). Never `https.request(url, ...)` — Node would send `Authorization` from URL userinfo.
- **Redirects:** `RSS_MAX_REDIRECTS = 5` follows (match http; do **not** edit the http pack). 3xx: `await body.cancel()` (web) / destroy Node stream **before** reading `Location`. Reject https→http; re-validate scheme/host/IP each hop.
- **Deadline:** one `AbortSignal.timeout(RSS_TIMEOUT_MS)` for the **whole** hop loop (not five per-hop 10s timers). `signal.removeEventListener("abort", onAbort)` in `pinnedHttpsGet` `finally` / request close.
- **Body cap:** abort if `Content-Length > 1048576` **or accumulated body > 1 MiB**. Headers: `User-Agent: profile-bits-rss/0`; `Accept: application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1`. Never `Authorization`.
- **GitHub-owned hosts fail before connect:** hostname lowercased, trailing-dot stripped; match `github.com`, `*.github.com`, `githubusercontent.com`, `*.githubusercontent.com`. Same check every redirect hop.
- **XXE:** do not resolve external entities; `SYSTEM`/`file://` fixture must fail widget or ignore the entity (never read disk). Tests: response JSON/text MUST NOT contain passwd file contents.
- **Why:** URL userinfo, DNS rebinding, IPv4-mapped loopback, CGNAT, unique-local (incl. AWS `fd00:ec2::254`), five stacked hop timeouts (50s), and undrained 3xx bodies were review holes.
- **Alternative:** Extra `undici` dep — rejected. Alternative: change http-pack hop count — rejected; RSS keeps 5. Alternative: Zod `z.httpUrl()` — rejected; allows `http`.

### 6. RSS backoff terminal outcome is `fail_widget`; engine does not latch it as job failure

- **Choice:** Local 3-attempt backoff (200/400/800ms, honor `Retry-After` capped at 10s). 401/403/404 → `fail_widget`; 429/5xx → retry then `fail_widget`; timeout/SSRF/GitHub-host/malformed XML/userinfo → `fail_widget`. Do **not** import github `classifyGithubHttp`. Do **not** fold rss into `decideAllGithubWidgetsSkipped`.
- **Engine latch:** `failedWidget` only for **github-integration** widgets (`usesGithubIntegration`). Rss `fail_widget` → no write, no throw at end. Rss-only 404: job succeeds with no files (do not fail solely because of rss).
- **Why:** GitHub fail-after-backoff fails the **run**. Applying that to RSS would let a Substack 503 fail github `stats`. Http json has a json-only `fail_job` path; rss does not copy that.
- **Alternative:** `fail_run` like github 429 — rejected. Alternative: rss-only 404 fails the job — rejected; spec is do not fail solely because of rss.

### 7. Cache is run-scoped Map inside the rss client

- **Choice:** Key `(method, url, params)` + in-flight single-flight so two callers of the same URL share one GET. No MSW/nock; mock `lookup` + `node:https.request` (pin-path) or injected `fetch` only where a test explicitly covers the fetch branch.
- **Why:** Matches github REST cache key. Pin-path tests MUST omit `fetch`.
- **Alternative:** Intercept-layer HTTP mocks — rejected.

### 8. Docs preview wraps rss fixtures; no `/playground/rss`

- **Choice:** Integration fixtures stay at `packages/integrations/src/rss/fixtures/` (`atom.xml`, `rss2.xml`, `empty.xml`, `malformed.xml`, `xxe.xml`) plus `loadFixture.ts`. Docs preview adds [`apps/docs/src/preview/server/rss-fixtures.ts`](apps/docs/src/preview/server/rss-fixtures.ts) that `parseRssXml(loadFixture(...))` then `renderFeedSvg`. Zero live network. Fixture pill copy can stay in AGENTS.md.
- **Do not** add `/playground/rss`. Do not add `data-group="feed"`. Do not change `PREVIEW_WIDGET_IDS`. Do not call `createRssClient({ fetch })` from preview (RV-S-002).
- **Why:** Adding `feed` to `PREVIEW_WIDGET_IDS` explodes permalink `it.each` and fights `data-group="feed"` / `/playground/rss` bans. `packages/integrations/AGENTS.md` says docs fixtures MUST wrap the integration’s fixtures, not invent a second JSON pack.
- **Alternative:** Live Substack fetches in docs — rejected. Alternative: `/playground/rss` route — rejected. Alternative: reuse static JSON — rejected; wrong format.

### 9. Minimal renderer `renderSvg` stub; exclusive files T100 can replace

- **Choice:** Exclusive `packages/renderer/src/index.ts` (and `svg.ts` if split). `renderSvg(node)` only; register vendored Geist from `packages/renderer/fonts/`; 480×160. Plugins MUST NOT import `takumi-js` / `@takumi-rs/*`. Do not implement gif/apng here. Tree-level widget test so the card is proven if Takumi smoke is skipped. Baked still SVG: no `<style>`, `@keyframes`, SMIL, `foreignObject`. `animate` is plumbed only.
- **Why:** Full renderer collides with T100. A stub unblocks feed tests. Library already landed this stub.
- **Alternative:** Skip renderer and assert JSON payload only — rejected; acceptance requires a 480×160 card.

### 10. Action enablement: append feed; render in `render-feed.ts`; add workspace deps

- **Choice:**
  - `EnabledWidget` += `{ id: "feed"; options: FeedOptions }`.
  - `enabledWidgets`: if `config.plugins.rss?.widgets.feed` is present, **append** feed after github widgets. Mixed yaml may still throw on the first github widget until github `renderWidget` exists; rss-only yaml is the Action success path.
  - `preflightWidget`: `demo` and `feed` → `"render"` (do not read `include_private`).
  - New [`packages/action/src/render-feed.ts`](packages/action/src/render-feed.ts): `createRssClient()` once per `runEngine`; `renderFeedFromClient`; theme from `config.theme`; file `{output_dir}/{filename}.svg` (or format default svg). Catch `RssClientError` → `{ outcome: "fail_widget" }`.
  - [`packages/action/src/main.ts`](packages/action/src/main.ts): `id === "feed"` uses that renderer; other ids keep `requireRenderWidget` behavior.
  - Engine comment “Must not perform GitHub HTTP here” stays true for `engine.ts`; RSS HTTP lives in `render-feed.ts`.
  - [`packages/action/package.json`](packages/action/package.json): add workspace deps `@profile-bits/core`, `@profile-bits/integrations`, `@profile-bits/plugins`, `@profile-bits/renderer` if missing (`pnpm install` once if the lockfile changes).
- **Out of scope here:** `output_pair` / `animate` engine implementation; special-casing missing `github_token` for rss-only (never-unauth GitHub lock; tests pass a non-empty token); `flatten.ts` / `DEFAULT_YAML`.
- **Why:** Adding `{ id: "feed", options: FeedOptions }` without a `feed` preflight branch typebreaks and would read undefined `include_private`. Action `package.json` has no workspace `dependencies` today; render-feed will not resolve without them.
- **Alternative:** Put RSS HTTP in `engine.ts` — rejected. Alternative: wait on userinfo refine before engine enablement — rejected; `FeedOptions` already exists (W2a ∥ W1a).

### 11. Catalog pins, AGENTS.md, exclusive-glob remediation graph

- **Choice:** Catalog pins already landed (`@rowanmanning/feed-parser` 2.1.4, `ipaddr.js` 2.5.0, `ssrfcheck` in integrations). Do not add extra `undici`. Follow existing `./x.js` imports.
- **AGENTS.md remaining:** [`packages/action/AGENTS.md`](packages/action/AGENTS.md) (feed dispatcher / fail_widget latch); [`apps/docs/AGENTS.md`](apps/docs/AGENTS.md) rss fixture wrap sentence only (`rss-fixtures.ts`, no `/playground/rss`). Do not edit repo `README.md`.
- **Exclusive globs (one writer):** see `tasks.md` §8. Never two agents on `types.ts`, `ssrf.ts`, `client.ts`, `engine.ts`, `pnpm-lock.yaml`, or `tasks.md` except W4 ticks **new** §8 boxes.
- **Why:** Library W0–W4 stay ticked. Remediation is additive checkboxes.
- **Alternative:** Untick library tasks and re-apply — rejected; would hide completed work.

## Risks / Trade-offs

- [github+rss-only catalog deletes wakatime/http on archive] → Name all four first-party ids; this change adds `rss` only.
- [URL userinfo becomes Authorization] → yaml superRefine + `allowUsername: false` + `parseFeedUrl` reject + never `https.request(url, ...)`.
- [DNS rebinding TOCTOU] → Pin validated IPs into connect lookup; TLS `servername` = original host; production omit `fetch`.
- [Redirect to private or http] → Re-validate each hop, max 5, reject https→http, drain 3xx bodies first.
- [Five per-hop timeouts = 50s] → One 10s `AbortSignal` for the whole hop loop; abort listener removed in `finally`.
- [IPv4-mapped / CGNAT / unique-local / decimal / localhost] → ssrfcheck + ipaddr allow-only-unicast after mapping; extra tests listed in tasks §8.
- [RSS 503 fails github stats] → Terminal `fail_widget`; engine latch only for github-integration widgets.
- [Rss-only 404 fails CI] → Job succeeds with no files; do not copy http json-only `fail_job`.
- [XXE reads disk] → Do not resolve external entities; assert no passwd contents.
- [`/playground/rss` explodes permalink matrix] → New `rss-fixtures.ts` wrap; do not change `PREVIEW_WIDGET_IDS`.
- [Action package.json missing workspace deps] → W2b adds them; one `pnpm install` if lockfile changes.
- [Mixed github+rss throws until github renderWidget exists] → Accepted; rss-only yaml is the Action success path.
- [Flattened `plugin_rss_feed_url` sneaks in] → `--check` already matches `plugin_<plugin>_<widget>_<option>`; snapshot asserts no `plugin_rss`.
- [octokit imported from rss] → rss module must not import octokit; github crawl unchanged.

## Migration Plan

Greenfield additive pack. Default committed yaml stays github-only; existing consumers unchanged. Library apply already landed. Remaining apply follows `tasks.md` §8 (do not untick §1–§7). Catalog pins already present; `pnpm install` only if Action workspace deps change the lockfile. Rollback: omit `plugins.rss` from yaml; delete this change folder before archive. Do not archive or commit unless asked.

## Open Questions

(none — four-pack catalog, userinfo/`Authorization`, `fail_widget` vs job, preview=fixtures not routes, hop count 5, and exclusive paths are locked above)
