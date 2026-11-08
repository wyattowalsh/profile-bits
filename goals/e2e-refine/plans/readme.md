# Workstream: readme

Wave 1. Visual/full README using live stills. Stills SSOT is `.github/assets/`, not `docs/assets/readme/` (that directory is gone).

## Files

- `README.md`
- `.github/assets/MANIFEST.md` and PNG pairs
- `scripts/render-readme-assets.ts`
- `action/README.md` (Marketplace body; do not replace with root README)
- `examples/readme-embed.md`, `examples/profile-readme.yml`

## Steps

1. Keep eight widget stills + chrome stills as `<picture>` + `prefers-color-scheme`.
2. Fix `output_pair: false` copy to **selected flavor**, matching `action/README.md`.
3. Pin `wyattowalsh/profile-bits@v1` everywhere; never `@main`.
4. Do not teach the Action to patch README.md (already fail_run).
5. Do not claim embed API, Camo, or extra packs beyond github/wakatime/rss/http in current copy. Wave 3 packs get README rows only after those OpenSpec changes ship.

## Verify

- Grep README for `docs/assets/readme` → zero hits
- Grep `wyattowalsh/profile-bits@v1` in README + action/README + examples
- `rg "must not patch README" packages/action` tests still pass
- All eight `*-light.png` files exist under `.github/assets`

## Risks

`scripts/readme-assets/README.draft.md` is stale leftover. Do not merge it over live README.

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W1-R-01 | 0 | — |
