# profile-bits Agent Plugin

Authoring skills for profile-bits integrations, widgets, and plugin packs.
Plugin-local only — product runtime stays in `packages/**`.

Canonical plugin root (SSOT) is `.agents/profile-bits/` (`plugin.json`,
`skills/`, `scripts/`, `references/`, `AGENTS.md`). There is no
`agent-plugin/` directory, alias, or copy.

Install is a documented human command, not an agent step in this repo.

```bash
npx skills add ./.agents/profile-bits
```

MUST NOT pass `--all`. MUST NOT pass `-a claude-code` or create `.claude/` /
`.claude/skills`. This repo already commits relative symlinks (git `120000`):
`.agents/skills/author{,-integration,-widget,-plugin}` →
`../profile-bits/skills/<id>`. Agents MUST NOT run `skills add` here (it can
replace `120000` with copies).

`.agents/skills/<id>` entries for `author`, `author-integration`,
`author-widget`, and `author-plugin` are **relative symlink** projections of
`skills/<id>` — not a copied SSOT. Do not copy skills. Do not hand-edit a
second tree. Leave generated `.agents/skills/openspec-*` and
`.openspec-target` untouched. Do not write `.cursor/skills/` (OpenSpec
regenerates those).

Consumer README / local CLI (`just render` / `pnpm render`) lives in the
sibling plugin `.agents/profile-bits-readme` (skill `render`; harness
projection `.agents/skills/render`). This authoring plugin stays four skills
and MUST NOT implement the local CLI engine.

## Skills

| Skill | Role |
| --- | --- |
| `author` | Router. Classify, read contracts, hand off. Ideate/next/brainstorm ranks the next add. |
| `author-integration` | Data source under `packages/integrations/src/<id>/`. |
| `author-widget` | New card on an existing pack (union bits into pack-level `bitsUsed`). |
| `author-plugin` | Pack registry (`<id>Plugin`, derived integration union, pack-level `bitsUsed`). |

Four skills only. No `author-bit`. Ideate is a **mode of `author`**, not a
fifth skill. Empty args on `author` show a gallery (ideate is item 0) and
**stop** — they do not inventory.

A **plugin** is a pack of widgets plus declared integrations (1..N widgets,
0..N integrations). Catalog SSOT is live `packages/core/src/types.ts`
(`FIRST_PARTY_*`, `WIDGET_INTEGRATIONS`, `INTEGRATION_AUTH`,
`ActionInputsSchema`). Completing an id already in those lists is allowed.
Do not create a second pack for an id already in `FIRST_PARTY_PLUGIN_IDS`.
Do not invent names or silently append catalog. A new pack is OpenSpec-first,
then types, then skills. Today’s `github` / `wakatime` / `rss` / `http` is a
snapshot — not a frozen table to bump. WakaTime-class **architecture**
(client, auth, scopes, inputs, mocked HTTP) still applies to **new** data
sources. Thin Action names: read `ActionInputsSchema` (includes optional
`wakatime_token`, `http_token_env`); never invent `plugin_*_*_*`.

Integration dest is `packages/integrations/src/<id>/`. github **is** in
`packages/integrations/src/index.ts`. Pack `docsPath` is `"{{DOCS_PATH}}"`
(do not hardcode `/generate/<id>/`). `bitsUsed` is pack-level on
`<id>Plugin`.

## Contracts

Read [references/contract.md](references/contract.md) before authoring.
