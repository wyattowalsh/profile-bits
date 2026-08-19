# @profile-bits/integrations

Reusable data sources. First-party: **`static`** (auth `none`, JSON fixtures), **`github`** (token-class + capability; never unauth), **`wakatime`** (auth `required`; RFC Basic; Cloud + Wakapi compat), **`rss`** (auth `none`; https GET + cache inside the rss client), and **`http`** (auth `optional`; injectable `createHttpClient({ fetch, lookup, token })`; SSRF via ssrfcheck + ipaddr unicast).

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
- REST: `GET /users/{login}` + paginated `/repos?type=owner&per_page=100`. **Filter** forks/archived **then cap 500** remaining. Stars and language bytes share that ordered id list.
- **Never** REST `/languages`. **Never** 500 per-repo GraphQL calls.
- Languages: GraphQL `nodes(ids:)` batches of 100. Separate cheap `contributionsCollection` iff `canContributions`.
- GraphQL HTTP 200 + `errors[]` / remaining 0 = **fail-after-backoff** (not skip-widget). Secondary/abuse 403 = fail-after-backoff. Mid-pagination REST failure fails stats+languages together.

## Http JSON + chips presets

- `auth: optional`. Unset `http_token_env` sends no Authorization. Named env empty → `fail_widget`. Http module MUST NOT import octokit. Existing `createHttpClient` only — no second client.
- SSRF: ssrfcheck then ipaddr allow-only-unicast after IPv4-mapped unwrap. Mixed A/AAAA fails closed. `redirect: "manual"`, max 5 hops, 1 MiB body cap. Chips origin allowlist `shieldcn.dev` + `img.shields.io` **in addition to** existing SSRF.
- Preset expander under `src/http/presets.ts`; closed presets `shieldcn` | `shields`; types `npm` | `stars` | `forks` | `license` | `release` | `issues` | `prs` | `ci`. `normalizeBadgeJson`. Fixtures under `src/http/fixtures/chips/` (`chipFixture`).
- `classifyHttp` is separate from GitHub: 401/404 `fail_widget` (no retry); 403/429/5xx retry then `fail_widget`.
- Playground/docs: fixtures only. Zero live URLs.
