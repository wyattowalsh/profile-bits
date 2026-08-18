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
- [x] T3 `just lint && just test`

Forbidden globs this change: `packages/integrations/src/github/**`, REST `/languages`, `apps/docs/src/**`, consumer README.md, rss/http engine ids, T112 `graphql.ts`. No commit unless asked.
