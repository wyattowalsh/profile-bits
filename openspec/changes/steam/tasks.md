## 1. OpenSpec artifacts (W3-ST-01)

- [x] 1.1 Exclusive: `openspec/changes/steam/proposal.md`. Steam query-key `?key=`, Action `steam_token`, widgets `player` and `recent`, key not in logs or cache key. Do not rewrite `docs-full-catalog-playground`.
- [x] 1.2 Exclusive: `openspec/changes/steam/design.md`. Spec-only this node; W3-ST-02+ own `packages/integrations/src/steam/**` and `packages/plugins/src/steam/**`. Do not edit `packages/core/src/types.ts`.
- [x] 1.3 Exclusive: `specs/integration-contract/spec.md`. ADDED query-key steam client, complete dump of GetPlayerSummaries / GetRecentlyPlayedGames / ResolveVanityURL, pack-on `fail_job`, secret-free cache/logs.
- [x] 1.4 Exclusive: `specs/widget-contract/spec.md`. ADDED `player` and `recent` select from the dump on Stat + Image; no HTTP; recent `limit` is widget-side.
- [x] 1.5 Exclusive: `specs/plugin-contract/spec.md`. ADDED steam yaml `token_env` / `user`, pack default `player`, no `plugin_steam` bool, no flatten.
- [x] 1.6 Exclusive: `specs/author-plugin/spec.md`. ADDED `author-integration add steam` copies `auth.query-key.ts.template` when dest `client.ts` is absent; MUST NOT add github/wakatime/rss/http; MUST NOT edit `types.ts`.
- [x] 1.7 `pnpm exec openspec validate --strict --type change steam`. Do not archive. Do not edit `openspec/specs/**`.

## 2. Tests (W3-ST-01)

- [x] 2.1 Exclusive: `scripts/steam.test.ts`. Assert query-key `?key=`, `steam_token`, widgets `player`/`recent`, key not in logs or cache key, pack-on `fail_job`, no flatten, no live dest add, dest `client.ts` still absent, `docs-full-catalog-playground` stays in place.

## 3. Later apply — dest client (W3-ST-02)

- [x] 3.1 Exclusive: `packages/integrations/src/steam/**`. `author-integration add steam` only if dest `client.ts` is absent. Scheme `query-key`. Apply `?key=` at send time. Import query-key helpers. Never Authorization Bearer. Never `author-integration add` github / wakatime / rss / http. Do not edit `types.ts`.

## 4. Later apply — payload types and fixtures (W3-ST-03)

- [x] 4.1 Exclusive: steam payload types plus fixtures for GetPlayerSummaries, GetRecentlyPlayedGames, and ResolveVanityURL. Extra dump keys MUST NOT fail parse. Secrets MUST NOT appear in fixtures.

## 5. Later apply — plugin (W3-ST-04)

- [x] 5.1 Exclusive: `packages/plugins/src/steam/plugin.ts`. Pack `steam`, widgets `[player, recent]`, integration `steam`, defaults `{ widgets: ["player"] }`. No `plugin_steam` bool.

## 6. Later apply — widgets (W3-ST-05)

- [x] 6.1 Exclusive: `packages/plugins/src/steam/widgets/{player,recent}/**`. Select from the dump; Stat + Image; no HTTP. `recent` applies `limit` widget-side. Empty copy MUST NOT invent `0`. Do not commit. Do not tag `v1` at `main`.
