# @profile-bits/action

GitHub Action runtime. Root `action.yml` is **thin** Marketplace inputs; widget options live in `.github/profile-bits.yml`.

## Thin inputs

`user`, `github_token`, `committer_token`, `config`, `output_action` (`none` | `commit` | `pull-request` | `gist`), `dry_run`, optional `format`/`theme`/`output_pair`/`animated`, optional `plugin_github`. Empty/`""` token ≠ omitted → **fail job**.

`runs.using: node24` only. `main: dist/index.js`.

## Ports

- `src/engine.ts` + `src/output.ts` own the commit/gist **interface**.
- `src/git.ts` and `src/gist.ts` **implement** those ports. They do not edit `engine.ts` / `main.ts`.
- Gist is SVG-only and requires `canGist`. Action commits widget files only — it does **not** patch `README.md`.

## Bundle

ncc **`--external @takumi-rs/core`** (and wasm). Never inline `.node`. Copy gnu `.node` + `takumi_wasm_bg.wasm` into `dist/` with the loader’s require graph. `dist/` is gitignored on `main`.
