# Workstream: steam

Wave 3 elbow #4. Required query-key auth (`?key=`). Yaml `token_env` + Action `steam_token`. Bearer will not work.

## Data

Complete dump of GetPlayerSummaries, GetRecentlyPlayedGames, ResolveVanityURL. Widgets `player`, `recent` on Stat + Image.

## Files

- `packages/integrations/src/steam/`
- `packages/plugins/src/steam/`
- auth-schemes `query-key` must exist

## Verify

- Key in query not Authorization Bearer
- Token not in cache key or logs
- Pack-on missing token fail_job

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W3-ST-01…05 | 3–7 | B-09, W2-A-04, W3-T-01 |
