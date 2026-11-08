## 1. Shared docs-closeout contract

- [x] 1.1 Exclusive: `.agents/profile-bits/references/docs-closeout.md`. Matrix, canonical terms (generated vs handwritten), load-when (mutating success only), honesty sentence (`just generate-docs` = playground-fields snapshot only), playground wall (no `DESIGN.md` / `apps/docs/**`).
- [x] 1.2 Exclusive: `.agents/profile-bits/references/contract.md`. Pointer + index row for docs-closeout. Do not rewrite catalog locks.

## 2. Author skill bodies

- [x] 2.1 Exclusive: `.agents/profile-bits/skills/author/SKILL.md`. CSO description (Use when / NOT for, ≤200 chars), `$ARGUMENTS` table with empty-args row, numbered Critical Rules, docs-closeout is dest-skill job. Router stays read-only. No `runMain`.
- [x] 2.2 Exclusive: `.agents/profile-bits/skills/author-bit/SKILL.md`. Same patterns; link docs-closeout; do not copy Bit.template; do not grow a 12th bit.
- [x] 2.3 Exclusive: `.agents/profile-bits/skills/author-palette/SKILL.md`. Same patterns; do not add a palette id.
- [x] 2.4 Exclusive: `.agents/profile-bits/skills/author-integration/SKILL.md`. Same patterns; snapshot-only generate-docs wording.
- [x] 2.5 Exclusive: `.agents/profile-bits/skills/author-widget/SKILL.md`. Same patterns; **do not paste the matrix**; body stays under 400 lines; keep `apps/docs/**` refuse.
- [x] 2.6 Exclusive: `.agents/profile-bits/skills/author-plugin/SKILL.md`. Same patterns; snapshot-only generate-docs wording; `docsPath: "{{DOCS_PATH}}"` on new packs only.

## 3. Author references

- [x] 3.1 Exclusive: `.agents/profile-bits/skills/author/references/locks.md`. Nested-AGENTS / snapshot honesty; do not invent Action inputs.
- [x] 3.2 Exclusive: `.agents/profile-bits/skills/author-bit/references/destinations.md`. Row for `packages/bits/AGENTS.md`.
- [x] 3.3 Exclusive: `.agents/profile-bits/skills/author-palette/references/destinations.md`. Row for `packages/themes/AGENTS.md`.
- [x] 3.4 Exclusive: `.agents/profile-bits/skills/author-integration/references/locks.md`. Snapshot-only generate-docs; nested integrations AGENTS.md.
- [x] 3.5 Exclusive: `.agents/profile-bits/skills/author-widget/references/locks.md` then `references/generate.md` (same lane, sequential). Snapshot-only wording; keep `apps/docs/**` refuse; do not rewrite inventoried `docsPath`.
- [x] 3.6 Exclusive: `.agents/profile-bits/skills/author-plugin/references/locks.md`. Snapshot-only wording; pack AGENTS.md.

## 4. Author evals

- [x] 4.1 Exclusive: `.agents/profile-bits/skills/author/evals/evals.json`. Keep all ids. Add `docs-closeout-is-dest-job`.
- [x] 4.2 Exclusive: `.agents/profile-bits/skills/author-bit/evals/evals.json`. Keep all ids. Add `docs-closeout-nested-agents`.
- [x] 4.3 Exclusive: `.agents/profile-bits/skills/author-palette/evals/evals.json`. Keep all ids. Add `docs-closeout-nested-agents`.
- [x] 4.4 Exclusive: `.agents/profile-bits/skills/author-integration/evals/evals.json`. Keep all ids. Add `generate-docs-is-snapshot-only`.
- [x] 4.5 Exclusive: `.agents/profile-bits/skills/author-widget/evals/evals.json`. Keep all ids. Add `generate-docs-is-snapshot-only`.
- [x] 4.6 Exclusive: `.agents/profile-bits/skills/author-plugin/evals/evals.json`. Keep all ids. Add `generate-docs-is-snapshot-only`.

## 5. Consumer render

- [x] 5.1 Exclusive: `.agents/profile-bits-readme/skills/render/SKILL.md`. CSO description with Use when; `$ARGUMENTS` table; numbered Critical Rules; ref index; four-pack catalog honesty (not github-only, not a marketplace); refuse embed API and `runMain`.
- [x] 5.2 Exclusive: `.agents/profile-bits-readme/skills/render/evals/evals.json` (new). Cases: empty-args, yaml-and-workflow, relative-embeds, refuse-mcp, refuse-flatten, refuse-embed-api, refuse-packages-handoff, refuse-runMain, catalog-not-marketplace-four-packs, tokens-not-in-yaml.

## 6. Plugin maps

- [x] 6.1 Exclusive: `.agents/profile-bits/AGENTS.md`. Exclusive-file map + docs-closeout pointer. Optional marketplace.json is a Grok projection, not SSOT.
- [x] 6.2 Exclusive: `.agents/profile-bits-readme/AGENTS.md`. Evals pointer; still one skill `render`.
- [x] 6.3 Exclusive: root `AGENTS.md` (same inode as `Agents.md`). One nested-instructions bullet for docs-closeout. Do not edit `DESIGN.md`.
- [x] 6.4 Exclusive: `.agents/plugins/marketplace.json`. Local source paths for `profile-bits` and `profile-bits-readme` only.

## 7. Validate scripts and repo gate

- [x] 7.1 Exclusive: `.agents/profile-bits/scripts/validate.sh`. Run `generate-docs --check` when the recipe exists. Keep six-id allowlist and `generate-action --check`.
- [x] 7.2 Exclusive: `.agents/profile-bits-readme/scripts/validate.sh`. Same generate-docs hook. Keep `{render}` allowlist.
- [x] 7.3 Exclusive: `justfile`. Add `validate-agent-plugins`; invoke it from `check`. Do not edit `package.json`.
- [x] 7.4 Exclusive: `.github/workflows/ci.yml`. After existing generate-docs --check, run both validate scripts or `just validate-agent-plugins`.
- [x] 7.5 Exclusive: `packages/plugins/src/author-skill-templates.test.ts` only if it greps `ci.yml` and needs a needle. Do not delete the test.

## 8. Verify

- [x] 8.1 `bash .agents/profile-bits/scripts/validate.sh` (if generate-docs --check fails only on dirty playground fields, record playground-owned; do not regenerate the snapshot).
- [x] 8.2 `bash .agents/profile-bits-readme/scripts/validate.sh`.
- [x] 8.3 `rg` gates: no seventh skill dir, no `skills` key on either `plugin.json`, no `--all` install, honesty sentence present, no `DESIGN.md` / `apps/docs` / `docs-fields.ts` in this change’s diff.
- [x] 8.4 Targeted vitest for `author-skill-templates.test.ts` if 7.5 changed it. Do not commit. Do not tag `v1`.

Notes: `skills-ref@0.1.5` passed all seven skills. `pnpm generate-action --check` passed. `author-skill-templates.test.ts` 19/19. Both `validate.sh` runs fail only at `generate-docs --check` because in-flight `docs-full-catalog-playground` left `playground-fields.json` stale — playground-owned; snapshot not regenerated here.
