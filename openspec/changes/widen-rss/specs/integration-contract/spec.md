## REMOVED Requirements

### Requirement: rss payload is a frozen item list
**Reason**: The leftover `{ title, url, published_at }` triple is the feed widget reader, not the cache schema. Wave 2 dumps feed metadata plus item id, content/summary, authors, categories, updated, and enclosures.
**Migration**: Callers that consumed a frozen item-list payload MUST read `{ title, url, published_at }` from each dump `items[]` entry. Slice `items` to `limit` in the widget. Do not keep a parallel leftover cache. SSRF, 1 MiB, no GitHub-owned hosts, no URL userinfo, and parser-without-HTTP stay on the remaining rss fetch and parse requirements.

## ADDED Requirements

### Requirement: rss payload is a feed and item dump
The rss client MUST parse with rss-parser **or equivalent** and MUST NOT use any parser HTTP/fetch helper. The cached payload MUST be an `Object.freeze`d dump `{ feed, items }`, not a leftover array of `{ title, url, published_at }`. `feed` MUST be a frozen object with `title` (string; collapse whitespace, strip tags; empty string if missing), `link` (string; the feed’s HTML page URL; empty string if missing), `description` (string; empty string if missing), `updated` (ISO 8601 string or null), `authors` (frozen array of frozen `{ name, email, url }` with each field string or null), `categories` (frozen array of frozen `{ term, label, url }` with `term` string and `label`/`url` string or null), and `image` (`{ title, url }` with `url` string and `title` string or null, or null). `items` MUST be a frozen array of frozen items. Each item MUST include `id` (string; Atom id or RSS guid; empty string if missing), `title` (string; collapse whitespace, strip tags; empty string if missing), `url` (string; the item’s HTML page link from the parser; empty string if missing), `published_at` (ISO 8601 string or null; map `published ?? updated`), `updated` (ISO 8601 string or null; the item’s updated timestamp, not collapsed away), `content` (string or null; full content when the feed provides it), `summary` (string or null; description/summary when the feed provides it), `authors` (same shape as feed authors), `categories` (same shape as feed categories), and `enclosures` (frozen array of frozen `{ url, type, length }` with `url` string, `type` string or null, `length` number or null). The client MUST return the full frozen dump; the widget MUST slice `items` to `limit`. Extra dump fields MUST remain in cache even when the feed widget does not render them. Secrets MUST NEVER appear in the dump. This change MUST NOT add a first-party plugin, widget, or integration id (`latest` is Wave 3). Wave 2 MUST extend live `packages/integrations/src/rss/client.ts` and MUST NOT run `author-integration add` for `rss`. The Action MUST NOT expose flattened `plugin_<plugin>_<widget>_<option>` inputs such as `plugin_rss_feed_url`.

#### Scenario: dump exposes feed metadata and item fields the leftover triple dropped
- **WHEN** a valid Atom or RSS 2.0 feed is parsed
- **THEN** the payload MUST be a frozen `{ feed, items }` dump that includes feed `title`, `link`, `description`, `updated`, `authors`, `categories`, and `image`, and items MUST include `id`, `content` or `summary` when present in the XML, `authors`, `categories`, `updated`, and `enclosures` rather than only `{ title, url, published_at }`

#### Scenario: Atom content and id survive parse
- **WHEN** an Atom feed item has an `id` and a content body
- **THEN** the cached item MUST expose that `id` and `content` (or `summary` when only a summary is present) and MUST NOT drop them to fit `{ title, url, published_at }`

#### Scenario: leftover triple remains on each dump item
- **WHEN** a valid feed item is parsed
- **THEN** that item MUST still include `{ title, url, published_at }` with ISO `published_at` or null so the feed widget can read the leftover triple

#### Scenario: client returns the unsliced dump
- **WHEN** the rss client loads a feed with more items than a widget `limit`
- **THEN** the cached `items` array MUST contain the full parsed list and MUST NOT be sliced to `limit` inside the client

#### Scenario: parser HTTP helper is never used
- **WHEN** the rss client loads a feed
- **THEN** it MUST parse a fetched XML string and MUST NOT call a parser-owned URL/fetch API

#### Scenario: empty channel is a dump with no items
- **WHEN** a valid feed parses with zero items
- **THEN** the payload MUST be a frozen dump whose `items` array is empty and frozen, and MUST NOT crash

#### Scenario: no author-integration add for live rss dest
- **WHEN** wave 2 widens rss
- **THEN** the system MUST extend live `packages/integrations/src/rss/client.ts` and MUST NOT run `author-integration add` for `rss`

#### Scenario: no new first-party id in this change
- **WHEN** this change lands
- **THEN** `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, and `FIRST_PARTY_INTEGRATION_IDS` MUST NOT gain a new id from this change
