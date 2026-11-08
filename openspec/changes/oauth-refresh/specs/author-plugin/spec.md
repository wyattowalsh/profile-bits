## ADDED Requirements

### Requirement: Named scheme oauth-refresh is copyable
`author-integration` MUST treat `oauth-refresh` as a named allowed `{{scheme}}`. When OpenSpec names `{{scheme}}` `oauth-refresh` for a new integration id and destination `packages/integrations/src/<id>/client.ts` is absent, the skill MUST copy `assets/templates/auth.oauth-refresh.ts.template` onto `packages/integrations/src/<id>/auth.ts`. The skill MUST NOT interpolate `auth.{{scheme}}.ts.template` as a path. The skill MUST NOT invent `auth.ts.template`. Completing a live dest that already has `client.ts` MUST still stop and MUST NOT emit a parallel `auth.ts`. Wave 2 MUST NOT run `author-integration add` for `github`, `wakatime`, `rss`, or `http`.

#### Scenario: New id with named oauth-refresh copies the scheme file
- **WHEN** OpenSpec names `{{scheme}}` `oauth-refresh` for a new integration id whose dest `client.ts` is absent
- **THEN** `author-integration` MUST copy `assets/templates/auth.oauth-refresh.ts.template` onto `packages/integrations/src/<id>/auth.ts` and MUST NOT stop as unknown scheme

#### Scenario: Live dest with client.ts still stops
- **WHEN** `author-integration add` targets an id whose dest `client.ts` already exists
- **THEN** the skill MUST stop and MUST NOT emit a parallel `auth.ts`

#### Scenario: Scheme path is not interpolated
- **WHEN** the skill copies the oauth-refresh auth file
- **THEN** it MUST use the named scheme→filename table entry `auth.oauth-refresh.ts.template` and MUST NOT interpolate `auth.{{scheme}}.ts.template` as a path and MUST NOT invent `auth.ts.template`

#### Scenario: Wave 2 does not add live first-party integrations
- **WHEN** wave 2 extends github, wakatime, rss, or http
- **THEN** it MUST NOT run `author-integration add` for those ids

### Requirement: Alias oauth2 stays unknown
The scheme id MUST be `oauth-refresh`. `oauth2` MUST remain an unknown scheme. When an author or OpenSpec names scheme `oauth2`, `author-integration` MUST stop. The skill MUST NOT invent `auth.oauth2.ts.template`.

#### Scenario: oauth2 stops
- **WHEN** OpenSpec or an author names scheme `oauth2`
- **THEN** `author-integration` MUST stop and MUST NOT invent `auth.oauth2.ts.template`

#### Scenario: Scheme id is oauth-refresh not oauth2
- **WHEN** a Spotify-class integration is named in OpenSpec
- **THEN** `{{scheme}}` MUST be `oauth-refresh` and MUST NOT be `oauth2`

### Requirement: oauth-refresh does not flatten Action inputs
Applying `oauth-refresh` MUST NOT add flattened Action inputs of the form `plugin_<plugin>_<widget>_<option>`. Client id and client secret MUST be named environment variables, not yaml keys, and MUST NOT become extra Marketplace Action inputs. Refresh-token Action names MUST be read from live `ActionInputsSchema` / `types.ts` after a later schema change; this change MUST NOT invent thin Action input names. A later ActionInputsSchema change MUST use yaml `token_env` (http pattern) if it adds a refresh-token input.

#### Scenario: No flattened plugin inputs
- **WHEN** oauth-refresh is specified or applied
- **THEN** the system MUST NOT add `plugin_<plugin>_<widget>_<option>` Action inputs and MUST NOT add a `plugin_spotify` bool

#### Scenario: Client credentials stay named env
- **WHEN** an oauth-refresh consumer needs a client id and client secret
- **THEN** those values MUST come from named environment variables and MUST NOT appear in yaml or as extra Marketplace flatten names

#### Scenario: Thin token names are not invented here
- **WHEN** this change lands
- **THEN** skills MUST NOT invent a new thin Action input name and MUST wait for live `ActionInputsSchema` / `types.ts`
