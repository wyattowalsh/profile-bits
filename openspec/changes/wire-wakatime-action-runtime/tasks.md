## 1. Phase P OpenSpec artifacts

Ids are stable for subagent dispatch. Exclusive: `openspec/changes/wire-wakatime-action-runtime/**`. FORBIDDEN during propose: `packages/**` product code, consumer README.md, git commit.

- [x] P1 `openspec new change "wire-wakatime-action-runtime"`
- [x] P2.1 `proposal.md` (MODIFIED Action runtime behavior; pack-gated token; one shared WakaTime client; github dispatcher uses existing client; rss/http not enumerated; skip `action-public-api`)
- [x] P2.2 `[P]` plugin-contract + widget-contract spec deltas (no fourth capability; no `action-public-api`)
- [x] P2.3 `[P]` `design.md` (HTTP-free engine; exclusive new files; ncc externals; T112 leftover; F6/F7; why rss/http deferred)
- [x] P2.4 `tasks.md` + `openspec status --change wire-wakatime-action-runtime --json`

Stop for review before apply. Do not implement Action product code in this propose workflow.

## 2. Wave D0 — deps (serial, first)

`[P]` = parallel iff exclusive globs do not overlap. **Single writer** on `engine.ts`, `main.ts`, `package.json`+lockfile, `render.ts`.

- [x] D0.1 exclusive `packages/action/package.json` + `packages/action/tsconfig.json` `paths` + `pnpm-lock.yaml` (one `pnpm install`). Add `workspace:*` for `@profile-bits/core`, `@profile-bits/integrations`, `@profile-bits/plugins`, `@profile-bits/renderer`. Exclusive lockfile: do not parallel with other catalog edits.

## 3. Wave D1 — leaf adapters `[P]` after D0

- [x] D1.1 `[P]` exclusive `packages/action/src/clients.ts` (+ test): factory `{ github?: GithubClient, wakatime?: WakatimeClient }` from `LoadedActionConfig`. Pack off → `wakatime: undefined`. Pack on + missing token → **do not** construct (engine already `fail_job`s). Never log token.
- [x] D1.2 `[P]` exclusive `packages/action/src/render-wakatime.ts` (+ test): fixture `last_7_days.json` through a fake `fetchStats`; opening SVG `480×160`; empty payload → write “No coding data”; 404 `fail_widget` → no files; 401 `fail_run` bubbles; zero `fetch` inside `@profile-bits/plugins` coding module (spy).
- [x] D1.3 `[P]` exclusive `packages/action/src/render-github.ts` (+ test): mock `loadPayload`; demo/stats/languages return blobs; **FORBIDDEN** `packages/integrations/src/github/**`. Document T112 in a one-line comment only if the languages payload shape is REST-only.
- [x] D1.4 `[P]` exclusive `packages/action/src/write-files.ts` (+ test) if git.ts does not already export a disk `WriteWidgetFiles`. Prefer wrapping existing git helpers over a third writer.

## 4. Wave D2 — dispatcher (after D1)

- [x] D2.1 exclusive `packages/action/src/render.ts` (+ test): switch coding vs github; unknown id is a type error (exhaustiveness). Rss/http ids must not appear.

## 5. Wave E — engine (serial, after D2 types exist)

- [x] E1.1 exclusive `packages/action/src/engine.ts`: `EnabledWidget` + `enabledWidgets` + `preflightWidget` coding branch (`"render"`).
- [x] E1.2 same file, same agent: `decideWakatimeToken` after github token; `EngineError fail_job` message must not include the token value.
- [x] E1.3 exclusive `packages/action/src/engine.test.ts`:
  - pack off, no `wakatime_token`, github widgets still render
  - pack on + missing/`""`/whitespace → `fail_job` **before** `renderWidget`
  - pack on + token: coding blob under `output_dir`/`filename` (default `wakatime.svg`)
  - coding `fail_widget` does not throw `AllGithubWidgetsSkippedError` when github rendered
  - wakatime-only yaml + `allow_skipped: false` is not “every github widget skipped”
  - `dry_run`: files listed, `did_commit` false, commit/gist not called

## 6. Wave M — main compose (serial after E)

- [x] M1.1 exclusive `packages/action/src/main.ts`: `runEngine(loaded, { renderWidget, probeCapabilities, writeFiles, output })`.
- [x] M1.2 exclusive `packages/action/src/main.test.ts`: `INPUT_WAKATIME_TOKEN` passthrough; pack-on empty token fails; `dry_run` forces `did_commit` false when coding files exist.
- [x] M1.3 exclusive `packages/action/src/load-config.test.ts` only if gaps remain: empty token → `undefined`; pack off does not require token; `plugins.wakatime: {}` → coding defaults. Do not add load-time fail (engine owns pack gate).

## 7. Wave Q — AGENTS + ncc

- [x] Q1.1 `[P]` exclusive `packages/action/AGENTS.md`: document injected render + pack-gated token + one client per run. Document T112 leftover, F6 (`api_domain` secret-adjacent), and F7 (`api.wakatime.com` compat path).
- [x] Q1.2 `[P]` exclusive Action build script / ncc flags if present: keep `--external @takumi-rs/core`. No `dist/` on `main`.

## 8. Wave T — verify (serial)

- [x] T1 `pnpm exec vitest run packages/action packages/core packages/integrations/src/wakatime packages/plugins/src/wakatime packages/renderer` (494 passed)
- [x] T2 `pnpm generate-action --check` (must still reject `plugin_wakatime_coding_*`; `wakatime_token` remains thin)
- [x] T3 `just lint && just test` (lint exit 0; 1254 passed)

