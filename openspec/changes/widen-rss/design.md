## Context

See `proposal.md` Why. Today `parseRssXml` returns `Object.freeze`d
`{ title, url, published_at }[]`. `@rowanmanning/feed-parser@2.1.4`
already exposes feed metadata and item `id` / `content` / authors /
categories / media; the mapper drops them. Widget `feed` already slices
that leftover list and renders titles. SSRF, 1 MiB, GitHub-owned host
block, and no URL userinfo live on the fetch path and stay.

Constraints: Node 24, pnpm catalog, OpenSpec 1.9.0, Vitest 4, Biome 2.5.
Never unauthenticated GitHub. Never REST `/languages`. No `plugin_*_*_*`.
No Playwright in the Action. Do not run `npx skills add`. Do not tag `v1`
on `main`. Wave 2 MUST NOT `author-integration add` github / wakatime /
rss / http (`client.ts` exists). Same-file exclusive for W2-RSS-01:
`openspec/changes/widen-rss/**` plus `scripts/widen-rss.test.ts`. Do not
edit `packages/integrations/src/rss/**`, `packages/plugins/src/rss/**`,
`openspec/specs/**`, or `openspec/changes/docs-full-catalog-playground/**`.

## Goals / Non-Goals

**Goals:**

- Contract: rss cache is a frozen `{ feed, items }` dump.
- Contract: leftover `{ title, url, published_at }` is the feed widget
  reader. Extra dump fields stay in cache.
- Keep parser-without-HTTP, SSRF, 1 MiB, no GitHub hosts, auth `none`.

**Non-Goals:**

- Implementing parse/client/widget in this node (W2-RSS-02…06).
- New widget id `latest` / Time bit (W3-RS-01).
- Rewriting `docs-full-catalog-playground`.
- Flattened Action inputs, extra pack bools, `author-integration add`. Do not flatten.
- Changing SSRF, hop limits, or the HTTP skip/fail matrix.

## Decisions

### 1. Dump shape is `{ feed, items }`, not a fat leftover array

- **Choice:** Frozen payload `{ feed, items }`. `feed` holds title, link,
  description, updated, authors, categories, image. `items` holds the
  per-entry dump including the leftover triple plus id, updated, content,
  summary, authors, categories, enclosures.
- **Why:** Feed metadata has nowhere to live on an item-only array.
  Facts require feed metadata **plus** item dump fields.
- **Alternative:** Array of fat items only — rejected; drops channel
  title/link/image. Alternative: keep today’s array and stash feed
  meta on a symbol — rejected; widgets would still treat leftover as
  the schema.

### 2. Leftover triple stays on each item for the feed reader

- **Choice:** Each dump item still has `{ title, url, published_at }`.
  `published_at` remains `published ?? updated` (ISO or null). Item
  `updated` is **also** stored so it is not collapsed away.
- **Why:** `feed` may still render title/url/date. Wave 3 `latest` /
  Time can read `updated` without a second fetch. Sanitized `title`
  (strip tags, collapse whitespace, empty if missing) stays.
- **Alternative:** Stop emitting `published_at` and make the widget
  re-derive it — rejected; extra work for W2-RSS-05 with no dump gain.

### 3. Enclosures are an array from parser media

- **Choice:** `enclosures: { url, type, length }[]` frozen, mapped from
  parser `media` (`url`, `type`/`mimeType`, `length`). Missing media is
  `[]`. Feed `image` stays `{ title, url } | null`.
- **Why:** Facts say enclosures (plural). Atom/RSS can attach more than
  one. A single `enclosure` field would drop extras the dump must keep.
- **Alternative:** First media only — rejected; not a dump.

### 4. Include/limit stay widget-side; parser still does not fetch

- **Choice:** Client returns the full dump. Widget slices `items` to
  `limit`. Parse an already-fetched XML string. Catalog pin stays
  `@rowanmanning/feed-parser` (spec text remains “rss-parser or
  equivalent”).
- **Why:** Same leftover-vs-dump split as WakaTime include/limit.
  Parser HTTP helpers are already forbidden and would bypass SSRF.
- **Alternative:** `maxItems` in the parser — rejected; would drop dump
  rows the widget did not ask to hide.

### 5. Fetch locks stay on existing requirements

- **Choice:** Do not MODIFY rss SSRF, GitHub-host, auth `none`, request
  cache, or HTTP skip/fail requirements. This change only replaces the
  payload schema.
- **Why:** Plan: “SSRF/1MiB/no GitHub hosts stay.” Dual-writing those
  blocks would fight `docs-full-catalog-playground` (playground rss
  routes) and later SSRF tests (W2-RSS-06).
- **Alternative:** Restate SSRF in the dump requirement — rejected;
  archive merge noise.

### 6. W2-RSS-01 is OpenSpec + contract tests only

- **Choice:** This node writes `openspec/changes/widen-rss/**` and
  `scripts/widen-rss.test.ts`. Payload types, parser mapping, fixtures,
  widget reader, and dump/SSRF tests are later tasks on this same
  change id (one workstream = one OpenSpec change).
- **Why:** Graph rank R0 is spec. Same-file exclusive with W2-RSS-02
  on `parse.ts`. New ids stay OpenSpec-first; do not mint a second
  change for implementation.
- **Alternative:** Edit `parse.ts` now — rejected; collides with
  W2-RSS-02. Alternative: new change id per rank — rejected; facts
  say one change per workstream.

## Risks / Trade-offs

- [Call sites type `readonly RssFeedItem[]`] → W2-RSS-02/05 update
  client, playground fixtures, and `sliceFeedItems` to `dump.items`.
  Main specs stay leftover until archive, so runtime must not ship
  until later ranks on this change complete.
- [Current Atom fixture has id but no content body] → W2-RSS-04 adds
  content/id coverage; the spec requires those fields **when present**.
- [Email on public feed authors] → Allowed (public XML). Not a WakaTime
  account email. Tokens still never enter the dump.

## Migration Plan

Land unarchived. W2-RSS-02 types the dump; W2-RSS-03 maps parser
fields; W2-RSS-04 fixtures; W2-RSS-05 feed reader; W2-RSS-06 dump +
SSRF tests. Archive after W2-RSS-06. Rollback is deleting this
in-flight change; `openspec/specs/**` stay leftover until archive.
Do not archive from this node.

## Open Questions

None. Widget `latest` is Wave 3 OpenSpec, not this change.
