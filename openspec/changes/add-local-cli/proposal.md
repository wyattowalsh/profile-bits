## Why

README delivery is the Action committing widget files, but there is no local runner for the same engine. Contributors and consumer agents cannot preview yaml against `runMain` without a GitHub-hosted job, and a hand-rolled argv parser would drift from thin Action inputs. A typed CLI shell around the existing engine closes that hole without inventing a second renderer, embed API, or plugin marketplace.

## What Changes

- Add capability `cli`: local binary `profile-bits render` that maps Optique argv/env onto existing thin Action inputs and calls `runMain`. CLI-only default `output_action: none`. Action default `commit` is unchanged.
- Parser stack is Optique (`@optique/core`, `@optique/run`, `@optique/zod`, `@optique/env`, `@optique/clack`) plus Clack stderr UX, catalog-pinned. Yaml SSOT stays `.github/profile-bits.yml` via core `parseConfig`. No `@optique/config`. No flattened `plugin_*_*_*` flags. No new Marketplace inputs.
- CLI-only presentation flags: `--json`, `--quiet`, `--verbose`, `--no-input`, `--no-color`. Tokens never printed. Empty github token still fails.
- New private workspace package `packages/cli` (tsx in dev, tsdown ESM bundle for a `bin` field). `packages/action` exports `runMain`. `just render` / `pnpm render` invoke the CLI. Package stays `private: true`; this change does not npm-publish or tag `v1`.
- Consumer Agent Plugin 1.0.0 at `.agents/profile-bits-readme` (one skill `render`) that shells out to `just render`. Author plugin stays four skills and MUST NOT implement engine logic.
- Docs honesty: CLI is a local engine; `/generate/catalog` is a first-party gallery not a store; gist is an advanced `output_action` not a CDN; customization is yaml plus first-party `http` / `rss` / `chips`, not a user plugin loader.

## Capabilities

### New Capabilities

- `cli`: Local Optique CLI around Action `runMain` — `profile-bits render`, CLI-only `output_action: none`, thin-input kebab flags plus presentation flags, env token fallbacks, stdout/stderr/`--json` contract, exit codes, consumer `render` skill that shells out, and docs copy that distinguishes the CLI from embed/CDN/marketplace surfaces.

### Modified Capabilities

- (none — do not rewrite `plugin-contract`, `widget-contract`, `integration-contract`, `action-public-api`, `author-plugin`, or `playground`. Author skill pointer and llms/catalog copy are implementation of this capability, not requirement deltas on those specs.)

## Impact

- Specs: new `openspec/specs/cli/spec.md` after archive/sync. No deltas to three-layer contracts, `action-public-api`, `author-plugin`, or `playground`.
- Code: `packages/cli/**`, `packages/action/src/index.ts` barrel, catalog pins in `pnpm-workspace.yaml` / lockfile, root `package.json` `render` script, `justfile` already forwards, CI demo-smoke → CLI `--help`, `.agents/profile-bits-readme/**`, author umbrella pointer, `apps/docs` llms/catalog/docs/home, `DESIGN.md`, root `AGENTS.md` / `README.md`.
- Out of scope: GitHub App, VS Code extension, MCP, plugin marketplace, user plugin loader, gist-as-CDN, `@optique/config`, LogTape, Execa, p-retry, Ink, Listr2, oclif, Commander, Changesets, npm trusted publishing, tagging `v1`, finishing unrelated Action holes (chips compose), rewriting Action ncc, archive, git commit.
