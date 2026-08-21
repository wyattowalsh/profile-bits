## Why

The WakaTime library pack (`coding` widget, `wakatime` client, thin `wakatime_token`, pack-gated `decideWakatimeToken`) is already in tree, but the Action never runs it. `EnabledWidget` is `demo | stats | languages` only, `runMain` calls `runEngine(loaded)` with no deps, and `createWakatimeClient` has zero Action callers — so yaml `plugins.wakatime` cannot write a coding card under `output_dir`. README delivery is the Action; that hole is the problem this change closes.

## What Changes

- **MODIFIED Action runtime behavior** (compose, not a fourth capability): inject `renderWidget`, disk `writeFiles`, and existing git/gist output ports from `runMain`. `runEngine(loaded, { renderWidget, probeCapabilities, tokenClass, writeFiles, output })`. Publish probe is **token-class**, not widget-gated. If a github crawl client exists, use `github.capabilities` / `github.tokenClass`. Else `publishProbeFromGithubToken(github_token)` via exported `inferGithubTokenClass` — no `createGithubClient`, no `GET /user`. `canGist` iff `user_pat`; `canPrivate`/`canContributions` stay false. Constructing `createGithubClient` remains widget-gated. Do not rewrite `git.ts` / `gist.ts`. WakaTime-only gist and PAT skip-ci must work. Keep `engine.ts` HTTP-free.
- Extend `EnabledWidget` with `{ id: "coding"; options: CodingOptions }`. `enabledWidgets` also reads `config.plugins.wakatime?.widgets?.coding`. Rss/http ids MUST NOT appear in this change.
- Call `decideWakatimeToken` immediately after `decideActionToken`. Pack on + missing/`""`/whitespace token → `EngineError("fail_job")` with no token value in the message. Pack off MUST NOT require `wakatime_token` and MUST NOT construct a WakaTime client.
- Construct **one** shared `createWakatimeClient({ token })` per `runMain` when the pack is on; construct **one** `createGithubClient` per run when any github widget is on. GitHub dispatcher uses the existing client (`loadPayload` + `renderDemoSvg` / `renderStatsSvg` / `renderLanguagesSvg`). Do not edit `packages/integrations/src/github/**`.
- Coding render path: `fetchStats` → `renderCodingSvg` → `{ outcome: "render", files: [{ path: filename, bytes }] }`. Map `WakatimeClientError.outcome` through. Widget package stays HTTP-free (do **not** add `renderCodingFromClient`). Successful writes land under `output_dir` using yaml `filename` (default `wakatime` → `wakatime.svg` for svg).
- Add Action workspace deps (`@profile-bits/core`, `@profile-bits/integrations`, `@profile-bits/plugins`, `@profile-bits/renderer`). ncc keeps `--external @takumi-rs/core`. No `dist/` on `main`. No flattened `plugin_wakatime_coding_*`. No `plugin_wakatime` bool.
- Languages GraphQL completeness stays **T112 leftover** (document; do not steal `github-api-fetch-policy`). Document **F6** (`api_domain` is secret-adjacent) and **F7** (`api.wakatime.com` uses Wakapi compat path). Do not rewrite Cloud to `api.wakatime.com`.

## Capabilities

### New Capabilities

- (none — this change wires existing first-party pack `wakatime` / widget `coding` / integration `wakatime` through the Action. Do not invent a fourth capability such as `action-runtime`.)

### Modified Capabilities

- `plugin-contract`: Action constructs one shared WakaTime client when yaml `plugins.wakatime` is on and MUST NOT construct it when the pack is off. Pack-gated token fail_job is enforced in the engine (not at `loadConfig`). GitHub widgets keep using the existing github client. Rss/http MUST NOT be enumerated in `enabledWidgets` in this change. Coding MUST NOT join `decideAllGithubWidgetsSkipped`.
- `widget-contract`: When coding renders, the Action MUST write the card under `output_dir` using yaml `filename` (default `wakatime.svg` for svg). Empty payload still writes “No coding data”. 404 `fail_widget` writes no files. Skip-without-write is unchanged.

Skip creating `openspec/changes/wire-wakatime-action-runtime/specs/action-public-api/spec.md` (`action-public-api` is not synced). Thin `wakatime_token` already lands via the library change + codegen. Do not delta `integration-contract` (shared client, path split, SSRF, HTTP matrix already specified there).

## Impact

- Specs: MODIFIED deltas under this change for `plugin-contract` and `widget-contract` only. After archive/sync those become the contract SSOT. Do not delta `action-public-api` or invent `action-runtime`.
- Code (later apply, not this propose): `packages/action` only — `package.json` / lockfile / tsconfig paths, `clients.ts`, `render-wakatime.ts`, `render-github.ts`, `write-files.ts` if needed, `render.ts` dispatcher, `engine.ts` / `engine.test.ts`, `main.ts` / `main.test.ts`, optional `load-config.test.ts` gaps, `packages/action/AGENTS.md`. ncc `--external @takumi-rs/core`. No new npm deps beyond catalog `workspace:*`.
- Out of scope: rss/http engine wiring (same `engine.ts` bottleneck; follow-up), docs playground / Fumadocs, consumer `README.md` patch, flattened inputs, `plugin_wakatime` bool, REST `/languages`, `packages/integrations/src/github/**`, T112 GraphQL, injected-`fetch` DNS pin (Track C), Hakatime native, live WakaTime in tests, git commit, archive.
- Residuals documented, not fixed here: **F6** `api_domain` exfils the Basic key by design (Wakapi; yaml is secret-adjacent); **F7** `api.wakatime.com` as yaml domain uses the Wakapi compat path (likely 404 `fail_widget`).
