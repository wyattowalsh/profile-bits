## Purpose

Locks the GitHub Marketplace listing for profile-bits: listing copy, branding, screenshots, categories, and the `@v1` pin consumers copy, without rewriting the thin Action input contract.

## ADDED Requirements

### Requirement: Marketplace listing identity
The Marketplace listing MUST use name `Profile Bits widgets` and description `Generate GitHub profile widgets from committed yaml.` Branding MUST be `icon: layout` and `color: blue`. The listing MUST present the Action as committing widget files from yaml SSOT, not as a README patcher and not as a public embed API.

#### Scenario: Generated action.yml branding matches listing
- **WHEN** `pnpm generate-action --check` runs
- **THEN** generated `action.yml` MUST contain `name: Profile Bits widgets`, the yaml-SSOT description, and branding `icon: layout` / `color: blue`

### Requirement: Consumers pin orphan v1
The listing and Marketplace README MUST tell consumers to pin `wyattowalsh/profile-bits@v1`. `@v1` MUST point at the orphan `release/v1` tree only. The listing MUST NOT tell consumers to pin `main`. The system MUST NEVER tag `v1` at `main`.

#### Scenario: Pin snippet uses @v1
- **WHEN** a consumer copies the listing usage snippet
- **THEN** the snippet MUST use `uses: wyattowalsh/profile-bits@v1` and MUST NOT use `@main`

#### Scenario: v1 is never tagged at main
- **WHEN** the release workflow publishes
- **THEN** it MUST tag floating `v1` at the orphan `release/v1` SHA and MUST refuse when that SHA equals main

### Requirement: Marketplace README is the orphan tree README
The Marketplace README body MUST be `action/README.md` (copied to `README.md` on the orphan tree). Root repo `README.md` MUST remain the project homepage and MUST NOT be the Marketplace listing body. The Action MUST NOT patch consumer `README.md`.

#### Scenario: Orphan tree ships action README
- **WHEN** `publish-action-tree.sh` writes the orphan tree
- **THEN** the tree MUST include `action.yml`, `dist/**`, `LICENSE`, and `README.md` sourced from `action/README.md`

### Requirement: Listing screenshots are committed stills
Marketplace screenshots MUST be committed stills under `docs/assets/readme/` (hero, stats, chips, architecture). Screenshots MUST NOT claim Camo sanitization, a public `POST /api/preview` embed, or first-party packs other than `github`, `wakatime`, `rss`, and `http`.

#### Scenario: Listing does not advertise embed API
- **WHEN** the Marketplace listing or Marketplace README describes delivery
- **THEN** it MUST describe the Action committing widget files and MUST NOT describe the docs playground as a public embed API

### Requirement: Listing does not flatten widget options
The Marketplace listing MUST NOT introduce flattened `plugin_<plugin>_<widget>_<option>` inputs or `plugin_wakatime` / `plugin_rss` / `plugin_http` bools. Widget options MUST stay in committed yaml. Marketplace default `output_action` MUST remain `commit`. Local CLI default `output_action` MUST remain `none` and MUST NOT be advertised as the Marketplace default.

#### Scenario: Listing usage keeps yaml SSOT
- **WHEN** the listing shows a consumer workflow
- **THEN** widget options MUST come from `config: .github/profile-bits.yml` and MUST NOT appear as flattened Action `with:` keys
