## Why

The github owner-repo crawl already caches stars and forks for each
non-fork, non-archived repository. Consumers still need a yaml-opt-in
card that ranks that list. Widget id `top-repos` is already in live
`FIRST_PARTY_WIDGET_IDS` (elbow-catalog / W3-T-01). This change completes
that existing id on pack `github`: a dump reader, not a new plugin, not a
new integration, and not a new HTTP fetch.

## What Changes

- Stay on first-party pack `github` and integration `github`. Complete widget id `top-repos` (new card on an existing pack). Do **not** invent a fifth first-party pack. Do **not** append `FIRST_PARTY_*` (pack agents MUST NOT edit `packages/core/src/types.ts`).
- No flattened Action inputs (`plugin_*_*_*`). No `plugin_github_top_repos`.
- Opt-in like `demo` and `repo`. Pack defaults remain `stats` +
  `languages`. `top-repos` MUST NOT become a pack default.
- Frozen options already in types: `filename` default `top-repos`;
  `limit` 1–16 default 8; `animate` default false. Yaml MUST NOT accept
  `url`, `headers`, `bits`, `include_private`, `include_forks`,
  `include_archived`, or `repo` on `top-repos`. Extra keys fail parse.
- Rank the cached owner-crawl `repositories` by stars, then forks, then
  name. `limit` stays widget-side. The widget MUST NOT perform HTTP.
  Never REST `/languages`. Never unauthenticated GitHub.
- Empty crawl → “No repositories”. Zeros render. Extra dump keys MUST
  NOT fail parse.
- Example yaml:

```yaml
plugins:
  github:
    widgets:
      top-repos:
        filename: top-repos
        limit: 8
```

## Capabilities

### New Capabilities

- (none — `top-repos` is a widget on the existing `github` pack /
  `github` integration; catalog id already named)

### Modified Capabilities

- `widget-contract`: ADDED frozen `top-repos` options, owner-crawl
  ranking, empty “No repositories” card, dump-select / fetch none, and
  extra-key parse. Widget MUST declare integration `github` only.

## Impact

- Specs: ADDED delta under this change for `widget-contract`. Do **not**
  edit `openspec/specs/**` from this change. Finish
  `docs-full-catalog-playground` in place (do not mint a parallel docs
  id). Do **not** rewrite elbow-catalog ids.
- Code (this node): `packages/plugins/src/github/plugin.ts` registry +
  `bitsUsed`; `packages/plugins/src/github/widgets/top-repos/`; pack
  preview + barrel; tests. No `types.ts`. No Action flatten. No new
  HTTP in the widget.
- Out of scope: `contributions` heatmap (W3-GR-02); Action engine
  dispatch (not this node’s exclusive files); playground field groups
  (W1-D-01 / shipped eight); `author-integration add`; tagging `v1` at
  `main`; `npx skills add`; git commit; Playwright in the Action;
  `POST /api/preview` as an embed API.
