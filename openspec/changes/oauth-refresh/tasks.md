## 1. OpenSpec artifacts (W2-A-01)

- [x] 1.1 Exclusive: `openspec/changes/oauth-refresh/proposal.md`. Name scheme `oauth-refresh` (not `oauth2`). No flatten. No live `author-integration add` for github/wakatime/rss/http.
- [x] 1.2 Exclusive: `openspec/changes/oauth-refresh/design.md`. Refresh-then-Bearer; client id/secret named env; skill table after sibling `query-key`; no `ActionInputsSchema` in this node.
- [x] 1.3 Exclusive: `openspec/changes/oauth-refresh/specs/author-plugin/spec.md`. ADDED: copyable `oauth-refresh`, `oauth2` still stops, no flatten.
- [x] 1.4 Exclusive: `openspec/changes/oauth-refresh/specs/integration-contract/spec.md`. ADDED: refresh-then-Bearer, secrets never persist/log, `fail_job` when pack on, named env not yaml.
- [x] 1.5 `pnpm exec openspec validate --strict --type change oauth-refresh`. Do not archive. Do not edit `openspec/specs/**`.

## 2. Tests (W2-A-01)

- [x] 2.1 Exclusive: `scripts/oauth-refresh.test.ts`. Assert change files name `oauth-refresh`, stop on `oauth2`, forbid `plugin_*_*_*`, require refresh-then-Bearer and named env, and do not add first-party ids.

## 3. Later apply (not this node)

- [x] 3.1 Add `auth.oauth-refresh.ts.template` under author-integration assets after this spec. Do not interpolate `auth.{{scheme}}.ts.template`. Do not emit parallel `auth.ts` onto live github/wakatime/rss/http.
- [x] 3.2 Serialize author-integration scheme-table apply (`SKILL.md` / `references/auth.md` / evals) **after** W2-A-02 `query-key` spec exists. This node MUST NOT edit those shared files.
- [x] 3.3 Thin `*_token` / yaml `token_env` stay W2-A-03 (`ActionInputsSchema`). Spotify pack stays wave 3. Do not flatten. Do not commit. Do not tag `v1` at `main`.
