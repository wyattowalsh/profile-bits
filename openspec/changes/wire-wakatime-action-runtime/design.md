## Context

See `proposal.md` Why. Library change `add-wakatime-integration` already shipped pack `wakatime`, widget `coding`, integration client, pack-gated `decideWakatimeToken`, and thin `wakatime_token`. Synced three-layer specs exist (`plugin-contract`, `widget-contract`, `integration-contract`). `action-public-api` is **not** synced — skip that spec file (same pattern as the library change). Do not invent a fourth capability.

`packages/action/src/engine.ts` `EnabledWidget` is still `demo | stats | languages` only (`70–73`, `294–309`). `runMain` calls `runEngine(loaded)` with **no deps**. `createWakatimeClient` / `decideWakatimeToken` have zero Action callers. `packages/action/package.json` has no workspace runtime deps (core is a tsconfig path only). Default `writeFiles` returns paths and does not touch disk.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Takumi 2.9.2 via `@profile-bits/renderer` only, Vitest 4, Biome 2.5. Thin `action.yml`. Never REST `/languages`. Never unauthenticated GitHub. No `plugin_wakatime` Action bool. No flattened `plugin_<plugin>_<widget>_<option>` inputs. Engine stays HTTP-free. ncc `--external @takumi-rs/core`. `dist/` gitignored on `main`.

## Goals / Non-Goals

**Goals:**

- Wire the Action so yaml `plugins.wakatime` writes a 480×160 coding SVG under `output_dir` / `filename`.
- Pack-gated token in the engine; one shared WakaTime client per run when the pack is on; never construct when pack is off.
- GitHub dispatcher uses the **existing** `createGithubClient` + widget SVG renderers. Languages GraphQL completeness stays T112 leftover.
- Keep `engine.ts` HTTP-free. Compose clients, render adapters, and output ports in new files plus `main.ts` injection.

**Non-Goals:**

- Rss `feed` / http `json` engine wiring (same `engine.ts` bottleneck; follow-up change).
- Docs playground / Fumadocs, consumer `README.md` patch, flattened inputs, `plugin_wakatime` bool.
- Editing `packages/integrations/src/github/**`, finishing T112 GraphQL, REST `/languages`.
- Injected-`fetch` DNS rebinding pin (Track C: `harden-injected-fetch-dns-pin`).
- Hakatime native adapter, live WakaTime in tests, Playwright, archive, git commit.
- Rewriting Cloud hostname to `api.wakatime.com` (F7).

## Decisions

### 1. MODIFIED three-layer deltas, not a fourth capability

- **Choice:** Delta `plugin-contract` (Action constructs client when pack on; coding in `enabledWidgets`; rss/http not enumerated) and `widget-contract` (coding files under `output_dir` / `filename`). No `action-runtime` capability. Skip `action-public-api` (not synced). Do not delta `integration-contract` (shared client, path split, SSRF, HTTP matrix already specified).
- **Why:** WakaTime is already a pack/widget/integration. This change is Action compose. A new capability would fork the three-layer model.
- **Alternative:** New `action-runtime` spec — rejected; proposal forbids inventing a fourth capability.

### 2. HTTP-free engine; exclusive new files

- **Choice:**
  - `packages/action/src/clients.ts` — factory `{ github?: GithubClient, wakatime?: WakatimeClient }` from `LoadedActionConfig`. Pack off → `wakatime: undefined`. Pack on + missing token → **do not** construct (engine already `fail_job`s). Never log token.
  - `packages/action/src/render-wakatime.ts` — `fetchStats` → `renderCodingSvg` → files. Map `WakatimeClientError.outcome`. Do **not** add `renderCodingFromClient` on the widget package (rss/http pattern).
  - `packages/action/src/render-github.ts` — dispatcher arm for demo/stats/languages using existing `loadPayload` + `renderDemoSvg` / `renderStatsSvg` / `renderLanguagesSvg`. **FORBIDDEN** `packages/integrations/src/github/**`.
  - `packages/action/src/render.ts` — exhaustive `switch (id)` on `EnabledWidget["id"]`. Unknown id is a type error. Rss/http ids must not appear.
  - `packages/action/src/write-files.ts` — disk `WriteWidgetFiles` if `git.ts` does not already export one. Prefer wrapping existing git helpers over a third writer. Engine default today only returns paths.
