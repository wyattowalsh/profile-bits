## Context

See `proposal.md` Why. `elbow-catalog` (W3-T-01) already appended plugin
`steam`, integration `steam`, widgets `player` / `recent`,
`INTEGRATION_AUTH.steam = required`, yaml `token_env` / `user`, and pack
default `player`. `query-key` named scheme `?key=` and shipped helpers
under `packages/integrations/src/query-key/`. `action-token-env`
reserved thin Action `steam_token` (no default). **W3-ST-01 is
spec-only** (`openspec/changes/steam/**` plus exclusive tests). File
lock: pack agents MUST NOT edit `packages/core/src/types.ts`. Dest
`packages/integrations/src/steam/` and `packages/plugins/src/steam/`
are W3-ST-02…05.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Vitest 4, Biome
2.5. Never unauthenticated GitHub. Never REST `/languages`. No
`plugin_*_*_*`. No Playwright in the Action. Do not run
`npx skills add`. Do not tag `v1` on `main`. Do not
`author-integration add` github / wakatime / rss / http. Finish
`docs-full-catalog-playground` in place.

## Goals / Non-Goals

**Goals:**

- Land an OpenSpec-first steam fetch/render contract: query-key
  `?key=`, `steam_token`, widgets `player` and `recent`, key not in
  logs or cache key.
- Keep pack-on missing token `fail_job`. Dump the three allowed Steam
  Web API methods. Widgets select; `limit` stays widget-side.
- Unlock W3-ST-02 `author-integration add steam` only while dest
  `client.ts` is absent.

**Non-Goals:**

- Creating `packages/integrations/src/steam/**` or
  `packages/plugins/src/steam/**` in this node (W3-ST-02+).
- Editing `packages/core/src/types.ts` (W3-T-01).
- Editing `ActionInputsSchema` / `action.yml` (W2-A-03 already named
  `steam_token`).
- Rewriting `docs-full-catalog-playground`, `elbow-catalog`,
  `query-key`, or `action-token-env`.
- Archiving this change from this node.
- Playground / catalog route expansion in this node.
- Folding Steam into integration `http`. Last.fm `api_key=` (different
  param) stays out of query-key.

## Decisions

### 1. Change id is `steam`, not a new docs id

- **Choice:** One OpenSpec change per steam workstream. Spec deltas live
  under `openspec/changes/steam/`. Main `openspec/specs/**` stay
  untouched until archive.
- **Why:** Facts: each workstream is its own change; new ids are
  OpenSpec-first (`elbow-catalog` named them); leftover docs change
  finishes in place. Pack workstreams MAY add later OpenSpec for
  fetch/render without minting new catalog ids.
- **Alternative:** Fold into `elbow-catalog` — rejected; that change is
  the types.ts fan-in, already tasked. Alternative: fold into
  `query-key` — rejected; query-key explicitly deferred steam dest.
  Alternative: mint `add-steam-integration` plus a docs id — rejected;
  do not rewrite `docs-full-catalog-playground`.

### 2. Spec-only this node; dest client is W3-ST-02

- **Choice:** W3-ST-01 writes proposal / design / spec deltas / tasks
  plus `scripts/steam.test.ts`. Wave 3 MAY `author-integration add steam`
  in W3-ST-02 only when dest `client.ts` is absent, copying
  `auth.query-key.ts.template`. The dest client MUST call
  `applyQueryKey` at send time and MUST import query-key helpers rather
  than reimplement Bearer.
- **Why:** Intra-pack OpenSpec → client → payload/fixtures → plugin →
  widgets is a pipeline. Same-file exclusive: ST-02 owns
  `packages/integrations/src/steam/**`.
- **Alternative:** Scaffold dest `client.ts` here — rejected; that
  collides with ST-02 and would make `author-integration add` stop.

### 3. Complete dump of three Steam Web API methods

- **Choice:** Shared client GETs, over `https://api.steampowered.com`
  only: `ISteamUser/ResolveVanityURL/v1` when yaml `user` is not a
  17-digit steamid64; `ISteamUser/GetPlayerSummaries/v2`;
  `IPlayerService/GetRecentlyPlayedGames/v1`. Cache the returned JSON
  dump. Widgets MUST NOT HTTP. `recent` yaml `limit` MUST NOT drop
  games at fetch.
- **Why:** steam.md: complete dump of those three. Facts: widgets only
  read the cache; include/limit run in the widget.
- **Alternative:** Fetch only the fields `player` renders today —
  rejected; leftover dumps blocked reuse on github/wakatime. Alternative:
  extra Steam endpoints (owned games, friends) — rejected; not in the
  workstream data list.

### 4. Query-key helpers, never http-optional Bearer

- **Choice:** Every steam request sets query param `key` to the trimmed
  `steam_token`. Header function returns `{}`. Cache key is
  `(method, url-without-key, params-without-key, auth: "query-key")`.
  Logs pass the token to `redactSecrets`. Yaml MUST NOT store the key.
- **Why:** query-key design and steam.md verify: key in query not
  Authorization Bearer; token not in cache key or logs.
- **Alternative:** Reuse `http-optional` Bearer — rejected; Bearer
  cannot transmit Steam keys. Alternative: put `key` in yaml headers —
  rejected; secrets in config.

### 5. Cover maps to Image; pack default is player

- **Choice:** Inventory “Cover (shared)” is bit `Image` (`readme-card-bits`).
  Widgets `player` and `recent` use Stat + Image. Pack defaults stay
  `STEAM_PACK_DEFAULT_WIDGETS = ["player"]`; `recent` is opt-in like
  github `repo`. Yaml `user` is Steam vanity or steamid64 — Action
  `user` remains GitHub login and MUST NOT be treated as a Steam id.
- **Why:** Frozen 11 Stat already exists; Image is the approved 12th.
  MUST NOT create `Cover.tsx`. Types already freeze pack defaults.
- **Alternative:** Widget id `stats` for the player card — rejected;
  `stats` is github. Alternative: default both widgets on — rejected;
  types already default `player` only.

## Risks / Trade-offs

- [author-integration SKILL.md still lists four schemes] → Template
  `auth.query-key.ts.template` exists; this change names `query-key` for
  steam; W3-ST-02 applies the skill-table row as part of add, not this
  node (query-key deferred SKILL.md).
- [Private Steam profiles return empty `players[]`] → Widgets render an
  empty card and MUST NOT invent `0`. Missing token stays `fail_job`.
- [ResolveVanityURL is an extra hop] → Skip when yaml `user` is already
  steamid64. Do not treat GitHub `user` as vanity.

## Migration Plan

Land unarchived. Targeted vitest on `scripts/steam.test.ts`. Rollback is
revert of `openspec/changes/steam/` and that test. Do not edit
`openspec/specs/**` until archive. Do not archive from this node.
Archive after W3-ST-05 (dest client, fixtures, plugin, widgets).

## Open Questions

None. Client id/secret stay Spotify-only named env. Steam is query-key
`steam_token` plus yaml `token_env`. LeetCode / chess stay auth `none`.
