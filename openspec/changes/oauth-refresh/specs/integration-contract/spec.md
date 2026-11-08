## ADDED Requirements

### Requirement: oauth-refresh exchanges a refresh token for a Bearer access token
Scheme `oauth-refresh` MUST exchange a refresh token plus client credentials for an access token, then send `Authorization: Bearer ${access_token}` on resource requests. The consumer integration OpenSpec MUST name the token endpoint. The token request MUST use `grant_type=refresh_token`. The refresh token MUST NOT be sent as `Authorization`. The refresh token MUST NOT be sent as `?key=` or `?api_key=`. `oauth-refresh` MUST NOT reuse `http-optional` (http-optional sends the secret as Bearer or raw on the resource request). Catalog auth for an `oauth-refresh` consumer MUST be `required`. `decideActionToken` MUST remain GitHub-only. Shared export names MUST match the other schemes: `{{ID}}_AUTH`, `is{{Id}}TokenMissing`, `assert{{Id}}ActionToken`, `{{id}}AuthorizationHeader`, `{{id}}RequiresAuthorization`. `{{id}}AuthorizationHeader` MUST take the access token, not the refresh token. `{{id}}RequiresAuthorization()` MUST be true.

#### Scenario: Resource request uses access-token Bearer
- **WHEN** an oauth-refresh client calls a resource API after a successful token refresh
- **THEN** the request MUST include `Authorization: Bearer ${access_token}` and MUST NOT send the refresh token in that header

#### Scenario: Refresh token is not a query key
- **WHEN** an oauth-refresh client refreshes or fetches
- **THEN** it MUST NOT put the refresh token, client secret, or access token in `?key=` or `?api_key=`

#### Scenario: http-optional is not reused
- **WHEN** OpenSpec names scheme `oauth-refresh`
- **THEN** the client MUST exchange the refresh token at the named token endpoint with `grant_type=refresh_token` and MUST NOT send the refresh token as http-optional Bearer on the resource request

#### Scenario: decideActionToken stays GitHub-only
- **WHEN** oauth-refresh auth helpers run
- **THEN** they MUST NOT call `decideActionToken`

### Requirement: oauth-refresh secrets never persist or log
Refresh token, access token, and client secret MUST NEVER appear in logs, widget payloads, typed dumps, or cache keys. Client id is a public env name and MUST NOT be written into yaml or widget payloads. Access tokens MUST NOT persist across Action runs. In-run memory is allowed to hold the access token. Secrets MUST NEVER persist on disk. Cache keys MUST NOT include secret values.

#### Scenario: Secrets stay out of logs and dumps
- **WHEN** an oauth-refresh client refreshes or fetches
- **THEN** logs, widget payloads, typed dumps, and cache keys MUST NOT contain the refresh token, access token, or client secret

#### Scenario: Access token does not persist across runs
- **WHEN** an Action run ends
- **THEN** the access token MUST NOT be written to disk or reused on the next run

### Requirement: oauth-refresh missing credentials fail the job when the pack is on
Empty / `""` / whitespace refresh token MUST be missing. Empty / `""` / whitespace client id or client secret MUST be missing. When a pack that uses `oauth-refresh` is on and the refresh token or client credentials are missing, the Action MUST `fail_job` and MUST NOT send the token request or resource requests. When that pack is absent, missing credentials MUST NOT fail the job. Playground and docs preview MUST use fixtures or skip live oauth-refresh and MUST NOT treat `POST /api/preview` as a public embed API. Header helpers that omit Authorization MUST return `{}` and MUST NOT return `{ Authorization: "" }`.

#### Scenario: Missing token with pack on fails the job
- **WHEN** yaml enables a pack that uses `oauth-refresh` and the refresh token is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send unauthenticated or refresh-less requests

#### Scenario: Pack absent does not require token
- **WHEN** yaml omits the pack that would use `oauth-refresh`
- **THEN** a missing refresh token MUST NOT fail the job

#### Scenario: Missing client credentials fail the job when pack is on
- **WHEN** yaml enables a pack that uses `oauth-refresh` and the client id or client secret env is empty, `""`, or whitespace
- **THEN** the job MUST fail and MUST NOT send the token request

#### Scenario: Playground is not an embed API
- **WHEN** the docs playground previews an oauth-refresh widget
- **THEN** it MUST use fixtures or skip live and MUST NOT treat `POST /api/preview` as a public embed API

### Requirement: oauth-refresh client credentials are named env not yaml
Client id and client secret MUST come from named environment variables declared by the consumer integration OpenSpec. They MUST NOT appear in yaml. They MUST NOT become flattened `plugin_<plugin>_<widget>_<option>` Action inputs or extra Marketplace Action inputs. This change MUST NOT add a first-party pack, widget, or integration id.

#### Scenario: Client credentials are not yaml
- **WHEN** an oauth-refresh consumer is configured
- **THEN** client id and client secret MUST NOT be yaml keys

#### Scenario: No flattened Action inputs
- **WHEN** oauth-refresh is specified
- **THEN** the system MUST NOT add `plugin_<plugin>_<widget>_<option>` inputs and MUST NOT add extra Marketplace flatten names for client id or client secret

#### Scenario: No first-party id in this change
- **WHEN** this change lands
- **THEN** `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, and `FIRST_PARTY_INTEGRATION_IDS` MUST NOT gain a new id from this change
