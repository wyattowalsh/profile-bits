# Workstream: spotify

Wave 3 elbow #1. OpenSpec new integration + pack + widgets. `author-integration add spotify` only because dest `client.ts` does not exist.

## Auth

Required `oauth-refresh`. Yaml `token_env` + Action `spotify_token` (refresh, no default). Client id/secret named env, not yaml.

## Data

Complete dump of currently-playing (recently-played fallback) and top tracks. Album art URLs in the model; Image bit renders them. Widgets: `now-playing`, `top`. No HTTP in widgets.

## Files

- `packages/integrations/src/spotify/`
- `packages/plugins/src/spotify/plugin.ts` + widgets
- Action input + generate-action
- fixtures for playground

## Verify

- Missing token with pack on fails closed
- Fixtures default in docs
- `just generate-action --check`
- Never logs the refresh token

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W3-SP-01…05 | 3–7 | B-09, W2-A-04, W3-T-01 |
