## Context

See `proposal.md` Why. Three-layer specs, `action-public-api`, `author-plugin`, and `playground` MUST NOT be rewritten. README delivery remains the Action; this change adds a local argv/env shell around existing `runMain`.

Constraints: Node 24, pnpm catalog SSOT, OpenSpec 1.9.0, Takumi 2.9.2 via `@profile-bits/renderer` only, Zod 4 already in catalog, Vitest 4, Biome 2.5. Thin `action.yml`. Never unauthenticated GitHub. No flattened `plugin_*_*_*` flags. No new Marketplace inputs. `dist/` gitignored on `main`. Never tag `v1` at `main`. Packages stay `private: true`.

## Goals / Non-Goals

**Goals:**

- Typed CLI `profile-bits render` wrapping `runMain` with CLI-only default `output_action: none`.
- Catalog-pin Optique + Clack + tsx + tsdown for the CLI package only. Action stays ncc.
- Consumer skill at `.agents/profile-bits-readme` that shells out. Authoring plugin stays the live six authoring skills; the consumer is a sibling. The authoring plugin MUST NOT implement engine logic.
- Docs honesty for CLI vs embed vs catalog vs gist vs customization valves.

**Non-Goals:**

- GitHub App, VS Code extension, MCP, plugin marketplace, user plugin loader, gist-as-CDN.
- `@optique/config`, LogTape, Execa, p-retry, Ink, Listr2, oclif, Commander, Changesets, npm trusted publishing.
- Finishing unrelated Action holes (chips not composed in `composeRenderWidgets`).
- Interactive token prompts or an `init` wizard.
- Editing sibling `openspec/changes/*` folders. Archive. Git commit.

## Decisions

### 1. New capability `cli`, not an action-public-api rewrite

- **Choice:** ADDED-spec `cli`. Do not MODIFIED-delta `action-public-api` or thin `action.yml`.
- **Why:** Marketplace default `commit` and INPUT_* stay. CLI default `none` is a runner-layer override.
- **Alternative:** New Action input `cli_mode` — rejected; that would leak local defaults into Marketplace.

### 2. Optique shell, Zod domain already in core

- **Choice:** `@optique/core` + `@optique/run` + `@optique/zod` + `@optique/env` + `@optique/clack` + `@clack/prompts`, catalog-pinned (1.2.1 / 1.7.0 at propose time). Map kebab flags onto `THIN_ACTION_INPUT_NAMES`. Use existing `OutputFormatSchema` / `ThemeSchema` / `OutputActionSchema` via `@optique/zod`. `runAsync` because `runMain` is async. `completion: "both"`. `errorExitCode: 2` for usage.
- **Why:** User-selected typed CLI stack. Thin handlers; no second yaml parser.
- **Alternative:** Hand-rolled argv like `packages/core/src/codegen/cli.ts` — rejected. Commander/Stricli — rejected.

### 3. No Optique config file; yaml SSOT stays core parse

- **Choice:** Do not add `@optique/config`. `--config` is only a path to `.github/profile-bits.yml` loaded by `loadConfig`.
- **Why:** `additionalProperties: false` yaml is already SSOT. A second config language would fork options.
- **Alternative:** `profile-bits.toml` for CLI prefs — rejected in v0.

### 4. Clack is stderr progress, not token prompts

- **Choice:** Clack spinner/tasks on stderr during render. Never prompt for tokens. `--no-input` / non-TTY MUST NOT prompt. Missing github token fails like the Action.
- **Why:** Agents and CI need fail-closed auth. Secrets in prompts leak into logs.
- **Alternative:** Clack `init` wizard — deferred.

### 5. tsx in dev, tsdown for CLI dist, ncc stays Action-only

- **Choice:** `just render` → `tsx` on `packages/cli/src/bin.ts`. `tsdown` builds ESM + source maps to `packages/cli/dist` for the `bin` field. Do not tsdown or ncc-inline the CLI into Action `dist/`.
- **Why:** Action ncc `--external @takumi-rs/core` is a different runtime. CLI is a Node workspace binary.
- **Alternative:** `node --experimental-strip-types` only — weaker than the chosen stack. SEA/Homebrew — deferred.

### 6. Private package; pack smoke, not npm publish

- **Choice:** `@profile-bits/cli` `private: true`. CI: `--help`/`--version` after tsdown. No Changesets, no trusted publishing, no OS matrix expansion in this change.
- **Why:** Same publish policy as Action `dist/` on orphan `release/v1`.
- **Alternative:** Publish `@profile-bits/cli` to npm now — rejected.

### 7. Consumer plugin is a sibling, not a runner skill on the authoring plugin

- **Choice:** `.agents/profile-bits-readme` / skill `render`. Relative symlink `.agents/skills/render`. Author `NOT-for` points here. No `mcp.json`.
- **Why:** Do not add a runner skill to the authoring plugin (live inventory is six: `author`, `author-bit`, `author-palette`, `author-integration`, `author-widget`, `author-plugin`). Engine logic MUST NOT live in skill markdown. Do not rewrite the `author-plugin` main spec in this change.
- **Alternative:** Add `render` on `.agents/profile-bits` — rejected.

### 8. IO contract

- **Choice:** stdout = files list or `--json` `{ files, skipped, did_commit }`. stderr = warnings, spinner, verbose. Exit 0/1/2/130. Ignore EPIPE. AbortSignal on SIGINT/SIGTERM. Tokens never in output.
- **Why:** Agent/CI consumers (`--json --no-input --quiet`).
- **Alternative:** Human-only stdout — rejected; the consumer skill needs JSON.

### 9. Exclusive files

- Catalog + lockfile: one writer (`pnpm-workspace.yaml`, `pnpm-lock.yaml`, `packages/cli/package.json`).
- Action barrel: `packages/action/src/index.ts` only (do not edit `main.ts` except if import path requires a type re-export — prefer barrel-only).
- CLI sources: `packages/cli/src/**`, `packages/cli/tsconfig.json`, `packages/cli/vitest.config.ts`, `packages/cli/tsdown.config.ts`.
- Root scripts/CI: `package.json` `render`, `.github/workflows/ci.yml` demo-smoke. `justfile` already forwards.
- Consumer plugin: `.agents/profile-bits-readme/**` plus symlink `.agents/skills/render`. Author pointer: `.agents/profile-bits/skills/author/SKILL.md` (and AGENTS.md if needed).
- Docs: `apps/docs/src/llms/llms-txt.ts` + test + `public/llms.txt`; catalog page lede; `apps/docs/app/docs/page.tsx`; `apps/docs/app/page.tsx`; optional `readme-mode.tsx` gist row; `DESIGN.md`; root `AGENTS.md`; `README.md`.

**Do not add / do not use:** `@optique/config`, axios, commander, yargs, ora, ink, listr2, execa, p-retry, logtape.

## Risks / Trade-offs

- [Optique Zod 4] → Verify `@optique/zod@1.2.1` against catalog Zod `4.4.3` at install; pin bump if the adapter requires it.
- [CLI commit/gist outside Actions] → Allowed flags; existing ports may fail without GITHUB_* env. Document; do not invent a local git publisher.
- [Takumi native in CLI] → Same as Action: optional `@takumi-rs/core-linux-x64-gnu` via workspace renderer, not a second copy.
- [Catalog page tests] → Do not put the word `yaml` or extra plugin ids on `/generate/catalog`.
