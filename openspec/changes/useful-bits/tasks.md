## 1. Contract

- [x] 1.1 Proposal, design, and deltas for `useful-bits`, `widget-contract`, and `author-plugin`.
- [x] 1.2 `pnpm exec openspec validate --strict --type change useful-bits`.

## 2. Bits

- [x] 2.1 Sources for the twenty-six names. Frozen 11 files untouched.
- [x] 2.2 Barrel `BIT_EXPORTS` plus formatter exports.
- [x] 2.3 `packages/bits/src/useful-bits.test.ts` covers formatters and `fromJsx`.
- [x] 2.4 No Dialog, Toast, Popover, Dropdown, Command, or Cover.

## 3. Docs samples and steam recent

- [x] 3.1 `PREVIEW_BIT_IDS` and bit samples include the useful set. Preview stays layout-only.
- [x] 3.2 Steam recent playtime uses `Duration`. `STEAM_BITS_USED` includes it.
- [x] 3.3 `packages/bits/AGENTS.md` and `DESIGN.md` name the set.

## 4. Locks

- [x] 4.1 No flattened Action inputs, no new first-party ids, no yaml `bits:`, no `v1` tag on `main`.
