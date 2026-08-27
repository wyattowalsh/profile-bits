## Why

Thin `action.yml`, orphan `release/v1`, and the floating `@v1` tag are already specified (`action-public-api`) and implemented (`scripts/publish-action-tree.sh`, `.github/workflows/release.yml`, `action/README.md`). GitHub Marketplace still needs a dedicated listing contract: listing copy, branding, screenshots, and the pin consumers copy. Without that lock, a later listing pass can invent flattened inputs, tag `v1` at `main`, or treat the docs playground as an embed CDN.

## What Changes

- Add capability `marketplace-listing`: GitHub Marketplace listing SSOT (name, description, branding, screenshots, categories, pin snippet).
- Marketplace README remains `action/README.md` (slim tree on orphan `release/v1`). Root README stays the repo homepage, not the Marketplace body.
- Pin MUST be `wyattowalsh/profile-bits@v1` (floating tag on the orphan tree only). Never pin `main`. Never tag `v1` at `main`.
- Branding MUST stay `icon: layout`, `color: blue` (already in generated `action.yml`).
- Screenshots MUST come from committed `.github/assets/` stills; MUST NOT claim live Camo, a public embed API, or extra first-party packs.
- Release workflow remains the only pusher of `release/v1` and floating `v1`. This change MUST NOT add a second publisher.
- No **BREAKING** Action input changes. No flattened `plugin_*_*_*` Marketplace inputs.

## Capabilities

### New Capabilities

- `marketplace-listing`: GitHub Marketplace listing copy, branding, screenshots, categories, and the `@v1` pin consumers MUST copy. Does not rewrite thin `action.yml` inputs (that is `action-public-api`).

### Modified Capabilities

- (none — `action-public-api` already locks thin inputs, node24, orphan `@v1` policy, and README-not-patched. This change adds listing presentation, not a second input table.)

## Impact

- Listing copy: `action/README.md` (orphan tree `README.md`), generated `action.yml` `name` / `description` / `branding`.
- Screenshots: `.github/assets/*.png` (hero, stats, chips, architecture).
- Release: existing `.github/workflows/release.yml` + `scripts/publish-action-tree.sh` (verify-only; do not rewrite T410/T411).
- Consumers pin `@v1`. Docs playground and local CLI stay out of the Marketplace listing as delivery.
- Out of scope: extra first-party packs, flattened inputs, tagging `v1` at `main`, committing `dist/` on `main`, implementing apply in the same propose pass.
