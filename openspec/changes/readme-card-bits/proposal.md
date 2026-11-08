## Why

Wave 3 README cards need shared Takumi-safe primitives Frozen 11 does not provide (cover art, day grids, chess boards, timestamps). `author-bit` refuses a 12th name until OpenSpec approves it. This change names Image, Heatmap, Board, Icon, Grid, List, and Time, leaves Frozen 11 complete-existing, and refuses overlay widgets in `packages/bits`.

## What Changes

- Add capability `bits-contract`: Frozen 11 stay complete-existing; approve seven README-card primitives; refuse Dialog, Toast, Popover, Dropdown, Command.
- Modify `author-plugin`: `author-bit` MAY copy generic `Bit.template` for those seven PascalCase names after this delta; MUST NOT copy onto Frozen 11; MUST stop on refused overlay names and the alias `Cover`.
- Ranking name Cover maps to bit `Image` (rectangular cover art), not a `Cover` export and not `Avatar`.
- This node is OpenSpec + exclusive tests only. Bit sources, `BIT_EXPORTS`, `/generate/bits` samples, and DESIGN.md land in later W3-B nodes.
- No flattened `plugin_<plugin>_<widget>_<option>` inputs. No first-party pack, widget, or integration ids. MUST NOT `author-integration add` github / wakatime / rss / http.

## Capabilities

### New Capabilities

- `bits-contract`: Shared Takumi-safe primitive names in `packages/bits`. Frozen 11 remain complete-existing. Approved 12th+ names are Image, Heatmap, Board, Icon, Grid, List, Time. Overlay primitives Dialog, Toast, Popover, Dropdown, Command stay refused.

### Modified Capabilities

- `author-plugin`: ADDED approved 12th+ names for `Bit.template`; Frozen 11 stay complete-existing; overlay names and `Cover` stop; pack `bitsUsed` membership MAY include the seven after they land (starter six unchanged).

## Impact

- Specs: new `bits-contract` plus ADDED `author-plugin` deltas under this change. Do not edit `openspec/specs/**` until archive. Finish `docs-full-catalog-playground` in place (do not rewrite that change id).
- Later apply (not this node): W3-B-02…08 one `packages/bits/src/<Name>.tsx` each from `Bit.template`; W3-B-09 barrel `BIT_EXPORTS`; W3-B-10 `/generate/bits` samples.
- Out of scope: Frozen 11 rewrites, overlay primitives, `ActionInputsSchema`, elbow pack ids, tagging `v1` at `main`, unauthenticated GitHub, REST `/languages`, Playwright in the Action, `POST /api/preview` as an embed API, `npx skills add`, git commit.
