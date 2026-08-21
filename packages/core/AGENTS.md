# @profile-bits/core

Shared types, yaml parse, auth policy, and thin `action.yml` codegen. Widget agents must **not** add fields here after the schema freeze, except the authorized post-v0 **wakatime**, **rss**, **http**, and github **repo** widget exceptions below.

## Own

- **Schema freeze** (`src/types.ts` + `src/wakatime-schema.ts`): plugin / widget / integration types plus frozen demo/stats/languages/repo options and thin Action inputs. Complete **before** Wave 2 widgets. **Post-v0 exceptions:** first-party ids are `github` + `wakatime` + `rss` + `http`. GitHub widget `repo` is opt-in like `demo` (not a pack default); required yaml `repo: owner/name`; `WIDGET_INTEGRATIONS.repo = ["github"]`. WakaTime: widget `coding`; integration `wakatime` (`INTEGRATION_AUTH.wakatime = required`, `WIDGET_INTEGRATIONS.coding = ["wakatime"]`); optional yaml `plugins.wakatime` (empty `{}` enables default widget `coding`); thin `wakatime_token` (no default). Rss: widget `feed`; integration `rss` (`auth: none`); optional yaml `plugins.rss` with required `widgets.feed.url`. Http: widgets `json` + `chips`; integration `http` (`INTEGRATION_AUTH.http = optional`, `WIDGET_INTEGRATIONS.json = ["http"]`, `WIDGET_INTEGRATIONS.chips = ["http"]`); optional yaml `plugins.http` (`{}` is widget-less; json on only when `widgets.json` is present with required https `url`; chips on only when `widgets.chips` is present with required `preset` + `types`; no `url`/`headers`/`bits` on chips); thin `http_token_env` (env name, no default). Do **not** add further first-party plugin ids. Do **not** add `plugin_wakatime`, `plugin_rss`, or `plugin_http` bools to Action inputs.
- **Auth policy** (`src/auth-policy.ts`): **single** module for missing-token, capability probe, skip/fail, gist, `include_private`, contributions, `decideWakatimeToken`, and `classifyHttp` / `decideHttpTokenEnv` / `decideHttpOnlyRunFailed`. Empty/`""`/whitespace `github_token` fails the job (never unauth). Missing `wakatime_token` fails the job **only when the wakatime pack is on**. WakaTime, rss, and http must **not** join `decideAllGithubWidgetsSkipped`. Do not reuse `classifyGithubHttp` for WakaTime or HTTP.
- **Parse** (`src/config.ts`, `src/parse-config.ts`): `.github/profile-bits.yml` is SSOT. Unknown keys / unknown `include` tokens fail. Yaml present beats `plugin_github`. `plugin_github: true` applies pack defaults (`stats`, `languages`) **only** when the config file is absent. Default committed yaml stays github-only; `plugins.wakatime`, `plugins.rss`, and `plugins.http` are optional and additive. `plugins.http: {}` does not auto-enable json or chips. `md.families` is **not** a yaml field; Action GFM policy lives in `src/md-action-policy.ts` (do not splice into parse-config).
- **Theme** (`src/types.ts`, `src/parse-config.ts`, `src/themes-for.ts`):
  - `THEMES` is the same reference as `NAMED_THEME_IDS` (47 catalog ids from `@profile-bits/themes`).
  - `ThemeConfigSchema` is a named id **or** `{ custom: { bg, card, text, muted, accent, border, pair? } }`.
  - Unknown id / swatch / role / hex fail closed (never fall back to `dark`).
  - Custom + `output_pair` requires `pair`.
  - Thin Action `theme` is named-id override only; `theme: custom` fails.
  - No flattened `plugin_*_*_*` color inputs.
- **Codegen** (`src/codegen/**`): writes **thin** root `action.yml`. `generate-action --check` **rejects** `plugin_github_stats_include`, `plugin_github_repo_include`, `plugin_wakatime_coding_range`, `plugin_rss_feed_url`, `plugin_http_json_url`, `plugin_http_chips_preset`, and any `plugin_<plugin>_<widget>_<option>` input.

Barrel: `src/index.ts` re-exports types, auth-policy, parse-config, md-action-policy, redact, codegen, and run-log. Do not import renderer or GitHub HTTP from core.
