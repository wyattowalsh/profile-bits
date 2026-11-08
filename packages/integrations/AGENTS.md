# @profile-bits/integrations

Reusable data sources. First-party follow live `FIRST_PARTY_INTEGRATION_IDS`: **`static`** (auth `none`, JSON fixtures), **`github`** (token-class + capability; never unauth), **`wakatime`** (auth `required`; RFC Basic; Cloud + Wakapi compat), **`rss`** (auth `none`; https GET + cache inside the rss client), **`http`** (auth `optional`; injectable `createHttpClient({ fetch, lookup, token })`; SSRF via ssrfcheck + ipaddr unicast), **`spotify`** (auth `required`; scheme `oauth-refresh`), **`leetcode`** (auth `none`; GraphQL POST), **`chesscom`** and **`lichess`** (auth `none`), and **`steam`** (auth `required`; scheme `query-key`). Elbow clients are not re-exported from `src/index.ts`.

One client instance per Action/playground run, shared by every widget that needs it.

## Cache

- REST key: `(method, url, params)` (GitHub). Shared HTTP REST also includes `auth` and canonicalized yaml `headers`.
- GraphQL key: `(query, variables)` — not `POST /graphql` alone
- WakaTime REST cache lives in `src/wakatime/cache.ts` (do not steal `src/github/cache.ts`)
- Rss GET key: `(method, url, params)` — run-scoped Map + in-flight single-flight inside the rss client
- Shared HTTP REST cache: `src/cache.ts` key `(method, url, params, auth, headers)` with `auth: "none" | "bearer"` (never the secret) and canonicalized yaml headers. Do not edit `src/rss/cache.ts` from the http module.

## WakaTime

- `auth: required`. Never send without `Authorization`. Never public unauthenticated scrape. RFC Basic `base64(api_key + ":")`. Never `?api_key=`. Never Bearer for the API key.
- Path split: hostname `wakatime.com` → `https://wakatime.com/api/v1/users/current/stats/{range}`; other allowed hosts → Wakapi compat `/api/compat/wakatime/v1/users/current/stats/{range}`.
- `classifyWakatimeHttp` is separate from GitHub: 401 `fail_run`; 403/429/302/202/5xx `fail_after_backoff`; 404/400 `fail_widget`; 200 + `is_up_to_date` false `fail_after_backoff`.
- `api_domain` is hostname-only; DNS lookup denies private IPs; `redirect: "error"`. Native Hakatime is out of scope.
- Playground/docs: fixtures under `src/wakatime/fixtures/` or skip live. Never unauth.

## Rss fixtures

Playground/docs wrap **rss XML fixtures** under `packages/integrations/src/rss/fixtures/` (Atom/RSS 2.0, empty, malformed, XXE). That is the rss integration’s own fixture mode — **not** a second static JSON pack. Do not invent a second static fixture pack. **Zero live feeds.**

## GitHub crawl

- Never send a request without `Authorization`. Empty token does not mean unauthenticated 60/h.
- REST crawl (`stats` / `languages`): `GET /users/{login}` + paginated `/repos?type=owner&per_page=100`. **Filter** forks/archived **then cap 500** remaining. Stars and language bytes share that ordered id list.
- Widget `repo`: authenticated `GET /repos/{owner}/{repo}` (`fetchGithubRepo`). Primary language is the repo object `language` string only. Never GraphQL for this fetch.
- Crawl remains stats/languages. `demo` and `repo` skip crawl (`demo`: `GET /user` probe only; `repo`: probe + repo GET). Repo has no `include_private`.
- **Never** REST `/languages` (`GET /repos/{owner}/{repo}/languages`). A repository named `languages` (`GET /repos/{owner}/languages`) is allowed. **Never** 500 per-repo GraphQL calls.
- Languages: GraphQL `nodes(ids:)` batches of 100. Separate cheap `contributionsCollection` iff `canContributions`.
- GraphQL HTTP 200 + `errors[]` / remaining 0 = **fail-after-backoff** (not skip-widget). Secondary/abuse 403 = fail-after-backoff. Mid-pagination REST failure fails stats+languages together.

## Http JSON + chips presets

- `auth: optional`. Unset `http_token_env` sends no Authorization. Named env empty → `fail_widget`. Http module MUST NOT import octokit. Existing `createHttpClient` only — no second client.
- SSRF: ssrfcheck then ipaddr allow-only-unicast after IPv4-mapped unwrap. Mixed A/AAAA fails closed. `redirect: "manual"`, max 5 hops, 1 MiB body cap. Drop `Authorization` on cross-origin `Location`; do not restore after a foreign hop (Fetch sticky drop). Chips origin allowlist `shieldcn.dev` + `img.shields.io` **in addition to** existing SSRF.
- Preset expander under `src/http/presets.ts`; closed presets `shieldcn` | `shields`; types `npm` | `stars` | `forks` | `license` | `release` | `issues` | `prs` | `ci`. `normalizeBadgeJson`. Fixtures under `src/http/fixtures/chips/` (`chipFixture`).
- `classifyHttp` is separate from GitHub: 401/404 `fail_widget` (no retry); 403/429/5xx retry then `fail_widget`.
- Playground/docs: fixtures only. Zero live URLs.

## Elbow clients

- **Spotify** (`src/spotify/`): scheme `oauth-refresh`. Catalog auth `required`. Refresh, then `Authorization: Bearer` the access token. Client id/secret are named env, not yaml. Missing credentials with the pack on is `fail_job` before any request. Dump passthrough: `currently_playing`, `recently_played`, `top_tracks`.
- **LeetCode** (`src/leetcode/`): auth `none`. GraphQL POST `https://leetcode.com/graphql` with `{ query, variables }`. No `Authorization`. Cache key is `JSON.stringify({ query, variables })`, compared after `JSON.parse` (the query is multiline, so `includes` on the raw string misses it). HTTP 403 is `fail_widget`, not `classifyHttp` (`classifyHttp` maps 403 to `fail_after_backoff`). HTML scrape is the SSRF fallback after 403 only. 404 or HTTP 200 without `matchedUser` is `fail_widget`. Empty username with the pack on is `fail_widget` before any request.
- **Chess.com** (`src/chesscom/`) and **Lichess** (`src/lichess/`): auth `none`. Chess.com first. Lichess only when Chess.com throws `ChesscomClientError` with `status === 404`. Chess.com User-Agent `profile-bits-chesscom/0 (+https://github.com/wyattowalsh/profile-bits)`. No integration id `chess`.
- **Steam** (`src/steam/`): scheme `query-key`. GET `ISteamUser/GetPlayerSummaries/v2/`, `IPlayerService/GetRecentlyPlayedGames/v1/`, `ISteamUser/ResolveVanityURL/v1/` on `https://api.steampowered.com`. Apply `?key=` at send time. Never Authorization Bearer. A 17-digit steamid skips vanity. Missing token is `fail_job` before any request. Do not use `RequestCache` (`auth` there is only `"none" | "bearer"`). Cache with `queryKeyRestCacheKey`, which strips `?key=` and sets `auth: "query-key"`. Redact the secret from errors. The word `Bearer` stays out of `client.ts`.
