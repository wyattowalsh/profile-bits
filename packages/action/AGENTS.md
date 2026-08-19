# @profile-bits/action

GitHub Action runtime. Root `action.yml` is **thin** Marketplace inputs; widget options live in `.github/profile-bits.yml`.

## Thin inputs

`user`, `github_token`, `committer_token`, `config`, `output_action` (`none` | `commit` | `pull-request` | `gist`), `dry_run`, optional `format`/`theme`/`output_pair`/`animated`, optional `plugin_github`, optional `wakatime_token` (no default; required only when yaml `plugins.wakatime` is present — pack-gated in the engine, not at `loadConfig`), optional `http_token_env` (env **name**, no default). Empty/`""` `github_token` ≠ omitted → **fail job**. Empty `wakatime_token` with the wakatime pack on → **fail job**. Pack off does not require `wakatime_token`. No `plugin_wakatime`, `plugin_rss`, or `plugin_http` bool.

`runs.using: node24` only. `main: dist/index.js`.

## Json enablement

Yaml `plugins.http.widgets.json` (required https `url`) enables widget `json` independently of github. Yaml `plugins.http.widgets.chips` (required `preset` + `types`; no `url`/`headers`/`bits`) enables widget `chips` independently of github. `plugins.http: {}` is widget-less and does not auto-enable json or chips. No `plugin_http` bool and no flattened `plugin_http_*` / `plugin_http_chips_*` inputs.

`http_token_env` is the **name** of a raw process env var (not `INPUT_*`). `runMain` looks up `env[http_token_env]`. Unset/whitespace name → no `Authorization`. Named env empty/whitespace/unset → json `fail_widget`. Auth is optional.

Http-only yaml where json or chips do not render fails the job (`fail_job`) unless `allow_skipped: true`. Json or chips `fail_widget` in a mixed github+http run still writes successful github blobs. `github_token` is still required.

Engine enumerates github widgets + coding + json + chips + feed. Existing `createHttpClient` — no second http client.

## Ports

- `src/engine.ts` is a fetch/render **port**: no HTTP, no `createHttpClient` / `createWakatimeClient`. Engine enumerates github widgets + coding + json + chips + feed. `main.ts` injects `renderWidget` (join `render.ts` coding/github dispatcher with json and chips compose plus feed — do not put rss/http ids in `render.ts`). `runEngine(loaded, { renderWidget, probeCapabilities, tokenClass, writeFiles, output })`. Publish probe is **token-class**, not widget-gated. If a github crawl client exists, use `github.capabilities` / `github.tokenClass`. Else `publishProbeFromGithubToken(github_token)` via exported `inferGithubTokenClass` — no `createGithubClient`, no `GET /user`. `canGist` iff `user_pat`; `canPrivate`/`canContributions` stay false. Constructing `createGithubClient` remains widget-gated. Do not rewrite `git.ts` / `gist.ts`. WakaTime-only gist and PAT skip-ci must work.
- One shared WakaTime client per run when yaml `plugins.wakatime` is on (`createActionClients`); never construct when the pack is off. One GitHub client per run when any github widget is on. One `createHttpClient({ token })` per run (omit `fetch` so pinned HTTPS GET runs; never `fetch: globalThis.fetch` in production).
- `src/engine.ts` + `src/output.ts` own the commit/gist **interface**.
- `src/git.ts` and `src/gist.ts` **implement** those ports. They do not edit `engine.ts` / `main.ts`.
- Gist is SVG-only and requires `canGist`. Action commits widget files only — it does **not** patch `README.md`.
- Rss Action render lives in `render-feed.ts`; one `createRssClient()` per run; rss `fail_widget` does not fail the job; no `plugin_rss` bool.
- Languages payload stays REST-crawl-shaped until `github-api-fetch-policy` T112 (`graphql.ts` `nodes(ids:)` batches of 100). Do not REST `/languages`.
- **F6:** yaml `api_domain` is secret-adjacent (Wakapi receives RFC Basic `key:`). Hostname-only SSRF remains; do not denylist non-`wakatime.com` hosts.
- **F7:** `api.wakatime.com` uses the Wakapi compat path (likely 404 `fail_widget`). Default host stays `wakatime.com`. Do not rewrite Cloud onto `api.wakatime.com`.

## Bundle

ncc **`--external @takumi-rs/core`** (and wasm). Never inline `.node`. Copy gnu `.node` + `takumi_wasm_bg.wasm` into `dist/` with the loader’s require graph. `dist/` is gitignored on `main`. Do not import Takumi from the Action; widgets go through `@profile-bits/renderer`.
