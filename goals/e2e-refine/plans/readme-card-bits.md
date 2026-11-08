# Workstream: readme-card-bits

Wave 3 (before new packs). One OpenSpec change adding Takumi-safe primitives. Frozen 11 stay complete-existing.

## Files

- `openspec/changes/<id>/` then `packages/bits/src/{Image,Heatmap,Board,Icon,Grid,List,Time}.tsx`
- `packages/bits/src/index.ts` `BIT_EXPORTS`
- DESIGN.md bit table
- `apps/docs` bit samples

## Names

- `Image` (rect/cover art; ranking called this Cover)
- `Heatmap` (day grid)
- `Board` (8×8)
- `Icon`, `Grid`, `List`, `Time`

Refuse in `packages/bits`: Dialog, Toast, Popover, Dropdown, Command.

## Steps

1. OpenSpec 12th+ names.
2. `author-bit` only after the delta. `Bit.template` for new names; do not rewrite frozen 11.
3. Isolator samples on `/generate/bits`.

## Verify

- `BIT_EXPORTS` includes the new names
- Bits remain `div`/`span`/`img` + `tw`/`style` only
- Docs bit pages render samples

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W3-B-01 | 0 | — |
| W3-B-02…08 | 1 | B-01 |
| W3-B-09 | 2 | B-02…08 |
| W3-B-10 | 2 | B-02…08 |
