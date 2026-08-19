## 1. Catalog and package scaffold

- [x] 1.1 Exclusive: `pnpm-workspace.yaml` catalog pins `"@optique/core": "1.2.1"`, `"@optique/run": "1.2.1"`, `"@optique/zod": "1.2.1"`, `"@optique/env": "1.2.1"`, `"@optique/clack": "1.2.1"`, `"@clack/prompts": "1.7.0"`, `"tsx": "4.23.12"`, `"tsdown": "0.22.14"`. Create `packages/cli/package.json` (`name: @profile-bits/cli`, `private: true`, `type: module`, `bin.profile-bits` → dist after tsdown, workspace `*` `@profile-bits/action` + `@profile-bits/core`, catalog optique/clack/zod, dev tsx/tsdown/typescript/vitest). `packages/cli/tsconfig.json` matching action NodeNext + `allowImportingTsExtensions`. `packages/cli/vitest.config.ts` aliases for action/core. `packages/cli/tsdown.config.ts` ESM + sourcemaps, entry `src/bin.ts`. One `pnpm install` (lockfile exclusive). FORBIDDEN: `@optique/config`, logtape, execa, commander, ncc on the CLI, editing `action.yml`.
- [ ] 1.2 Exclusive: `packages/action/src/index.ts` re-export `runMain`, `main`, `ActionRunResult`, `EngineResult`, `RunMainOptions` from `main.ts`. Do **not** edit `main.ts`. Importing the barrel MUST NOT take the Action `isDirectRun()` path.

## 2. Optique program and IO

- [x] 2.1 Exclusive `packages/cli/src/program.ts` + `map-inputs.ts` + tests. Static `command("render", …)` plus global `--json` `--quiet` `--verbose` `--no-input` `--no-color`. Thin kebab flags for every `THIN_ACTION_INPUT_NAMES` key. `--output-action` CLI default `none` via `withDefault` (do not change `ACTION_OUTPUT_ACTION_DEFAULT`). `@optique/zod` for format/theme/output_action/output_condition enums. `@optique/env` for `GITHUB_TOKEN`/`GH_TOKEN`/`WAKATIME_TOKEN`. Unknown flags / flattened `plugin_*_*_*` fail usage (exit 2).
- [x] 2.2 Exclusive `packages/cli/src/io.ts` + `errors.ts` + tests. stdout = human file list or `--json` `{ files, skipped, did_commit }`. stderr = warnings/spinner/verbose. Tokens never in output. Exit 0/1/2/130. EPIPE ignored. SIGINT/SIGTERM abort + stop spinner. `--no-input` / non-TTY: no prompts.
- [x] 2.3 Exclusive `packages/cli/src/commands/render.ts` + `bin.ts`. Thin handler calls `runMain({ inputs, env, cwd })`. Clack spinner on stderr unless `--json`/`--quiet`. `@optique/run` `runAsync` with `help: "both"`, `version` from package.json, `completion: "both"`, `errorExitCode: 2`. Never log tokens.

## 3. Recipes, CI, AGENTS

- [x] 3.1 Exclusive root `package.json` script `render` → `pnpm --filter @profile-bits/cli exec tsx src/bin.ts`. `justfile` already forwards. `.github/workflows/ci.yml` replace demo-smoke placeholder with `pnpm render --help` (and `pnpm --filter @profile-bits/cli exec tsc --noEmit`). Root `AGENTS.md` document `just render`. FORBIDDEN: tagging `v1`, npm publish, OS matrix expansion, editing Action ncc.

## 4. Consumer plugin

- [x] 4.1 Exclusive `.agents/profile-bits-readme/plugin.json` Agent Plugins 1.0.0 `name: profile-bits-readme`, no MCP fields, no `skills` array. Copy/adapt validate.sh from author plugin (schema vendor, reject `mcp.json`, skills-ref, no template `../`). Skill `skills/render/SKILL.md`: write yaml + thin workflow, run `just render` / `pnpm render`, relative README embeds, gist only if asked, `--json --no-input` for agents. Refuse authoring `packages/**`, MCP, marketplace, plugin loader, embed API. Relative symlink `.agents/skills/render` → `../profile-bits-readme/skills/render`. Do not write `.cursor/skills/`.
- [x] 4.2 Exclusive `.agents/profile-bits/skills/author/SKILL.md` (+ plugin `AGENTS.md` if needed): dispatch consumer README / local CLI / `just render` to the sibling plugin. Keep four skills. Do not implement `runMain` in markdown.

## 5. Docs honesty

- [x] 5.1 Exclusive `apps/docs/src/llms/llms-txt.ts` + `llms-txt.test.ts` + `apps/docs/public/llms.txt`. State Action delivery, local CLI runner, playground not embed, catalog first-party gallery not marketplace, gist not CDN, customize via `http`/`rss`/`chips`. Keep existing yaml SSOT / thin action / no flatten assertions.
- [x] 5.2 Exclusive catalog lede (`apps/docs/app/generate/catalog/page.tsx` + test): first-party gallery, not a marketplace. MUST NOT add the word `yaml` or extra plugin ids (catalog tests). `apps/docs/app/docs/page.tsx` + `apps/docs/app/page.tsx`: Action delivery, `just render` local, relative embeds. Optional `readme-mode.tsx` checklist row: gist is optional publish. `DESIGN.md` architecture row for `packages/cli`. Root `README.md` one-liner.

## 6. Verify

- [ ] 6.1 Focused vitest `@profile-bits/cli` (mock `runMain`: default none, unknown flags, `--help`, `--json` shape, tokens absent from stdout/stderr). Docs llms/catalog/readme-mode tests. `just generate-action --check` still rejects flattened inputs. `just lint`. `pnpm render --help`. CLI `tsc --noEmit`. Do not commit. Do not tag `v1`.
