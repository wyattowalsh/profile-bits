## 1. Schema freeze (T030t)

- [ ] 1.1 Add `packages/core/src/types.ts` with plugin / widget / integration types (plugin = 1..N widgets + 0..N integrations; widget = one template + option schema; integration = reusable data source).
- [ ] 1.2 Freeze demo option types: `text` default `profile-bits`, optional `subtitle`, `animate` default true.
- [ ] 1.3 Freeze stats option types: `filename`, `include` (`followers|following|repos|stars|forks|gists|contributions`, default `followers,repos,stars`), `hide_rank` default true, `avatar` default true, `animate` default false, `include_private` / `include_forks` / `include_archived` default false.
- [ ] 1.4 Freeze languages option types: `filename`, `limit` 1–16 default 8, `min_pct` default 1, `exclude` default `[]`, `animate` default false, `include_private` / `include_forks` / `include_archived` default false.
- [ ] 1.5 Freeze yaml `Config` shape (`version`, `format`, `theme`, `output_pair`, `animated`, `timezone`, `output_dir`, `plugins.github.widgets`) with `additionalProperties: false`.
- [ ] 1.6 Freeze thin Action input types: `user`, `github_token`, `committer_token`, `config`, `output_action` (`none|commit|pull-request|gist`), `dry_run`, optional `format`/`theme`/`output_pair`/`animated`, optional `plugin_github`, plus `committer_branch`, `committer_gist`, `output_condition`, `timezone`, `allow_skipped`.
- [ ] 1.7 Freeze token classes `actions_installation | user_pat | github_app_install` and capability flags `canPrivate`, `canContributions`, `canGist`.

## 2. Auth policy (T030a)

- [ ] 2.1 Implement `packages/core/src/auth-policy.ts` as the single policy module for missing-token, probe mismatch, skip/fail, and gist/`include_private`/`contributions` rules.
- [ ] 2.2 Treat empty / `""` / whitespace `github_token` as missing and fail the job (never unauthenticated 60/h).
- [ ] 2.3 Encode one identity probe per run for capability only; if probe login ≠ `user`, public REST only and do not render 0 for `include_private` or `contributions`.
- [ ] 2.4 Fail the widget when `include_private: true` without `canPrivate`; omit contributions chip and list `github/stats:contributions` in skipped when `canContributions` is false.
- [ ] 2.5 Fail the run when `output_action: gist` without `canGist`; fail when gist format is not svg.
- [ ] 2.6 Fail the job when all github widgets are skipped unless `allow_skipped: true`; skipped widgets MUST NOT write files and MUST NOT count as `data-changed`.
- [ ] 2.7 Add auth-policy tests for the skip/fail matrix: empty token, 401, 403 secondary/abuse, GraphQL 200+`errors[]`/remaining 0, 404 user, 429, 200-zeros, gist without canGist, gist non-svg, all-skipped, skip-no-write.

## 3. Yaml parse (T030b)

- [ ] 3.1 Implement `packages/core/src/config.ts` and `parse-config.ts` plus `packages/core/vitest.config.ts`.
- [ ] 3.2 Parse committed `.github/profile-bits.yml` as SSOT; fail on unknown yaml keys and unknown `include` tokens.
- [ ] 3.3 If the config file exists, yaml wins and `plugin_github` is ignored; `plugin_github: true` applies pack defaults `stats`+`languages` only when the config file is absent (`demo` remains opt-in).
- [ ] 3.4 Add parse tests for default yaml shape, `output_pair`, unknown keys, unknown include tokens, and yaml-vs-`plugin_github` precedence.

## 4. Thin action.yml codegen (T030c)

- [ ] 4.1 Implement `packages/core/src/codegen/**` to write thin root `action.yml` (`runs.using: node24`; `user`, `github_token`, `committer_token`, `config`, `output_action`, `dry_run`, optional overrides, optional `plugin_github`).
- [ ] 4.2 Do not generate `plugin_<plugin>_<widget>_<option>` inputs (no `plugin_github_stats_include`, no widgets CSV, no filename inputs).
- [ ] 4.3 Make `generate-action --check` fail if generated inputs include `plugin_github_stats_include` or similar flattened option names.
- [ ] 4.4 Snapshot-test thin `action.yml` (no flattened option namespace; `dist/` remains gitignored on main).

## 5. Barrel (T030d)

- [ ] 5.1 Export types, auth-policy, parse-config, and codegen from `packages/core/src/index.ts`.
- [ ] 5.2 Verify the barrel compiles and re-exports the T030t/a/b/c surface without pulling renderer or GitHub HTTP.

## 6. Later fetch and widgets (Wave 1+)

- [ ] 6.1 Implement static integration (`auth: none`, fixtures, no GitHub) and github integration client that never sends a request without `Authorization`.
- [ ] 6.2 Implement REST cache keyed by `(method, url, params)` and GraphQL cache keyed by `(query, variables)`.
- [ ] 6.3 Implement REST crawl `GET /users/{login}` + paginated `/repos?type=owner&per_page=100`; filter forks/archived first, then cap 500 remaining; share that ordered id list for stars and language bytes.
- [ ] 6.4 Implement GraphQL `nodes(ids:)` batches of 100 with `languages(first: 10, orderBy: { field: SIZE, direction: DESC })`; never REST `/languages`; never 500 per-repo GraphQL calls; separate `contributionsCollection` iff `canContributions`.
- [ ] 6.5 Fail-after-backoff on 403 secondary/abuse, 429, and GraphQL HTTP 200 + `errors[]` / remaining 0; fail widget on 404 user; fail stats+languages together on mid-pagination REST failure.
- [ ] 6.6 Implement widgets `demo`, `stats`, `languages` (no HTTP in widgets; consume cache); card 480×160; default svg baked still; empty languages → “No language data”; Action commits widget files only (does not patch README.md).
