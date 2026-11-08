# Workstream: marketplace-operator

Wave 1. Operator-only leftover of `marketplace-release` (tasks 4.2, 5.1, 5.2). Not git-closable from this clone. W1-M-01 writes this checklist. It does **not** publish, tag, or tick those OpenSpec boxes.

## Files

- `openspec/changes/marketplace-release/tasks.md` (leftover 4.2 / 5.1 / 5.2 stay `[ ]` until a human finishes the UI)
- `.github/assets/*.png` plus `.github/assets/MANIFEST.md`
- `.github/workflows/release.yml` (only pusher of orphan `release/v1` and floating `v1`)
- `scripts/publish-action-tree.sh` (local orphan tree; never tags; never pushes)
- `action/README.md` (Marketplace body on the orphan tree), generated `action.yml`

## Operator checklist (W1-M-01)

GitHub Marketplace has **no** live listing yet (`/marketplace/actions/profile-bits-widgets` 404). First publish is from the orphan `@v1` tree, not from `main`. Agents MUST NOT run `release.yml`, MUST NOT `git tag v1`, MUST NOT `git checkout release/v1`, MUST NOT tick OpenSpec 4.2/5.1/5.2.

Expected live URL after publish: `https://github.com/marketplace/actions/profile-bits-widgets` (slug from listing name `Profile Bits widgets`).

### 0. Git preconditions (already skip-if-green; re-check before UI work)

- [ ] `action.yml` name is `Profile Bits widgets`, description is `Generate GitHub profile widgets from committed yaml.`, branding is `icon: layout` / `color: blue`.
- [ ] Marketplace default `output_action` is `commit` in generated `action.yml`. CLI default `none` (`packages/cli` `CLI_OUTPUT_ACTION_DEFAULT`) is **not** the listing default.
- [ ] Thin inputs only. No `plugin_<plugin>_<widget>_<option>`. No `plugin_wakatime` / `plugin_rss` / `plugin_http` bools. `plugin_github` pack bool is allowed.
- [ ] `action/README.md` pin snippet is `uses: wyattowalsh/profile-bits@v1` and never `@main`. Body says the Action does **not** patch consumer `README.md`.
- [ ] `.gitignore` ignores `dist/` on `main` (`# dist/ is gitignored on main; committed only on orphan release/v1`).
- [ ] `.github/workflows/release.yml` is `on: workflow_dispatch` only (no `push`). Requires `refs/heads/main`. Refuses when orphan SHA equals main SHA. Tags `v1` at the **orphan** SHA only. Never `git checkout release/v1`.
- [ ] Listing stills exist as committed PNGs (dark defaults; spec names hero, stats, chips, architecture):

| Slot | File | Alt (from MANIFEST.md) |
| --- | --- | --- |
| 1 | `.github/assets/hero.png` | profile-bits README hero: JSX to PNG GitHub profile widgets |
| 2 | `.github/assets/github-stats.png` | octocat GitHub stats card: followers, repos, stars, forks, gists |
| 3 | `.github/assets/http-chips.png` | HTTP chips card from shieldcn fixtures |
| 4 | `.github/assets/architecture.png` | yaml and thin Action inputs through Takumi to widget files |

Optional extra slots only: `github-demo`, `github-languages`, `github-repo`, `wakatime-coding`, `rss-feed`, `http-json` (same directory, dark PNGs). Do **not** upload `-light` pairs unless the listing UI has an explicit light slot. Do **not** use `docs/assets/readme/`.

### 1. Attach stills in the listing UI (OpenSpec 4.2)

Screenshots are **not** in the orphan tree (`publish-action-tree.sh` copies `action.yml`, `dist/**`, `LICENSE`, `action/README.md` → `README.md` only). Attach files from a local `main` checkout in the GitHub Marketplace listing UI, not by committing them onto `release/v1`.

