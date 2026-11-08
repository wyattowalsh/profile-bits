## 1. OpenSpec contract

- [x] 1.1 Exclusive: `openspec/changes/spotify/proposal.md`. Complete-existing catalog ids. oauth-refresh. `now-playing` / `top`. Do not rewrite `docs-full-catalog-playground`.
- [x] 1.2 Exclusive: `design.md`. Token URL, named env, dump, exclusive dest trees, no `types.ts`.
- [x] 1.3 Exclusive: `specs/integration-contract/spec.md`, `specs/plugin-contract/spec.md`, `specs/widget-contract/spec.md`, `specs/author-plugin/spec.md`.
- [x] 1.4 `pnpm exec openspec validate --strict --change spotify`. Do not archive. Do not edit `openspec/specs/**`.

## 2. author-integration add (dest client.ts absent)

- [x] 2.1 Exclusive: `.agents/profile-bits/skills/author-integration/assets/templates/auth.oauth-refresh.ts.template` (literal filename; shared export names; Bearer **access** token; no `decideActionToken`).
- [x] 2.2 Exclusive: `packages/integrations/src/spotify/{auth,scopes,inputs,cache,payload,client,loadFixture,index}.ts` plus fixtures. Scheme `oauth-refresh`. Token URL `https://accounts.spotify.com/api/token`. Env `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`. Never log the refresh token.
- [x] 2.3 Do not edit live `packages/integrations/src/{github,wakatime,rss,http}/client.ts`. Do not run `author-integration add` for those ids. Do not run `npx skills add`. Do not edit `types.ts`. Do not commit.

## 3. Pack and widgets

- [x] 3.1 Exclusive: `packages/plugins/src/spotify/plugin.ts` + `plugin.test.ts`. Widgets `now-playing`, `top`. Defaults `now-playing`. bitsUsed unions Image. No pack-level flatten.
- [x] 3.2 Exclusive: `packages/plugins/src/spotify/widgets/now-playing/**` and `top/**`. Dump readers. No HTTP. Album art via Image. `top` limit widget-side.

## 4. Tests

- [x] 4.1 Exclusive: integration mocked-HTTP tests — missing token/credentials `fail_job`, refresh-then-Bearer, cache omits secrets, never log refresh token, never REST `/languages`, fixtures extra keys.
- [x] 4.2 Exclusive: widget tests — no `fetch(`, currently-playing then recently-played fallback, `top` limit, extra dump keys, Image cover URLs.
- [x] 4.3 Exclusive: `scripts/spotify.test.ts` — change files, locks, dest `client.ts` present, template path, `docs-full-catalog-playground` stays.
