## 1. Already done (T030c)

- [x] 1.1 Thin root `action.yml` exists with Marketplace inputs `user`, `github_token`, `committer_token`, `config`, `plugin_github`, `format`, `theme`, `output_pair`, `animated`, `output_action`, `committer_branch`, `committer_gist`, `output_condition`, `timezone`, `dry_run`, `allow_skipped`.
- [x] 1.2 `runs.using` is `node24` and `runs.main` is `dist/index.js`.
- [x] 1.3 Generated inputs do not include `plugin_<plugin>_<widget>_<option>` names (`plugin_github_stats_include`, widgets CSV, filename inputs).

## 2. Engine (T120*)

- [ ] 2.1 T120a: Implement `packages/action/src/load-config.ts` to parse thin inputs, treat empty/`""`/whitespace `github_token` as missing (fail job), load yaml as SSOT when the config file exists, and apply `plugin_github` pack defaults (`stats`, `languages`) only when that file is absent.
- [ ] 2.2 T120b: Implement `packages/action/src/engine.ts` plus `output.ts` commit/gist **interface** (do not implement `git.ts` / `gist.ts`). Honor `output_action` `none|commit|pull-request|gist`; fail gist unless format is `svg` and `canGist`; write widget files under `output_dir` only (do not patch `README.md`); skip identical blobs; skipped widgets must not write files and must not count as `data-changed`.
- [ ] 2.3 T120b: Set Action outputs `files`, `did_commit`, and `skipped`. `dry_run` must leave `did_commit` false and must not commit, open a pull request, or update a gist. Commit message must include `[skip ci]` for installation-token commits and omit `[skip ci]` when `committer_token` is a user PAT that should retrigger.
- [ ] 2.4 T120c: Implement `packages/action/src/main.ts` plus action vitest for `output_action: none`, empty-token fail, yaml-vs-`plugin_github` precedence, and the three outputs. Do not edit `git.ts`, `gist.ts`, or `action.yml` by hand.

## 3. Codegen check only (T400)

- [ ] 3.1 Run `generate-action --check` (and generate-docs `--check` / `just check` as that task owns). Do **not** regenerate or restyle `action.yml`.
- [ ] 3.2 `--check` MUST fail if generated inputs include `plugin_github_stats_include` or any `plugin_*_*_*` flattened option name, and MUST still require `runs.using: node24`.

## 4. Slim tree (T410)

- [ ] 4.1 Implement `scripts/publish-action-tree.sh` to produce the orphan `release/v1` tree (`action.yml`, `dist/**`, `LICENSE`, slim action README). `dist/` stays gitignored on `main`.
- [ ] 4.2 Never tag `v1` at `main`. Floating `@v1` MUST point at the orphan `release/v1` commit only.
