# @profile-bits/bits

Shared Takumi-safe widget UI index. Not a plugin and not a yaml layer. Users never put `bits:` in `.github/profile-bits.yml`.

v0 exports: `Theme`, `Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`, `Divider`.

Rules: `div`/`span`/`img` + `tw`/`style`/`className` only. No `react-dom`, no `useEffect`, no portals, no `document`.
