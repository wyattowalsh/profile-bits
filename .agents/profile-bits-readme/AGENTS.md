# profile-bits-readme Agent Plugin

Consumer README/yaml helper. Write `.github/profile-bits.yml` and thin
workflow YAML, shell out to `just render` / `pnpm render`, paste relative
README embeds. Does not author `packages/**` and does not reimplement the
engine.

Canonical plugin root (SSOT) is `.agents/profile-bits-readme/` (`plugin.json`,
`skills/`, `scripts/`, `references/`, `AGENTS.md`). There is no
`agent-plugin/` directory, alias, or copy.

Install is a documented human command, not an agent step in this repo.

```bash
npx skills add ./.agents/profile-bits-readme
```

MUST NOT pass `--all`. MUST NOT pass `-a claude-code` or create `.claude/` /
`.claude/skills`. This repo already commits a relative symlink (git `120000`):
`.agents/skills/render` → `../profile-bits-readme/skills/render`. Agents MUST
NOT run `skills add` here (it can replace `120000` with copies).

`.agents/skills/render` is a **relative symlink** projection of
`skills/render` — not a copied SSOT. Do not copy skills. Do not hand-edit a
second tree. Leave generated `.agents/skills/openspec-*` and
`.openspec-target` untouched. Do not write `.cursor/skills/` (OpenSpec
regenerates those).

Pack authoring lives in the sibling plugin `.agents/profile-bits` (four
skills: `author`, `author-integration`, `author-widget`, `author-plugin`).
This consumer plugin ships **one** skill and MUST NOT implement `runMain`.

## Skills

| Skill | Role |
| --- | --- |
| `render` | Write yaml + thin workflow, run `just render` / `pnpm render`, paste relative `![](./profile-bits/…)` embeds. |

No MCP. No `mcp.json`. No `skills` array on `plugin.json`. Yaml SSOT is
`.github/profile-bits.yml`. Thin Action inputs only — never flattened
`plugin_*_*_*`.
