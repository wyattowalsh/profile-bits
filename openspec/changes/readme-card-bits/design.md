## Context

Frozen 11 (`Theme`, `Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`, `Divider`) already ship from `packages/bits` and stay complete-existing. `author-bit` copies generic `Bit.template` only after OpenSpec approves a 12th name. Wave 3 packs need cover art, day grids, an 8×8 board, and timestamp/list/grid/icon marks. Overlay widgets (Dialog, Toast, Popover, Dropdown, Command) are not Takumi-safe.

Constraints: Node 24, pnpm, OpenSpec 1.9.0. Same-file exclusive: this node writes `openspec/changes/readme-card-bits/**` plus `scripts/readme-card-bits.test.ts`. W3-B-02…08 own one `packages/bits/src/<Name>.tsx` each. W3-B-09 owns `BIT_EXPORTS`. W3-B-10 owns `/generate/bits` samples. DESIGN.md is not this node. Finish `docs-full-catalog-playground` in place.

## Goals / Non-Goals

**Goals:**

- Land one OpenSpec change that names Image, Heatmap, Board, Icon, Grid, List, Time.
- Keep Frozen 11 complete-existing and untouched.
- Refuse Dialog, Toast, Popover, Dropdown, Command (and Cover as a bit id).
- Unlock later `author-bit` copies of `Bit.template` for the seven names.

**Non-Goals:**

- Writing `packages/bits/src/{Image,Heatmap,Board,Icon,Grid,List,Time}.tsx` (W3-B-02…08).
- Barrel `BIT_EXPORTS` or `index.test.ts` (W3-B-09).
- `/generate/bits` samples (W3-B-10).
- Elbow pack ids, `ActionInputsSchema`, live `client.ts` for github/wakatime/rss/http.
- Rewriting Frozen 11 visual tables into this spec (live source + DESIGN.md stay SSOT for those eleven).
- Archiving this change, `npx skills add`, git commit, tagging `v1` at `main`.

## Decisions

### 1. Change id is `readme-card-bits`

- **Choice:** One in-flight change named after the workstream.
- **Why:** Facts require each workstream to be its own OpenSpec change. New ids are OpenSpec-first; do not mint a second change for the same seven names.
- **Alternative:** Per-bit changes — rejected; W3-B-01 is the naming barrier, then seven parallel file nodes.

### 2. New capability `bits-contract`, plus ADDED `author-plugin`

- **Choice:** Primitive vocabulary lives in `bits-contract`. Skill copy/refusal policy is ADDED on `author-plugin`. Do not edit `openspec/specs/**` until archive.
- **Why:** Frozen 11 currently have no dedicated OpenSpec capability. Author-plugin already gates “12th name needs OpenSpec” and should name the approved set so `author-bit` can copy `Bit.template`.
- **Alternative:** Only author-plugin ADDED — rejected; visual contracts for Image/Heatmap/Board are not skill routing. Alternative: restating Frozen 11 pixel tables here — rejected; complete-existing sources must not be dual-written.

### 3. Name is `Image`, not `Cover`

- **Choice:** Ranking Cover maps to `Image` (rectangular `img`). No `Cover.tsx`. `Avatar` stays the circle.
- **Why:** Workstream names `Image` (rect/cover art). A second Cover export would fork the 12th-name allow-list.
- **Alternative:** Export `Cover` as an alias — rejected; extra bit id without an OpenSpec name.

### 4. Heatmap, Board, and Grid stay distinct

- **Choice:** `Heatmap` = day grid of intensity cells. `Board` = 8×8. `Grid` = generic 2D children.
- **Why:** LeetCode/GitHub calendars, chess, and generic chips/grid layouts must not share one primitive.
- **Alternative:** One Grid with a `kind` prop — rejected; Wave 3 file nodes are one agent per bit file.

### 5. Overlay names stay refused

- **Choice:** Dialog, Toast, Popover, Dropdown, Command never land in `packages/bits`.
- **Why:** They need `document`, portals, or `useEffect`. Bits are Takumi-safe `div` / `span` / `img` only.
- **Alternative:** Stub overlay bits as inert `div`s — rejected; backlog and inventory already refuse them.

### 6. This node is spec + tests only

- **Choice:** Exclusive glob is `openspec/changes/readme-card-bits/**` and `scripts/readme-card-bits.test.ts`. Later apply tasks stay unchecked.
- **Why:** Same-file exclusive with W3-B-02…10. oauth-refresh / query-key already used spec-then-apply.
- **Alternative:** Copy `Bit.template` now — rejected; seven-way parallel file nodes own those writes.

## Risks / Trade-offs

- [Approved names without sources] → Wave 3 packs cannot import Image until B-02…09. Mitigate by keeping this change unarchived and B-02…08 unblocked after validate.
- [Cover vs Image drift] → Spec requires Cover to route to Image; tests assert no `Cover.tsx`.
- [bitsUsed allow-list vs starter six] → Starter remains the six layout names; membership MAY include the seven only after they exist. This node does not edit live pack arrays.

## Migration Plan

- Land unarchived. This node MUST NOT edit `openspec/specs/**` until archive.
- Apply order: W3-B-02…08 sources → W3-B-09 barrel → W3-B-10 samples. Do not archive from this node.
- Rollback is deleting this in-flight change; Frozen 11 sources are unmodified.

## Open Questions

- (none — pixel-level Image/Heatmap/Board chrome belongs to W3-B-02…08, not this naming change)
