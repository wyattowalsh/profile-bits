## ADDED Requirements

### Requirement: author-integration copies query-key from a named scheme file
`author-integration` MUST treat `query-key` as a named allowed `{{scheme}}` alongside `none`, `github-bearer`, `wakatime-basic`, and `http-optional`. When OpenSpec names `query-key` for a **new** dest, the skill MUST copy `assets/templates/auth.query-key.ts.template` onto `packages/integrations/src/<id>/auth.ts`. The skill MUST use that literal filename. The skill MUST NOT interpolate `auth.{{scheme}}.ts.template` as a path. The skill MUST NOT invent a default `auth.ts.template`. Unknown scheme names, including `oauth2`, MUST **stop**. A new id whose named scheme is `query-key` MUST NOT stop. If dest `client.ts` exists, the skill MUST **stop** and MUST NOT emit a parallel `auth.ts`. Completing github, wakatime, rss, or http MUST NOT run `author-integration add` against those live dests. Wave 2 MUST extend those live `client.ts` files by hand when dumps need it. The query-key template MUST keep shared export names (`{{ID}}_AUTH`, `is{{Id}}TokenMissing`, `assert{{Id}}ActionToken`, `{{id}}AuthorizationHeader`, `{{id}}RequiresAuthorization`) and MUST return `{}` from the header function (never `{ Authorization: "" }`, never Bearer). `{{id}}RequiresAuthorization()` MUST be true. Catalog `{{auth}}` for query-key sources MUST be `required`. The skill MUST NOT infer `query-key` from catalog `required` (wakatime is also `required` and stays `wakatime-basic`). The skill MUST NOT infer `http-optional` for Steam-class keys.

#### Scenario: OpenSpec-named query-key copies the query-key template
- **WHEN** the author adds a new integration id that is not in live `INTEGRATION_AUTH` and OpenSpec names `{{scheme}}` `query-key`
- **THEN** the skill MUST copy `assets/templates/auth.query-key.ts.template` onto dest `auth.ts` and MUST NOT stop as an unknown scheme

#### Scenario: unknown scheme oauth2 still stops
- **WHEN** OpenSpec names scheme `oauth2` (not `oauth-refresh` and not `query-key`)
- **THEN** the skill MUST stop and MUST NOT invent a template path

#### Scenario: live dest client.ts still stops
- **WHEN** dest `packages/integrations/src/<id>/client.ts` already exists
- **THEN** the skill MUST stop and MUST NOT copy `auth.query-key.ts.template` onto that dest

#### Scenario: query-key is not inferred from catalog required
- **WHEN** catalog auth is `required` and OpenSpec did not name `query-key`
- **THEN** the skill MUST NOT copy `auth.query-key.ts.template` and MUST NOT treat wakatime-basic sources as query-key

#### Scenario: query-key header export is empty
- **WHEN** the query-key auth template is copied
- **THEN** `{{id}}AuthorizationHeader` MUST return `{}` and `{{id}}RequiresAuthorization()` MUST be true
