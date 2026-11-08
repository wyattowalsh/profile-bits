## Why

Authoring and consumer skills scaffold code and yaml, then stop. Nested `AGENTS.md`, skill honesty copy, and plugin validation never close the loop: `just generate-docs` only snapshots playground form fields, both `scripts/validate.sh` gates are unwired from CI, and `render` has no evals while its catalog copy still reads github-only. Agents therefore cannot keep associated docs honest after a change.

## What Changes

- After a mutating authoring success, skills MUST load a shared docs-closeout reference, update the handwritten nested `AGENTS.md` they own when those facts changed, and MUST NOT claim `just generate-docs` rewrites `AGENTS.md`, `README.md`, or `DESIGN.md`.
- Empty-args, help, refuse, route-away, and complete-existing-stop MUST skip docs-closeout.
- Authoring MUST NOT copy templates into `apps/docs/**` or `/generate/widgets`.
- Plugin `validate.sh` MUST run `generate-docs --check` when that recipe exists (in addition to `generate-action --check`).
- Repo CI / `just validate-agent-plugins` MUST run both plugin validate scripts.
- Consumer `render` MUST ship `evals/evals.json` and MUST describe `/generate/catalog` as a first-party gallery of live packs, not github-only and not a marketplace.
- Harness-prose leftover that names four author symlink ids MUST name all six.
- No **BREAKING** Action inputs. No seventh skill. No `skills` array on `plugin.json`. No MCP. No fifth first-party pack.

## Capabilities

### New Capabilities

- (none — skill-cluster behavior on existing author-plugin and cli capabilities)

### Modified Capabilities

- `author-plugin`: docs closeout after mutating success; validate.sh also checks docs snapshot; validation is a repo CI gate; six harness symlink ids in prose.
- `cli`: consumer `render` evals; catalog honesty is live first-party packs, not github-only, not a marketplace.

## Impact

- Specs: MODIFIED deltas under this change only. Do not edit `openspec/specs/**` until archive. Do not edit `openspec/changes/docs-full-catalog-playground/**`, `openspec/changes/marketplace-release/**`, or `openspec/changes/add-github-repo-widget/**`.
- Plugin SSOT: `.agents/profile-bits/**` and `.agents/profile-bits-readme/**` (not generated `.agents/skills/openspec-*`).
- Repo gate: `justfile`, `.github/workflows/ci.yml`. Do not require a `package.json` script while that file is dirty for unrelated `packageManager`.
- Out of scope: `DESIGN.md` playground rewrite, `apps/docs/**`, `packages/core/src/codegen/docs-fields.ts`, live LLM evals, tagging `v1`.
