## 1. Bootstrap

- [x] 1.1 Lift `ALLOWED_SKILL_IDS` to exactly six ids.
- [x] 1.2 Add valid `author-bit` and `author-palette` stubs.
- [x] 1.3 Add relative `120000` harness links for both skills.

## 2. Skill cores

- [x] 2.1 Replace the bit stub with no-clobber frozen-11 and
  OpenSpec-before-12th guidance, references, and one generic template.
- [x] 2.2 Replace the palette stub with live-family and
  OpenSpec-before-new-id guidance, references, and one family template.
- [x] 2.3 Update the read-only umbrella router and ideate reference.
- [x] 2.4 Add surgical bit/palette dispatch to integration, widget, and pack
  skills.

## 3. Evals and docs

- [x] 3.1 Add 10 bit, 8 palette, and 9 umbrella routing evals using the
  repository `evals/evals.json` format.
- [x] 3.2 Update plugin-local AGENTS, DESIGN, and contract reference.
- [x] 3.3 Update root nested instructions and DESIGN authoring paragraph.

## 4. Contract

- [x] 4.1 Add this proposal, design, tasks, and author-plugin delta as one
  OpenSpec change.
- [x] 4.2 Sync only the live `author-plugin` spec; preserve historical
  `openspec/changes/author-plugin/tasks.md` section 8.
- [x] 4.3 Do not rewrite three-layer contracts and do not archive.

## 5. Gates

- [x] 5.1 Run `skills-ref@0.1.5` against all six skills.
- [x] 5.2 Run plugin validation and preserve `generate-action --check`.
- [x] 5.3 Run strict live-spec and change validation.
- [x] 5.4 Verify six author harness entries are `120000` links.
