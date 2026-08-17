## Why

The three-layer contract is synced, and T030c already wrote a thin root `action.yml`, but Marketplace consumers still lack a dedicated public-API spec: inputs, outputs, Node 24 runtime, yaml-vs-`plugin_github` precedence, commit/PR/gist delivery, and the orphan `@v1` tag. Without that lock, later engine and codegen work can reintroduce flattened `plugin_*_*_*` inputs or treat empty `github_token` as omitted.

## What Changes

- Add capability `action-public-api`: the GitHub Marketplace contract for root `action.yml` (thin inputs only, declared outputs, `runs.using: node24`, `main: dist/index.js`).
- Lock empty/`""`/whitespace `github_token` as a failed job (not the omitted `${{ github.token }}` default). Yaml is SSOT when the config file exists; `plugin_github` applies pack defaults only when that file is absent.
- Forbid flattened `plugin_<plugin>_<widget>_<option>` inputs. `generate-action --check` MUST fail on names like `plugin_github_stats_include`.
- Lock delivery: `output_action` `none|commit|pull-request|gist` (`gist` = svg + `canGist`); Action commits widget files only (does not patch `README.md`); outputs `files`, `did_commit`, `skipped`.
- Lock consumer workflow shape: `on: schedule` + `workflow_dispatch` (not bare `push`); `permissions: contents: write` and `pull-requests: write` when using PR output; commit messages include `[skip ci]` unless a PAT should retrigger.
- Lock publish pointer: `dist/` gitignored on `main`; `@v1` points at orphan `release/v1`, never `main`.

This change is planning only. T030c already generated thin `action.yml`; remaining implementation is T120* engine, T400 `--check` only, and T410 slim tree. Do not rewrite `action.yml` here unless a spec delta needs a doc-only markdown clarification (none required).

## Capabilities

### New Capabilities

- `action-public-api`: Marketplace public surface for thin root `action.yml` — allowed inputs and defaults, outputs, token empty-vs-omitted, yaml vs `plugin_github` precedence, no flattened plugin options, node24/`dist/index.js`, output_action + gist SVG/`canGist`, README-not-patched, permissions, consumer triggers, `[skip ci]`, and `dist/` / `@v1` orphan-tag policy.

### Modified Capabilities

- (none — plugin/widget/integration contracts stay as synced; this change adds the Marketplace API capability rather than rewriting the three-layer model)

## Impact

- Specs: new `openspec/specs/action-public-api/spec.md` after archive/sync. No edits to `plugin-contract`, `widget-contract`, or `integration-contract` in this change.
- Code (later, not this change): `packages/action` T120* (`load-config.ts`, `engine.ts` + `output.ts` interface, `main.ts`); T400 `generate-action --check` only (must keep rejecting flattened inputs); T410 slim `release/v1` tree. T030c thin `action.yml` already exists — do not regenerate or hand-edit it in this change.
- Out of scope: `packages/**` implementation, `github-api-fetch-policy`, `docs-playground`, `author-plugin`, `marketplace-release`, archiving, git commit, plan/README edits.
