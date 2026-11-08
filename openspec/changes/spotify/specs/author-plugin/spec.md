## ADDED Requirements

### Requirement: author-integration add spotify only when dest client.ts is absent
`author-integration add spotify` MUST run only when dest `packages/integrations/src/spotify/client.ts` is absent. When that dest is absent and OpenSpec names `{{scheme}}` `oauth-refresh`, the skill MUST copy `assets/templates/auth.oauth-refresh.ts.template` onto `packages/integrations/src/spotify/auth.ts` and MUST NOT stop as unknown scheme. The skill MUST NOT interpolate `auth.{{scheme}}.ts.template` as a path. The skill MUST NOT invent `auth.oauth2.ts.template` or `auth.ts.template`. If dest `client.ts` exists, the skill MUST **stop** and MUST NOT emit a parallel `auth.ts`. Wave 2 MUST NOT run `author-integration add` for `github`, `wakatime`, `rss`, or `http`. Pack agents MUST NOT edit `packages/core/src/types.ts`. Completing live catalog ids MUST NOT append `FIRST_PARTY_*`.

#### Scenario: Absent dest copies oauth-refresh
- **WHEN** dest `packages/integrations/src/spotify/client.ts` is absent and OpenSpec names `oauth-refresh`
- **THEN** `author-integration` MUST copy `auth.oauth-refresh.ts.template` onto dest `auth.ts`

#### Scenario: Live dest still stops
- **WHEN** dest `packages/integrations/src/spotify/client.ts` already exists
- **THEN** `author-integration add spotify` MUST stop and MUST NOT overwrite complete existing sources

#### Scenario: Wave 2 does not add live first-party integrations
- **WHEN** wave 2 extends github, wakatime, rss, or http
- **THEN** it MUST NOT run `author-integration add` for those ids

### Requirement: Spotify authoring does not flatten Action inputs
Applying Spotify MUST NOT add `plugin_spotify` or `plugin_<plugin>_<widget>_<option>` Action inputs. Client id and client secret MUST stay named env `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`. Skills MUST read live `ActionInputsSchema` for `spotify_token` (no default) and MUST NOT invent thin names. `docs-full-catalog-playground` MUST stay in place.

#### Scenario: No flattened plugin inputs
- **WHEN** Spotify is authored
- **THEN** the system MUST NOT add `plugin_spotify` or `plugin_<plugin>_<widget>_<option>` inputs

#### Scenario: Client credentials stay named env
- **WHEN** Spotify needs a client id and client secret
- **THEN** those values MUST come from `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` and MUST NOT appear in yaml
