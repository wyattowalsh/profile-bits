# Docs closeout

Load this file only after a **mutating success**. Skip on empty arguments, help,
refuse, route-away, and complete-existing stop.

`just generate-docs` refreshes `playground-fields.json` only. It does not
rewrite `AGENTS.md`, `README.md`, or `DESIGN.md`.

Do not load all references at once.

## Canonical terms

Use these exactly:

- **Generated:** `action.yml`, `playground-fields.json`. Never hand-edit. Instruct
  `just generate-action` / `just generate-docs` when recipes exist.
- **Handwritten:** nested package `AGENTS.md`, this plugin’s skill honesty copy,
  consumer relative README embeds.
- **docsPath:** `"{{DOCS_PATH}}"` on **new** packs only. Do not rewrite a live
  inventoried `docsPath`.
- **Playground wall:** `docs-full-catalog-playground` is archived at
  `openspec/changes/archive/2026-11-08-docs-full-catalog-playground`. Do not
  invent a new docs change id. `just generate-docs` still does not rewrite
  `DESIGN.md`.

## Matrix

| Skill | Handwritten | Generated (instruct only) | Never |
| --- | --- | --- | --- |
| `author` | none (handoff) | none | files, `runMain` |
| `author-bit` | `packages/bits/AGENTS.md` if frozen-11 / Chip facts changed | none | `DESIGN.md`, `apps/docs/**`, 12th bit without OpenSpec |
| `author-palette` | `packages/themes/AGENTS.md` if catalog rules changed | none | new id without OpenSpec; Theme bit |
| `author-integration` | `packages/integrations/AGENTS.md` | generate-action / generate-docs if thin inputs or playground fields changed | widgets, packs, silent `FIRST_PARTY_*` |
| `author-widget` | `packages/plugins/AGENTS.md` widget list; pack-level `bitsUsed` | same instruct; do not rewrite inventoried `docsPath` | copy into `apps/docs/**` or `/generate/widgets` |
| `author-plugin` | `packages/plugins/AGENTS.md` pack list | instruct; `docsPath: "{{DOCS_PATH}}"` on new packs | second pack for an existing id |
| `render` | relative README embeds; this skill’s catalog-honesty paragraph | none | `packages/**`, gist-as-CDN, POST `/api/preview` as an embed API |

## After mutating success

1. Update the handwritten file in the matrix when its facts changed.
2. Tell the author to run `just generate-action` and `just generate-docs` when
   those recipes exist. State that generate-docs is the playground-fields
   snapshot only.
3. `just generate-docs` remains the playground-fields snapshot only. The
   exclusive `docs-full-catalog-playground` lock is archived.
