## Context

See `proposal.md` Why. Integration `http` already GETs JSON through
`createHttpClient` (`fetchJson` → `unknown`). Json widgets already run
JMESPath in `packages/plugins/src/http/widgets/json`. Chips already GET
with `auth: "none"` and call `normalizeBadgeJson` in the widget load helper.
The live contract still says chips GETs then normalize to
`{ label, message, color? }` and ignore `link` at fetch, and the HTTP matrix
still lists `JSON / jmespath throw` as a fetch outcome.

Wave 2 pipeline: W2-HTTP-01 this folder (OpenSpec). W2-HTTP-02 payload
types. W2-HTTP-03 no extra vendor client. W2-HTTP-04 fixtures keep
`link`/`value`. W2-HTTP-05 widget readers. W2-HTTP-06 dump tests.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Vitest 4, Biome 2.5.
Thin `action.yml`. No `plugin_<plugin>_<widget>_<option>`. No `plugin_http` bool. Never
unauthenticated GitHub. Never REST `/languages`. No Playwright in the
Action. Do not run `npx skills add`. Do not tag `v1` on `main`. Do not
treat `POST /api/preview` as a public embed API. Do not rewrite
`docs-full-catalog-playground`. Wave 2 MUST NOT `author-integration add`
github / wakatime / rss / http (`client.ts` exists). Same-file exclusive
for this node: `openspec/changes/widen-http/**` and
`scripts/widen-http.test.ts`. Do not edit live
`packages/integrations/src/http/**`, `packages/integrations/src/cache.ts`,
`packages/plugins/src/http/**`, or `openspec/specs/**` in W2-HTTP-01.

## Goals / Non-Goals

**Goals:**

- Contract: json cache is the full JSON value; chips cache is raw badge
  JSON `{ label, message, color, name, value, link }`; chips GET `auth: none`.
- Contract: `jmespath` and `normalizeBadgeJson` are widget readers.
- Tests for this node lock those sentences on the change files and lock
  shieldcn fixtures still carrying `link`/`value`.

**Non-Goals:**

- Payload types, extra endpoints, fixture rewrites, widget-folder moves,
  or dump vitest in this node (W2-HTTP-02…06).
- New first-party pack, widget, or integration ids.
- New vendor clients (`shieldcn`, `shields`) or octokit in http.
- Flattened `plugin_<plugin>_<widget>_<option>` Action inputs, tagging `v1` at `main`, `npx skills add`.
- Auth schemes (`oauth-refresh`, `query-key`) or `ActionInputsSchema`.

## Decisions

### 1. ADDED dump requirements plus MODIFIED contradictory sentences

- **Choice:** ADDED json-full-JSON and chips-raw-badge-JSON on
  `integration-contract`, plus widget-reader ADDED on `widget-contract`.
  MODIFIED the chips reuse / expander / HTTP matrix / frozen json / frozen
  chips / chip chrome requirements that currently normalize or ignore
  `link` at fetch.
- **Why:** Archive replaces MODIFIED blocks wholesale. Leaving “then
  normalized at fetch” would contradict the dump. ADDED-only would leave
  both MUST statements in the SSOT.
- **Alternative:** New capability `http-dump` — rejected; dumps belong on
  `integration-contract` / `widget-contract`. Alternative: skip MODIFIED —
  rejected; archive would keep fetch-time normalize.

### 2. Json stays a JSON value, not a DTO

- **Choice:** Cached json is the parsed body (`unknown` / JSON value).
  Optional schema MUST NOT drop keys. Truncation 16/48/3 is render-only.
- **Why:** Facts: json keeps the full JSON value. Plan: type it without
  stripping. JMESPath already lives in the widget.
- **Alternative:** Project to `{ hostname, rows }` at fetch — rejected;
  that is a widget slice, not a dump.

### 3. Chips cache the six badge fields; normalize stays a widget reader

- **Choice:** Cache retains `label`, `message`, `color`, `name`, `value`,
  `link` when present. `normalizeBadgeJson` (`message = message ?? value`)
  stays in the widget. Render still uses `label` / `message` / `color` and
  still ignores `link`/`href` as chrome.
- **Why:** Shieldcn bodies are `{ label, value, link }`; shields bodies
  include `name` and `value`. Dropping those at fetch makes later widgets
  invent fields. Ignore-at-render is not drop-from-cache.
- **Alternative:** Keep normalize inside `fetchJson` — rejected; that
  makes the cache widget-shaped. Alternative: treat `link` as a Chip URL
  — rejected; existing chrome has no per-chip links.

### 4. Chips GET auth none; no extra vendor client

- **Choice:** Per-request `auth: "none"` stays. Origins stay
  `shieldcn.dev` + `img.shields.io`. No second HTTP client. No octokit.
  W2-HTTP-03 adds no extra vendor endpoints.
- **Why:** Badge CDNs are public. Sending `http_token_env` Bearer to
  shieldcn/shields is wrong. Plan: no new vendor integration ids.
- **Alternative:** Reuse json optional Bearer on chips — rejected; already
  forbidden. Alternative: `author-integration add http` — rejected; dest
  `client.ts` exists.

### 5. JMESPath throw leaves the HTTP matrix

- **Choice:** Fetch matrix keeps JSON parse throw. JMESPath throw is
  widget-side `fail_widget` and MUST NOT drop the dump.
- **Why:** Include/limit/jmespath filters run in the widget, not by
  dropping fields at fetch.
- **Alternative:** Client evaluates `jmespath` before cache — rejected.

### 6. This node is OpenSpec plus change tests only

- **Choice:** W2-HTTP-01 writes `openspec/changes/widen-http/**` and
  `scripts/widen-http.test.ts`. Later nodes extend live `client.ts`.
- **Why:** Same-file exclusive. Graph rank H0 is spec. Query-key mixed
  helpers because it named a new scheme; http already has `client.ts`.
- **Alternative:** Type `RawBadgeJson` in this node — rejected; that is
  W2-HTTP-02 on `packages/integrations/src/http/**`.

## Risks / Trade-offs

- [Load helper still normalizes today] → Spec allows widget-side
  `normalizeBadgeJson`. W2-HTTP-05 must not move it into the client, and
  MUST keep the raw dump as the cache value.
- [Fixtures already have `link`/`value`] → W2-HTTP-04 must keep them.
  This node’s tests lock the fixture keys so a later rewrite cannot drop
  them silently.
- [docs-full-catalog-playground] → Finish that change in place. This id
  is new dump work, not a second docs playground change.

## Migration Plan

Land unarchived. W2-HTTP-02…06 apply on live http client / widgets.
Rollback is revert of `openspec/changes/widen-http/**` and
`scripts/widen-http.test.ts`. Archive after dump tests pass. Do not
archive from this node. Do not edit `openspec/specs/**` until archive.

## Open Questions

None. Extra unknown vendor keys beyond the six badge fields MAY remain
on the parsed object (json-style dump); the contract MUST retain those
six when present and MUST NOT require a closed strip to only those six.
