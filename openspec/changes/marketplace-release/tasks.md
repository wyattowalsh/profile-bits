## 1. Listing identity (skip-if-green)

- [x] 1.1 Generated `action.yml` name is `Profile Bits widgets`, description mentions committed yaml, branding is `icon: layout` / `color: blue`.
- [x] 1.2 `pnpm generate-action --check` stays green (no flattened `plugin_*_*_*`, no `plugin_wakatime` / `plugin_rss` / `plugin_http` bools).

## 2. Marketplace README and pin (skip-if-green)

- [x] 2.1 `action/README.md` tells consumers to pin `wyattowalsh/profile-bits@v1` and never `main`.
- [x] 2.2 `action/README.md` documents yaml SSOT, thin inputs including `wakatime_token` and `http_token_env`, and that the Action does not patch consumer README.md.
- [x] 2.3 `scripts/publish-action-tree.sh` copies `action/README.md` to orphan-tree `README.md` with `action.yml`, `dist/**`, and `LICENSE`. Never tags. Never writes `main`.

## 3. Orphan v1 publisher (skip-if-green)

- [x] 3.1 `.github/workflows/release.yml` is the only pusher of `release/v1` and floating `v1`. Requires `refs/heads/main`. Refuses when orphan SHA equals main SHA. Never `git checkout release/v1`.
- [x] 3.2 `dist/` stays gitignored on `main`.

## 4. Screenshots (skip-if-green)

- [x] 4.1 Committed stills exist under `docs/assets/readme/` (hero, stats, chips, architecture) for listing screenshots.
- [ ] 4.2 Operator attaches those stills in the GitHub Marketplace listing UI (not in git). MUST NOT claim Camo, embed API, or extra first-party packs.

## 5. Marketplace listing publish (operator)

- [ ] 5.1 Publish or update the GitHub Marketplace listing from the orphan `@v1` tree after a `workflow_dispatch` of `release.yml`.
- [ ] 5.2 Confirm the live listing usage snippet is `uses: wyattowalsh/profile-bits@v1` and Marketplace default `output_action` is `commit` (CLI default `none` is not the listing default).
