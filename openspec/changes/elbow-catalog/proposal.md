## Why

Wave 3 elbow packs (`spotify`, `leetcode`, `chess`, `steam`) and reuse widgets on
existing packs need catalog ids before pack agents implement clients and cards.
`FIRST_PARTY_*` is a single-file fan-in: seven pack agents MUST NOT edit
`packages/core/src/types.ts`. W3-T-01 appends the enums and widget maps after
OpenSpec names them.

## What Changes

- Append first-party plugin ids `spotify`, `leetcode`, `chess`, `steam` (keep
  `github`, `wakatime`, `rss`, `http`).
- Append integration ids `spotify`, `leetcode`, `chesscom`, `lichess`, `steam`.
  Chess is one pack with two integrations. There is no integration id `chess`.
- Append globally unique widget ids and `WIDGET_INTEGRATIONS` maps:
  github reuse `top-repos` + `contributions`; wakatime slices `editors`,
  `projects`, `os`, `langs`; rss `latest`; spotify `now-playing` + `top`;
  leetcode `solved` + `heatmap`; chess `ratings` + `game`; steam `player` +
  `recent`.
- Widget id `languages` stays github. WakaTime languages slice is `langs`.
  Widget id `heatmap` stays leetcode. GitHub contribution heatmap is
  `contributions`. Chess MUST NOT use widget id `stats`.
- `INTEGRATION_AUTH`: `spotify` and `steam` `required`; `leetcode`,
  `chesscom`, `lichess` `none`. Action `spotify_token` / `steam_token` already
  exist (no default). No `plugin_spotify` / `plugin_steam` / `plugin_leetcode`
  / `plugin_chess` bools. No `plugin_<plugin>_<widget>_<option>` inputs.
- Pack agents complete these existing ids. They MUST NOT append `FIRST_PARTY_*`
  and MUST NOT edit `packages/core/src/types.ts`.
- Frozen 11 bits and `docs-full-catalog-playground` stay in place. Bits are
  not enumerated in core. Wave 2 MUST NOT `author-integration add` github /
  wakatime / rss / http.

## Capabilities

### New Capabilities

- (none — catalog ids extend existing plugin / widget / integration / author
  contracts)

### Modified Capabilities

- `plugin-contract`: first-party pack ids include elbow packs; chess is one
  pack; reuse widgets stay on existing packs; no extra pack bools or flatten.
- `widget-contract`: ADDED globally unique Wave 3 widget ids and integration
  bindings; collisions with `stats`, `languages`, and leetcode `heatmap`
  resolved.
- `integration-contract`: ADDED elbow integration ids and auth requirements;
  chess.com + lichess; never unauth GitHub; never REST `/languages`.
- `author-plugin`: skills read live `FIRST_PARTY_*` after this delta; pack
  agents complete existing ids and MUST NOT edit `types.ts`.

## Impact

- Specs: MODIFIED / ADDED deltas under this change. Do not edit
  `openspec/specs/**` until archive. Finish `docs-full-catalog-playground` in
  place (do not rewrite that change id). Pack workstreams MAY add later
  OpenSpec for client/widget behavior without minting new catalog ids.
- Code (this node): `packages/core/src/types.ts` `FIRST_PARTY_*`,
  `INTEGRATION_AUTH`, `WIDGET_INTEGRATIONS`, yaml plugin/widget option maps,
  tests. Pack implementations, live `client.ts`, playground routes, and
  `author-integration add` land in later W3 nodes.
- Out of scope: Playwright in the Action, tagging `v1` at `main`,
  `POST /api/preview` as an embed API, `npx skills add`, git commit,
  `plugin_*_*_*` inputs, unauthenticated GitHub, REST `/languages`.