- **Why:** `engine.ts` is a write bottleneck. Mixing coding + feed + json + T112 GraphQL into one PR is unreviewable. New files keep HTTP out of the engine.
- **Alternative:** Fetch inside `engine.ts` — rejected; engine contract is ports only. Alternative: `renderCodingFromClient` in plugins — rejected; coding widget stays HTTP-free.

### 3. Engine: EnabledWidget coding + pack-gated token

- **Choice:** Extend `EnabledWidget` with `{ id: "coding"; options: CodingOptions }`. `enabledWidgets` also reads `config.plugins.wakatime?.widgets?.coding`. Call `decideWakatimeToken` **immediately after** `decideActionToken` (pack on + missing/`""`/whitespace → `EngineError("fail_job")`; message MUST NOT include the token). `preflightWidget` MUST NOT apply `include_private` to coding (type error if the github branch is reused). Coding outcomes MUST NOT join `decideAllGithubWidgetsSkipped` (`usesGithubIntegration("coding")` is already false — add an engine test anyway). WakaTime-only yaml + `allow_skipped: false` is not “every github widget skipped”.
- **Why:** Library policy already exists in core; the Action never called it. Preflight today always reads `include_private` except demo — coding has no such option.
- **Alternative:** Fail at `loadConfig` when token missing — rejected; pack off must not require the token, and load-time fail would break github-only yaml if someone passes an empty env by accident while pack is off. Engine owns the pack gate.

### 4. main.ts injects T300/T301 ports; does not rewrite git/gist

- **Choice:** `runEngine(loaded, { renderWidget, probeCapabilities, tokenClass, writeFiles, output })`. Publish probe is **token-class**, not widget-gated. If a github crawl client exists, use `github.capabilities` / `github.tokenClass`. Else `publishProbeFromGithubToken(github_token)` via exported `inferGithubTokenClass` — no `createGithubClient`, no `GET /user`. `canGist` iff `user_pat`; `canPrivate`/`canContributions` stay false. Constructing `createGithubClient` remains widget-gated. Do not rewrite `git.ts` / `gist.ts`. WakaTime-only gist and PAT skip-ci must work.
- **Why:** Compose of T300/T301, not a rewrite of `git.ts` / `gist.ts`.
- **Alternative:** Inline git in `main.ts` — rejected.

### 5. Workspace deps + ncc externals

- **Choice:** Add `workspace:*` for `@profile-bits/core`, `@profile-bits/integrations`, `@profile-bits/plugins`, `@profile-bits/renderer`. Keep tsconfig `paths` in sync. One `pnpm install` (lockfile exclusive). ncc MUST keep `--external @takumi-rs/core`. Never inline `.node`. `dist/` stays gitignored on `main`.
- **Why:** Action currently has no workspace runtime deps; ncc cannot bundle Takumi native.
- **Alternative:** Duplicate clients inside action — rejected.

### 6. T112 leftover (do not steal)

- **Choice:** GitHub languages payload remains REST-crawl-shaped until `github-api-fetch-policy` T112 (`graphql.ts` `nodes(ids:)` batches of 100). This change’s github dispatcher calls existing `loadPayload` + `renderLanguagesSvg`. Document T112 in a one-line comment on the languages arm only if the payload shape is REST-only. Do not implement GraphQL. Do not REST `/languages`.
- **Why:** `engine.ts` / github integration are shared write bottlenecks. Folding T112 here guarantees collision.
- **Alternative:** Finish GraphQL in this change — rejected.

### 7. Rss/http deferred (engine.ts bottleneck)

