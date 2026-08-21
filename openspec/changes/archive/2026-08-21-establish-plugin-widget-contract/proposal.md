## Why

profile-bits has no behavioral contract yet: OpenSpec `specs/` is empty, and Wave 0–1 must freeze plugin / widget / integration semantics before types, yaml parse, thin `action.yml` codegen, and GitHub fetch land. Without a delta-first contract, later work would invent flattened Action inputs, REST `/languages`, or silent public charts when private/contributions are unavailable.

## What Changes

- Establish the **three-layer model**: a plugin is a pack of widgets plus declared integrations (1..N widgets, 0..N integrations); a widget is one Takumi template plus option schema; an integration is a reusable data source with per-integration auth.
- Freeze first-party v0 surface: plugin `github`; widgets `demo`, `stats`, `languages`; integrations `static` and `github`. Defaults when the plugin is on with no widget list: `stats`, `languages` (`demo` is opt-in).
- Make committed `.github/profile-bits.yml` the config SSOT (`additionalProperties: false`). Root `action.yml` is **thin** (`user`, `github_token`, `committer_token`, `config`, `output_action`, `dry_run`, optional format/theme/output_pair/animated overrides, optional `plugin_github` bool). **Do not** generate `plugin_<plugin>_<widget>_<option>` inputs.
- Spec the auth capability matrix and skip/fail table (empty token, 401, 403, GraphQL 200+`errors[]`, 404, 429, 200-zeros, gist, all-skipped, no overwrite on skip). Empty/`""`/whitespace `github_token` fails the job; never unauthenticated 60/h.
- Spec languages/stats crawl: REST user + paginated owner repos, **filter forks/archived first then cap 500**, GraphQL `nodes(ids:)` batches of 100. Never REST `/languages`; never 500 per-repo GraphQL calls.
- Lock delivery: card 480×160, default format svg, Takumi SVG is a baked still, Action commits widget files only (does not patch README.md), `output_action` none|commit|pull-request|gist (gist = SVG only), `runs.using: node24`, `dist/` gitignored on main.

## Capabilities

### New Capabilities

- `plugin-contract`: Plugin pack identity, widget lists and defaults, yaml SSOT vs thin Action inputs, config precedence, unknown-key parse failure, codegen `--check` against flattened inputs, Action delivery (commit files only, output_action, node24, gist SVG-only).
- `widget-contract`: Widget identity, Takumi template + frozen option schemas for `demo`/`stats`/`languages`, card size/format, skip-without-write, contributions omit-not-zero, include_private fail-closed, 404/zeros rendering.
- `integration-contract`: Integration identity and auth classes, `static` (auth none) vs `github` (never unauth), capability probe, skip/fail HTTP matrix, REST-then-`nodes(ids:)` languages crawl, filter-then-cap 500, request cache keys, GraphQL 200+`errors[]` fail-after-backoff.

### Modified Capabilities

- (none — `openspec/specs/` is empty; this is the first delta)

## Impact

- Planning only in this change. Later Wave 0–1 implementation (`packages/core` types, `auth-policy.ts`, yaml parse, thin `action.yml` codegen, barrels; then fetch/widgets) MUST implement these ADDED requirements. No `packages/**` or `apps/**` source in this change. Follow-on OpenSpec changes (`action-yml-public-api`, `github-api-fetch-policy`, `docs-playground`, `author-plugin`) propose after T031 sync — do not split this three-layer model into extra changes now.
