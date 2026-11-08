## Context

See `proposal.md` Why. Authoring lives at `.agents/profile-bits/` (exactly six skills). Consumer README/CLI lives at `.agents/profile-bits-readme/` (`render`). `plugin.json` is Agent Plugins 1.0.0 with no `skills` array. `just generate-docs` writes only `packages/core/src/codegen/__snapshots__/playground-fields.json`. Plugin `scripts/validate.sh` exist but are not a `just` / CI gate. `render` has no evals.

Sibling in-flight change `docs-full-catalog-playground` owns `DESIGN.md`, `apps/docs/**`, and `packages/core/src/codegen/docs-fields.ts`. This change MUST NOT write those paths. Dirty `package.json` `packageManager` bump is unrelated — do not touch `package.json`.

Exclusive planning glob: `openspec/changes/author-skills-docs-closeout/**` only. Do **not** edit `openspec/specs/**` until archive.

## Goals / Non-Goals

**Goals:**

- Shared docs-closeout reference loaded only after mutating success.
- Nested package `AGENTS.md` updated when those facts changed; generated snapshots stay instruct + `--check`, never hand-edited.
- Both plugin validate scripts run from `just validate-agent-plugins` and CI.
- Consumer `render` evals + four-pack catalog honesty in that skill.
- Six-id harness prose.

**Non-Goals:**

- A seventh skill (`docs-steward`, `author-theme`, `author-badge`).
- Vendoring skill-creator scripts or adding hooks.
- Running `just generate-docs` from apply agents (playground owns the dirty snapshot).
- Catalog MDX codegen, playground routes, Marketplace listing, `v1` tag.

## Decisions

### 1. Shared reference, not a seventh skill

- **Choice:** `.agents/profile-bits/references/docs-closeout.md` is the matrix SSOT. Mutating skills link it from the reference index (`Load when: mutating success`). `author` only names it as the destination skill’s job.
- **Why:** Progressive disclosure. `author-widget` body is already 373 lines (cap 500). A seventh skill would fight the six-skill lock.
- **Alternative:** New `docs-steward` skill — rejected. Alternative: paste the matrix into every SKILL.md — rejected (token mass).

### 2. Instruct codegen; enforce `--check`; do not run generate-docs in this change

- **Choice:** Skills keep “tell the author to run `just generate-action` / `just generate-docs`” and MUST state that generate-docs refreshes playground-fields.json only. `validate.sh` adds `generate-docs --check` when the recipe exists. Apply waves MUST NOT run `generate-docs` while playground fields are dirty.
- **Why:** Skill-creator: do not inline a repo docs generator as a skill. Fail-closed belongs in the existing validate script + CI.
- **Alternative:** Agents run generate-docs after every widget — rejected for this dirty tree and for the snapshot-only semantics.

### 3. Handwritten closeout is nested AGENTS.md only

- **Choice:** Bit → `packages/bits/AGENTS.md`. Palette → `packages/themes/AGENTS.md`. Integration → `packages/integrations/AGENTS.md`. Widget/pack → `packages/plugins/AGENTS.md`. `render` may refresh **its own** catalog-honesty paragraph. Root `AGENTS.md` gets one pointer bullet. Do not edit root `DESIGN.md` or `apps/docs/**`.
- **Why:** Those files are the package locks skills already tell agents to read. Catalog pages are docs-app owned.
- **Alternative:** Skills copy widget.mdx into `apps/docs` — already forbidden; keep the forbid.

### 4. Repo gate without package.json

- **Choice:** `just validate-agent-plugins` runs both `scripts/validate.sh`. `just check` also runs it. CI lint job (after existing generate-docs --check) runs the same. No new `package.json` script.
- **Why:** `package.json` is dirty for `packageManager`. justfile is the human/CI surface.
- **Alternative:** `pnpm` script in root package.json — deferred until that file is clean.

### 5. Consumer evals live on the skill, not a second validator package

- **Choice:** `.agents/profile-bits-readme/skills/render/evals/evals.json` with structural cases (trigger / output / safety). Keep `skills-ref@0.1.5`. No `packages/core` agent-plugin.ts revival.
- **Why:** Author evals already live next to SKILL.md. Core historically had no remaining `validate-agent-plugin.mjs`.
- **Alternative:** Core JS validator — rejected (duplicate of validate.sh).

### 6. Optional Grok marketplace projection

- **Choice:** Commit `.agents/plugins/marketplace.json` pointing at both local plugin roots. Author `AGENTS.md` states it is a harness projection, not skill SSOT. Agents still MUST NOT run `skills add`.
- **Why:** Target harness includes Grok Build CLI; `grok plugin list` is a flaky discovery path.
- **Alternative:** gitignore the file — weaker Grok discovery.

### 7. Skill-creator quality is practice, not spec

- **Choice:** CSO descriptions, `$ARGUMENTS` dispatch tables, numbered Critical Rules stay in SKILL.md. Specs stay behavioral (closeout, CI gate, evals exist, catalog honesty).
- **Why:** OpenSpec is product/agent-observable behavior, not audit.py scoring.
- **Alternative:** Spec every frontmatter character — rejected (noise, fights description iteration).

## Risks / Trade-offs

- [Dirty playground snapshot] → validate.sh `generate-docs --check` may fail for the same reason CI’s existing generate-docs step would. Do not regenerate the snapshot here.
- [Body growth on author-widget] → matrix stays in the shared ref; bodies only add index rows and numbered rules.
- [Grok marketplace.json vs install lock] → document as projection; never instruct agents to `skills add`.

## Migration Plan

Land on `main` as an unarchived change. No runtime migration. Rollback is revert of `.agents/**` (except generated openspec skills), `justfile`, and `ci.yml`. Archive after apply + `just validate-agent-plugins` on a tree whose playground snapshot is green.

## Open Questions

- (none — playground wall, no seventh skill, and instruct-vs-run codegen are locked)