- [ ] Open the listing editor. First publish: the **Release Action** form (step 3). Later edits: listing **Edit** / [marketplace manage](https://github.com/marketplace/manage).
- [ ] If the form has screenshot / media slots, upload the four PNGs in the table above (local files, not URLs). Use MANIFEST alt text. Dark is default.
- [ ] MUST NOT claim Camo sanitization, a public embed API, or `POST /api/preview` as delivery.
- [ ] MUST NOT claim first-party packs other than `github`, `wakatime`, `rss`, and `http`.
- [ ] MUST NOT paste playground / Camo / gist-as-CDN captures. Stills are Takumi-rasterized fixtures (see MANIFEST).
- [ ] If GitHub’s Action listing form has **no** screenshot slots, leave OpenSpec 4.2 unchecked. Do **not** copy stills onto the orphan tree, do **not** add Camo URLs to `action/README.md`, and do **not** invent a second publisher. Record “no screenshot UI” in the listing notes and retry when GitHub exposes slots.

### 2. Dispatch `release.yml` on `main` (OpenSpec 5.1, orphan `@v1`)

Human operator only. 2FA. This workflow is the **only** pusher of `release/v1` and floating `v1`.

- [ ] Confirm the working tree you care about is already on `origin/main`. Do **not** dispatch from a feature branch.
- [ ] Open [Release workflow](https://github.com/wyattowalsh/profile-bits/actions/workflows/release.yml) → **Run workflow** → branch **`main`** → **Run workflow**.
- [ ] Wait for green. Job **Require main** must pass (`GITHUB_REF` is `refs/heads/main`).
- [ ] Log line `orphan release/v1 <orphan_sha> (main <main_sha>)` has **two different SHAs**. If they match, the workflow refused (or you must not proceed).
- [ ] Confirm remotely **without** checking out `release/v1`:

```bash
git fetch origin main
git fetch origin tag v1 --force
test "$(git rev-parse refs/tags/v1)" != "$(git rev-parse origin/main)"
git cat-file -t "$(git rev-parse refs/tags/v1)"   # commit
```

- [ ] MUST NOT `git tag v1` at `main`. MUST NOT `git checkout release/v1`. MUST NOT create a new `v1` tag from the GitHub **Draft a release** banner on `main` (that banner defaults to tagging the current `main` SHA).

### 3. Publish or update the Marketplace listing from existing tag `v1` (OpenSpec 5.1)

Docs: [Publishing actions in GitHub Marketplace](https://docs.github.com/en/actions/sharing-automations/creating-actions/publishing-actions-in-github-marketplace). Accept the GitHub Marketplace Developer Agreement if the Publish checkbox is disabled.

- [ ] **Releases** → **Draft a new release**.
- [ ] **Choose an existing tag:** `v1`. Do **not** “Create new tag: v1” on `main`. The tag must already point at the orphan SHA from step 2.
- [ ] Check **Publish this Action to the GitHub Marketplace**.
- [ ] Primary category (recommended): **Utilities**. Optional secondary: **Publishing**. Spec does not lock category names; do not pick a category that collides with the action `name`.
- [ ] Release title: `v1`. Body may be empty or a one-liner; the listing README is the orphan-tree `README.md` sourced from `action/README.md`.
- [ ] Publish release (2FA). Orphan tree listing identity must remain: name `Profile Bits widgets`, yaml-SSOT description, branding `layout` / `blue`.
- [ ] Repeat step 1 stills if the listing editor is only available after the listing exists.

### 4. Confirm live listing (OpenSpec 5.2)

- [ ] Live page exists (expected `https://github.com/marketplace/actions/profile-bits-widgets`).
- [ ] Usage snippet is exactly `uses: wyattowalsh/profile-bits@v1` and MUST NOT use `@main`.
- [ ] Listing / `action.yml` default `output_action` is **`commit`**. CLI default `none` is **not** shown as the Marketplace default. `cli-vs-action` stills explain the split; they are optional extras, not a license to advertise `none` on the listing.
- [ ] Consumer `with:` keeps yaml SSOT (`config: .github/profile-bits.yml`). No flattened `plugin_*_*_*` keys. No `plugin_wakatime` / `plugin_rss` / `plugin_http` bools.
- [ ] Copy presents the Action as **committing widget files**, not as a README patcher, not as a public embed API, not as `/generate/catalog` marketplace, not as gist-as-CDN.
- [ ] Four first-party packs only: `github` (`demo`, `stats`, `languages`, `repo`), `wakatime` (`coding`), `rss` (`feed`), `http` (`json`, `chips`).
- [ ] Branding in the listing chrome is layout / blue.

### 5. Closeout (human, after 1–4)

- [ ] Only then tick OpenSpec `marketplace-release` tasks 4.2, 5.1, and 5.2. This clone / this agent does **not** tick them.
- [ ] Do not archive `marketplace-release` until those three boxes are honestly checked.
- [ ] Never retag `main`. Never commit `dist/` on `main`. Never run `npx skills add`.

## Forbidden (listing + operator)

- Tag `v1` at `main`. Pin `uses: …@main`. Second publisher besides `release.yml`.
- Flattened Marketplace inputs. Extra first-party packs. Playwright in the Action. Unauthenticated GitHub.
- Claim Camo, `POST /api/preview` embed API, docs playground delivery, or gist CDN.
- Copy stills onto the orphan tree or rewrite `action/README.md` from this node.

## Verify

- Human: listing page shows stills (or 4.2 stays open if GitHub has no screenshot UI), pin `@v1`, `output_action` commit
- `action.yml` branding remains `icon: layout`, `color: blue`
- Automated (this node): `pnpm exec vitest run packages/action/src/marketplace-operator.test.ts`

## Risks

Automated verification cannot prove the live listing. This plan is a checklist, not CI. First publish is still missing (Marketplace 404). The GitHub “Draft a release” banner on `main` will tag `main` if the operator creates a **new** `v1` tag — always choose the **existing** `v1` after `release.yml`.

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W1-M-01 | 0 | — |
