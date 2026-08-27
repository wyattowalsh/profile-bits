## Context

See `proposal.md` Why. Thin inputs, node24, orphan `@v1`, and README-not-patched already live in `action-public-api` plus disk (`action.yml`, `action/README.md`, `scripts/publish-action-tree.sh`, `.github/workflows/release.yml`). This design covers listing presentation only.

## Goals / Non-Goals

**Goals:**

- One listing identity (name, description, branding) matching generated `action.yml`.
- Consumer pin is `@v1` on the orphan tree.
- Screenshots from existing `.github/assets/` stills.
- Marketplace README = `action/README.md`.

**Non-Goals:**

- Rewriting thin inputs or `THIN_ACTION_INPUT_NAMES`.
- A second publisher besides `release.yml`.
- Tagging `v1` at `main` or committing `dist/` on `main`.
- Extra first-party packs, flattened inputs, or a public embed API.
- Apply/implementation in the propose pass that created this change.

## Decisions

1. **New capability `marketplace-listing`, not a MODIFIED `action-public-api`.**
   - Why: listing copy/screenshots/categories are a presentation surface; mixing them into the input table would invite re-listing flattened keys.
   - Alternative: extend `action-public-api` — rejected; that spec is the Marketplace *API*, this is the Marketplace *listing*.

2. **Reuse existing T410/T411 machinery.**
   - Why: `publish-action-tree.sh` already builds the orphan tree; `release.yml` already force-pushes `release/v1` and tags orphan SHA.
   - Alternative: a second workflow for Marketplace publish — rejected; peak one publisher.

3. **Screenshots are committed stills, not live Camo captures.**
   - Why: README assets already exist and match DESIGN.md stills; Camo is not an oracle.
   - Alternative: scrape GitHub Camo at listing time — rejected.

4. **Owner pin `wyattowalsh/profile-bits@v1`.**
   - Why: git remote owner is `wyattowalsh`; `@v1` is the floating tag on orphan `release/v1` only.
   - Alternative: pin a SHA or `main` — rejected; `dist/` is gitignored on `main`. Never tag `v1` at `main`.

## Risks / Trade-offs

- [Listing drift from generated `action.yml`] → `generate-action --check` remains the name/description/branding SSOT.
- [Someone tags `v1` at main] → `release.yml` refuses when orphan SHA == main SHA; T410 never tags.
- [Marketplace UI fields not in git] → listing copy that *is* in git (`action.yml`, `action/README.md`) is the contract; GitHub UI extras stay operator-only.

## Migration Plan

- No runtime migration. Listing publish is operator `workflow_dispatch` on `release.yml` after this change is applied.
- Rollback: delete this change folder before archive; do not retag `main`.