- **Choice:** Do not add `feed` or `json` to `EnabledWidget` in this change. Same `enabledWidgets` hole exists for those packs; wiring them here would mix three packs into one `engine.ts` diff.
- **Why:** Follow-up change can extend the same dispatcher after coding is green.
- **Alternative:** Wire all remaining packs now — rejected by program lock.

### 8. F6 `api_domain` is secret-adjacent (document, do not “fix”)

- **Choice:** Yaml `api_domain` selects the HTTPS host that receives RFC Basic `key:`. That is **by design** for Wakapi self-host. Hostname-only SSRF remains. Do not add a denylist of “real” WakaTime hosts. Untrusted fork PRs without `wakatime_token` are not enough protection: same-repo write access plus workflow secrets can exfil the key to an attacker-controlled allowed hostname.
- **Why:** Closing this would break Wakapi. Treat yaml as secret-adjacent in Action docs; do not pretend fork-only workflows are the full threat model.
- **Alternative:** Ignore non-`wakatime.com` hosts — rejected; Wakapi is an explicit library goal.

### 9. F7 `api.wakatime.com` uses Wakapi compat path (document, do not rewrite)

- **Choice:** Keep library path split: exact lowercase `wakatime.com` → `https://wakatime.com/api/v1/users/current/stats/{range}`; any other allowed hostname → `/api/compat/wakatime/v1/...`. Yaml `api_domain: api.wakatime.com` therefore uses the compat path (likely 404 `fail_widget`). Default remains `wakatime.com`. Do **not** special-case `api.wakatime.com` onto Cloud `/api/v1/`.
- **Why:** Official Cloud prefix is `https://api.wakatime.com/api/v1/` but the locked default host is `wakatime.com`, which already serves JSON at `/api/v1/`. Dual-path Cloud hosts would be a silent rewrite.
- **Alternative:** Map `api.wakatime.com` to Cloud — rejected for this change.

### 10. Libraries: catalog workspace only

- **Use:** existing `@profile-bits/{core,integrations,plugins,renderer}` via `workspace:*`, vitest 4, Node 24, biome, ncc with `--external @takumi-rs/core`.
- **Do not add / do not use:** axios, octokit on the wakatime path, msw, new npm deps beyond catalog, `takumi-js/response`, `@takumi-rs/wasm` inlined into ncc, flattened Action inputs.

## Risks / Trade-offs

- [engine.ts single-writer] → Exclusive glob; rss/http deferred so this diff stays coding-only.
- [constructor fail_job on missing token] → Engine fails first; clients factory MUST NOT construct when token missing.
- [preflight include_private on coding] → Exhaustive branch; coding has no `include_private`.
- [coding vs AllGithubWidgetsSkippedError] → Filter already uses `usesGithubIntegration`; add engine tests including wakatime-only yaml.
- [defaultWriteFiles is path-only] → Inject real disk `writeFiles` from main; engine default stays no-op for unit tests.
- [T112 REST-only languages] → Document leftover; do not steal GraphQL.
- [F6 api_domain exfil] → Document secret-adjacent yaml; hostname SSRF already closed.
- [F7 api.wakatime.com 404] → Document compat path; do not rewrite to Cloud.
- [ncc inlines Takumi] → Keep `--external @takumi-rs/core`; no `dist/` on `main`.
- [injected fetch DNS rebinding] → Same residual as rss/http; Track C later, not this change.

## Migration Plan

Greenfield Action compose. Default committed yaml stays github-only; existing github-only consumers unchanged. Apply follows the D0 → D1 → D2 → E → M → Q → T graph in `tasks.md`. Rollback: omit `plugins.wakatime` from yaml; delete this change folder before archive. Do not archive or commit unless asked.

## Open Questions

(none — HTTP-free engine, exclusive new files, pack-gated token, T112 leftover, F6/F7 documentation, rss/http deferred, and skip `action-public-api` are locked above)
