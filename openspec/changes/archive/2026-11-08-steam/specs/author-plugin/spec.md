## ADDED Requirements

### Requirement: author-integration add steam copies query-key when dest client.ts is absent
`author-integration add steam` MUST run only when dest
`packages/integrations/src/steam/client.ts` is absent. OpenSpec names
`{{scheme}}` `query-key` for steam. The skill MUST copy
`assets/templates/auth.query-key.ts.template` onto dest `auth.ts` using
that literal filename. The skill MUST NOT interpolate
`auth.{{scheme}}.ts.template` as a path. The skill MUST NOT copy
`auth.http-optional.ts.template` for steam. Unknown scheme names,
including `oauth2`, MUST still **stop**. If dest `client.ts` exists, the
skill MUST **stop** and MUST NOT emit a parallel `auth.ts`. Completing
github, wakatime, rss, or http MUST NOT run `author-integration add`
against those live dests. Pack agents MUST NOT edit
`packages/core/src/types.ts` and MUST NOT append `FIRST_PARTY_*`. Skills
MUST NOT invent `plugin_<plugin>_<widget>_<option>` inputs or a
`plugin_steam` bool. `POST /api/preview` remains layout preview, not a public embed API.
Skills MUST NOT run `npx skills add`.

#### Scenario: OpenSpec-named query-key copies the query-key template for steam
- **WHEN** dest `packages/integrations/src/steam/client.ts` is absent and
  OpenSpec names `{{scheme}}` `query-key` for steam
- **THEN** the skill MUST copy `assets/templates/auth.query-key.ts.template`
  onto dest `auth.ts` and MUST NOT stop as an unknown scheme

#### Scenario: live dest client.ts still stops
- **WHEN** dest `packages/integrations/src/steam/client.ts` already
  exists
- **THEN** the skill MUST stop and MUST NOT copy
  `auth.query-key.ts.template` onto that dest

#### Scenario: steam is not http-optional
- **WHEN** the author adds steam
- **THEN** the skill MUST NOT copy `auth.http-optional.ts.template` and
  MUST NOT send Steam keys as Bearer

#### Scenario: Wave 2 dests stay add-forbidden
- **WHEN** skills are asked to add github, wakatime, rss, or http
- **THEN** they MUST NOT run `author-integration add` for those ids

#### Scenario: types.ts stays single-writer
- **WHEN** a steam pack, widget, or integration agent runs
- **THEN** it MUST NOT edit `packages/core/src/types.ts` and MUST NOT
  append `FIRST_PARTY_*`

#### Scenario: Preview is not an embed API
- **WHEN** docs preview a steam widget
- **THEN** `POST /api/preview` MUST remain layout preview, not a public embed API