Forbidden globs this change: `packages/integrations/src/github/**`, REST `/languages`, `apps/docs/src/**`, consumer README.md, rss/http engine ids, T112 `graphql.ts`. No commit unless asked.

## Leftovers

Not a new change id on disk. No commit. No archive.

- Track C injected-`fetch` DNS pin remains a later OpenSpec unit `harden-injected-fetch-dns-pin` (shared wakatime/rss/http). **Not created** in this program — needs its own change because it is not a small single-pack fix.
- T112 GitHub GraphQL languages still leftover (`github-api-fetch-policy`).
- rss/http `enabledWidgets` still deferred (engine bottleneck; `render.ts` stays coding vs github).

## 9. Wave F0 — OpenSpec Decision 4 `[P]` (do not reopen D/E/M)

No `openspec` CLI. Do not rewrite Leftovers. Do not uncheck D/E/M/Q/T.

- [ ] F0.1 `[P]` exclusive `openspec/changes/wire-wakatime-action-runtime/design.md` — Decision 4 only. No `openspec` CLI. No Decision 6 / Track C.
- [x] F0.2 `[P]` exclusive `openspec/changes/wire-wakatime-action-runtime/tasks.md` — append F/W/V checkboxes. Do not reopen D/E/M. Do not rewrite Leftovers.
- [ ] F0.3 `[P]` exclusive `openspec/changes/wire-wakatime-action-runtime/proposal.md` — replace widget-gated probe sentence.

## 10. Wave 1 — F1 / W1 / F5 / F3 / F4 `[P]`

FORBIDDEN: `engine.ts`, `clients.ts`, `engine.test.ts`, `packages/integrations/src/github/**`, REST `/languages`, Track C pin, T112, rss/http ids in `render.ts`, flattened inputs, `plugin_wakatime`, extra ranges, Bearer, `?api_key=`, `WidgetRenderResult.code`.

- [ ] F1 `[P]` exclusive `packages/action/src/publish-probe.ts` + `publish-probe.test.ts`: `ghp_` / `github_pat_` / `gho_` → `user_pat`, `canGist: true`; `ghs_` → `actions_installation`, `canGist: false`; `ghu_` / `ghy_` → `github_app_install`, `canGist: false`. Console spy: PAT never logged. Import `inferGithubTokenClass` from `@profile-bits/integrations`. FORBIDDEN: `packages/integrations/src/github/**`.
- [ ] W1 `[P]` exclusive `packages/integrations/src/wakatime/client.ts` + `client.test.ts`: keep ctor arity `(outcome, message, status?)`; default `.code` from outcome+status (`missing_token`, `dns_no_addresses`, `dns_blocked`, `body_too_large`, `invalid_response`, `transport`, `http_unauthorized`, `http_not_found`, `http_bad_request`, `http_forbidden`, `http_rate_limited`, `http_redirect`, `http_accepted`, `http_server`, `stale`, `http_unclassified`, `unsafe_api_domain`); ctor `redactSecrets(message)`; wrap `UnsafeApiDomainError` → `fail_widget` + `unsafe_api_domain` without hostname; move `assertPublicResolvedAddresses` inside `cache.rest`; second `fetchStats` does not call `lookup`; existing 401/404/pin/mixed-AAAA still pass. No `cause`; no `http.ts` / `types.ts` / `cache.ts` edits.
- [ ] F5 `[P]` exclusive `packages/action/src/render-wakatime.ts` + `render-wakatime.test.ts` — outcome-only map `fail_widget | fail_run | fail_after_backoff | fail_job` to `{ id, outcome }`; 401 → `{ id: "coding", outcome: "fail_run" }`; no files; token absent; **do not** set `code` on the result. Rethrow unknown. Do not read `error.code` in Wave 1.
- [ ] F3 `[P]` exclusive **new** `packages/action/src/engine-wakatime-publish.test.ts`: WakaTime-only + gist + injected `canGist: true` still renders; WakaTime-only + gist + omitted probe → `GistOutputError`; WakaTime-only + commit + `tokenClass: "user_pat"` → message without `[skip ci]`; omitted `tokenClass` → message with `[skip ci]`; stub render returning `fail_run` → `EngineError`, no `writeFiles`, no token in message. FORBIDDEN: `engine.ts`, `engine.test.ts`.
- [ ] F4 `[P]` exclusive `packages/action/AGENTS.md` — Ports sentence only. Leave T112/F6/F7.

## 11. Wave 2 — F2 main compose (after F1)

- [ ] F2.1 exclusive `packages/action/src/main.ts` — always inject `probeCapabilities` + `tokenClass` (github client if present, else `publishProbeFromGithubToken`); `clientFactories?: ActionClientFactories` on `RunMainOptions` forwarded to `createActionClients`; `workflowError`: `redactSecrets`; if `error instanceof EngineError` emit `::error::${decision} ${message}`. Do not edit `clients.ts`.
- [ ] F2.2 same agent, exclusive `packages/action/src/main.test.ts`: `ghs_` WakaTime-only probe **defined**, `canGist === false`, `tokenClass === "actions_installation"`; unmocked engine: `ghs_` + gist → `GistOutputError`, no coding write, no tokens in message; mocked: `ghp_` + gist → `canGist === true`, `user_pat`, `clientFactories.createGithubClient` not called; mocked: PAT + commit → `tokenClass === "user_pat"`; pack off still does not construct WakaTime client.

## 12. Wave 3 — V verify (serial after F2 + F3 + W1 + F5)

- [ ] V1 `pnpm exec vitest run packages/action packages/integrations/src/wakatime`
- [ ] V2 `pnpm generate-action --check`
- [ ] V3 `pnpm exec biome check` on touched files; do not format `apps/docs/**`. No commit.
