# Auth (integration + widget option)

Load when scaffolding `auth.ts` or deciding token / capability behavior. Reuse `packages/core/src/auth-policy.ts`. Do not fork a second matrix.

Copy `auth.ts` to `packages/integrations/src/<id>/auth.ts`. Never omit `src/`
under `packages/integrations/`. Read live `INTEGRATION_AUTH` in
`packages/core/src/types.ts`. Completing an id already in
`FIRST_PARTY_INTEGRATION_IDS` is allowed. A new id needs OpenSpec first. Do
not create a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`. Thin
Action names: read `ActionInputsSchema` (optional `wakatime_token`,
`http_token_env`); never invent `plugin_*_*_*`.

## Per integration

| Id | `INTEGRATION_AUTH` | Runtime |
| --- | --- | --- |
| `static` | `none` | No `Authorization`. No GitHub. Fixtures only (`demo`, tests, docs preview). |
| `github` | `optional` in types | **Not** unauthenticated. Action requires a non-empty token. Playground uses a GitHub App token or fixtures. |
| WakaTime-class / other | `required` | Missing API key fails the run. Never send the request without the secret. |

`auth: optional` MUST NOT send a GitHub request without `Authorization`. Unauthenticated 60 requests/hour per IP MUST NEVER be used.

## Action token (github)

- Empty / `""` / whitespace `github_token` is **missing** (`isMissingToken` → `decideActionToken` → `fail_job`).
- Missing Action token fails the job **before any request**. Do not substitute `${{ github.token }}` when the input was explicitly empty.
- Omitted (absent) input may default to `${{ github.token }}` — that is not the empty-string case.
- Default Actions `github.token` rate: **1,000 REST/hour and 1,000 GraphQL points/hour per repo**, not 5,000. User PAT: 5,000/hour.

Token classes (`TOKEN_CLASSES`): `actions_installation` | `user_pat` | `github_app_install`.

## Capability probe (github, one per run)

- Probe: REST `GET /user` **or** GraphQL `viewer { login }` — not both. Capability only (`canPrivate`, `canContributions`, `canGist`).
- Data queries: REST `GET /users/{login}` / GraphQL `user(login:)`.
- Probe login ≠ configured `user`: public REST only; `include_private` and `contributions` unavailable; **do not paint `0`** for skipped contributions.
- `include_private: true` without `canPrivate` → `fail_widget` (no silent public chart).
- `output_action: gist` without `canGist` or with non-`svg` format → `fail_run`.
- `canGist` is true only for `user_pat`.

## Per widget option

Auth MAY be constrained per widget option. Integration-level auth is the floor; widget options can fail closed above it (`include_private`, contributions include token, gist output).

Skipped widgets MUST NOT write files and MUST NOT count as `data-changed`.

## Shared client

One client instance per Action, playground, or generate-preview **run**, shared by every widget that declares the integration. `getShared{{Id}}Client(run, context)` in the client template. Widgets never `fetch` directly.

github **is** already in `packages/integrations/src/index.ts`. Do not add `index.ts.template`.
