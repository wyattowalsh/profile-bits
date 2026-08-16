# @profile-bits/core

Shared types, yaml parse, auth policy, and thin `action.yml` codegen. Widget agents must **not** add fields here after the schema freeze.

## Own

- **Schema freeze** (`src/types.ts`): plugin / widget / integration types plus frozen demo/stats/languages options and thin Action inputs. Complete **before** Wave 2 widgets.
- **Auth policy** (`src/auth-policy.ts`): **single** module for missing-token, capability probe, skip/fail, gist, `include_private`, contributions. Empty/`""`/whitespace `github_token` fails the job (never unauth).
- **Parse** (`src/config.ts`, `src/parse-config.ts`): `.github/profile-bits.yml` is SSOT. Unknown keys / unknown `include` tokens fail. Yaml present beats `plugin_github`. `plugin_github: true` applies pack defaults (`stats`, `languages`) **only** when the config file is absent.
- **Codegen** (`src/codegen/**`): writes **thin** root `action.yml`. `generate-action --check` **rejects** `plugin_github_stats_include` and any `plugin_<plugin>_<widget>_<option>` input.

Barrel: `src/index.ts` re-exports types, auth-policy, parse-config, codegen. Do not import renderer or GitHub HTTP from core.
