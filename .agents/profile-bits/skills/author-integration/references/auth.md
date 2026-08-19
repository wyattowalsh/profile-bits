# Auth (integration + widget option)

Load when scaffolding `auth.ts` or deciding token / capability behavior. Reuse `packages/core/src/auth-policy.ts`. Do not fork a second matrix.

There is **no** default `auth.ts.template`. Copy **one** scheme file from the
SKILL four-file scheme→filename table onto
`packages/integrations/src/<id>/auth.ts` only when dest is empty or new. Do
not interpolate `auth.{{scheme}}.ts.template` as a path. If dest `client.ts`
exists, **stop**. Never omit `src/` under `packages/integrations/`. Refuse
dest `../`.

Read live `INTEGRATION_AUTH` in `packages/core/src/types.ts`. The id rows
below are a **copy of that live map** plus this skill’s `{{scheme}}`
(types.ts does not store scheme). Re-read `types.ts`; do not bump this
table as law when packs are added. If live `INTEGRATION_AUTH` has an id
not shown here, follow types.ts and OpenSpec. Never invent ids.

If `id` is already in live `INTEGRATION_AUTH`, copy that scheme file from
this snapshot. Else OpenSpec names `{{scheme}}`.

Today’s snapshot (header/fail is not in `types.ts`):

| Id | `INTEGRATION_AUTH` | `{{scheme}}` | Header / fail |
| --- | --- | --- | --- |
| `static` | `none` | `none` | No `Authorization`. |
| `github` | `optional` | `github-bearer` | Bearer. Empty/whitespace token is `fail_job`. `decideActionToken` is GitHub-only. |
| `wakatime` | `required` | `wakatime-basic` | RFC Basic `base64(api_key:)`. Never Bearer. Never `decideActionToken`. |
| `rss` | `none` | `none` | No `Authorization`. |
| `http` | `optional` | `http-optional` | Unset sends no `Authorization`. Whitespace is `fail_widget` (not `fail_job`). Never `decideActionToken`. |

Completing an id already in `FIRST_PARTY_INTEGRATION_IDS` is allowed. A new
id needs OpenSpec first (OpenSpec must name `{{scheme}}` in
`{none, github-bearer, wakatime-basic, http-optional}`). Copy that named
file from the four-file list. Unknown **scheme** **stops**. A new id with a
named allowed scheme does **not** stop. Do not infer `github-bearer` from
catalog `optional`. Do not create a second pack for an id already in
`FIRST_PARTY_PLUGIN_IDS`. Templates are for **new** ids; do not emit a
parallel `auth.ts` onto any live dest from the catalog (any dest with
`client.ts`). Thin Action names: read `ActionInputsSchema` (optional
`wakatime_token`, `http_token_env`); never invent `plugin_*_*_*`.

Shared export **names**: `{{ID}}_AUTH`, `is{{Id}}TokenMissing`,
`assert{{Id}}ActionToken`, `{{id}}AuthorizationHeader`,
`{{id}}RequiresAuthorization`. Header functions return `{}` for none-kind —
never `{ Authorization: "" }`.

`{{auth}}` is catalog `none | optional | required` from live
`INTEGRATION_AUTH`. `{{scheme}}` is the header/fail policy. They are **not**
1:1 (github and http are both `optional`).

## Per integration

Runtime notes for today’s snapshot (same ids as live `INTEGRATION_AUTH`).
Copy the named scheme file for a **new** dest only. Do not emit a parallel
`auth.ts` onto any live dest from the catalog.

| Id | `INTEGRATION_AUTH` | `{{scheme}}` | Runtime |
| --- | --- | --- | --- |
| `static` | `none` | `none` | No `Authorization`. No GitHub. Fixtures only (`demo`, tests, docs preview). Copy `auth.none.ts.template` for a **new** none-kind id. |
| `rss` | `none` | `none` | No `Authorization`. https GET + cache inside the rss client. Copy `auth.none.ts.template` for a **new** none-kind id. |
| `github` | `optional` | `github-bearer` | **Not** unauthenticated. Action requires a non-empty token. Playground uses a GitHub App token or fixtures. Copy `auth.github-bearer.ts.template` for a **new** id only. |
| `wakatime` | `required` | `wakatime-basic` | Missing API key fails the run. Never send the request without the secret. RFC Basic `base64(api_key:)`. Never Bearer. Never `?api_key=`. Never `decideActionToken`. Copy `auth.wakatime-basic.ts.template` for a **new** id only. |
| `http` | `optional` | `http-optional` | Unset / `null` token sends no `Authorization`. `""` / whitespace is `fail_widget` before fetch, not `fail_job`. Else Bearer unless the value already has `Bearer` / `token` / `Basic`. Never `decideActionToken`. Copy `auth.http-optional.ts.template` for a **new** id only. Pack auth stays `optional` even when a request sets per-request `auth: "none"`. |

`auth: optional` MUST NOT send a GitHub request without `Authorization`. Unauthenticated 60 requests/hour per IP MUST NEVER be used.

### none (`auth.none.ts.template`)

`{{id}}RequiresAuthorization() === false`. `assert{{Id}}ActionToken` is a
no-op. Header `{}`.

### wakatime-basic (`auth.wakatime-basic.ts.template`)

`{{id}}RequiresAuthorization() === true`. `is{{Id}}TokenMissing` → construct
`fail_job`. Header is RFC Basic `base64(api_key:)`. Never Bearer. Never
`?api_key=`. Never `decideActionToken`.

### http-optional (`auth.http-optional.ts.template`)

`{{id}}RequiresAuthorization() === false`. `assert{{Id}}ActionToken` is a
no-op; construct never throws. Unset / `null` → header `{}`. `""` /
whitespace → `{ kind: "missing" }` and send/fetchJson throws `fail_widget`
before fetch. Else Bearer unless the value already has `Bearer` / `token` /
`Basic`. Never `fail_job` for a missing optional token.

## Action token (github)

github-bearer (`auth.github-bearer.ts.template`, **new-id only**):
`{{id}}RequiresAuthorization() === true`. Always `Bearer ${token}`.

- Empty / `""` / whitespace `github_token` is **missing** (`isMissingToken` → `decideActionToken` → `fail_job`).
- Missing Action token fails the job **before any request**. Do not substitute `${{ github.token }}` when the input was explicitly empty.
- Omitted (absent) input may default to `${{ github.token }}` — that is not the empty-string case.
- Default Actions `github.token` rate: **1,000 REST/hour and 1,000 GraphQL points/hour per repo**, not 5,000. User PAT: 5,000/hour.

Do not copy `decideActionToken` into wakatime or http auth. `decideActionToken`
is GitHub Action-token policy only.

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
