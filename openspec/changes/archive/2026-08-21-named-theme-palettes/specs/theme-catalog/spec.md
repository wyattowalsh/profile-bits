## Purpose

Defines the host-owned named theme catalog: 47 official flavor ids, frozen 7-token palettes, official swatches and roles, color-ref grammar, and fail-closed resolve so every pack inherits the same hex.

## ADDED Requirements

### Requirement: Host owns the catalog
Theme hex MUST live in a host-owned catalog (the `@profile-bits/themes` data package). The catalog MUST NOT import Takumi or parse yaml. Plugins, bits, and widgets MUST NOT own flavor hex, local `DARK_*` palettes, or per-widget token types. Linguist language colors MUST stay out of the 7 theme tokens.

#### Scenario: Plugins do not ship palettes
- **WHEN** a first-party plugin renders a card
- **THEN** it MUST consume a host-resolved `ThemePalette` and MUST NOT define plugin-local hex maps

#### Scenario: Catalog has no yaml or Takumi
- **WHEN** the themes package is imported
- **THEN** it MUST export catalog data and resolve APIs only and MUST NOT parse yaml or import Takumi

### Requirement: Frozen seven tokens
A resolved `ThemePalette` MUST contain exactly these tokens: `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. `font` MUST always be `Geist`. The catalog MUST NOT add custom fonts or extra WOFF2 files. CSS variables MAY be generated from a resolved palette and MUST NOT be the color source of truth.

#### Scenario: Palette has seven tokens
- **WHEN** a named id or custom mix is resolved
- **THEN** the result MUST include `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font` and MUST NOT include other theme tokens

#### Scenario: Font is always Geist
- **WHEN** any named flavor or custom mix is resolved
- **THEN** `font` MUST be `Geist`

### Requirement: Named catalog has 47 official ids
The catalog MUST expose exactly these 47 named flavor ids. Yaml default MUST remain `dark`. `light` and `dark` MUST remain GitHub Primer chrome. The catalog MUST NOT import a github-readme-stats theme dump (`radical`, `merko`, gradients, transparent, or unofficial hex lists).

GitHub (`github`): `light`, `dark`, `github-dimmed`

Catppuccin (`catppuccin`): `catppuccin-latte`, `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha`

Rosé Pine (`rose-pine`): `rose-pine`, `rose-pine-moon`, `rose-pine-dawn`

Nord (`nord`): `nord`, `nord-light`

Dracula (`dracula`): `dracula`, `dracula-alucard`

Gruvbox (`gruvbox`): `gruvbox-dark`, `gruvbox-light`

Tokyo Night (`tokyo-night`): `tokyo-night`, `tokyo-night-storm`, `tokyo-night-moon`, `tokyo-night-day`

Solarized (`solarized`): `solarized-dark`, `solarized-light`

One (`one`): `one-dark`, `one-light`

Ayu (`ayu`): `ayu-dark`, `ayu-mirage`, `ayu-light`

Everforest (`everforest`): `everforest-dark`, `everforest-light`

Kanagawa (`kanagawa`): `kanagawa-wave`, `kanagawa-dragon`, `kanagawa-lotus`

Flexoki (`flexoki`): `flexoki-dark`, `flexoki-light`

Nightfox (`nightfox`): `nightfox`, `dawnfox`, `dayfox`

Iceberg (`iceberg`): `iceberg-dark`, `iceberg-light`

Night Owl (`night-owl`): `night-owl`, `light-owl`

Horizon (`horizon`): `horizon-dark`, `horizon-light`

Bluloco (`bluloco`): `bluloco-dark`, `bluloco-light`

PaperColor (`papercolor`): `papercolor-dark`, `papercolor-light`

#### Scenario: Catalog lists 47 ids
- **WHEN** the named catalog is enumerated
- **THEN** it MUST contain exactly the 47 ids listed above and MUST include `light`, `dark`, and `github-dimmed`

#### Scenario: Unofficial dump ids are absent
- **WHEN** a consumer requests `radical`, `merko`, or another github-readme-stats dump id
- **THEN** resolve MUST fail and MUST NOT treat that id as a named flavor

### Requirement: Flavor records carry pair and roles
Each named flavor MUST record `id`, `family`, `label`, `polarity` (`light` | `dark`), `pair` (an opposite-polarity named id in the same family), `license`, `sourceUrl`, `swatches` (official names to hex), and `roles` (the 7 tokens to swatch id). Every flavor MUST have an opposite-polarity `pair`. Every role MUST resolve to a swatch hex in that flavor. `font` MUST map to Geist, not a color swatch.

#### Scenario: Every flavor has an opposite pair
- **WHEN** the catalog is validated
- **THEN** every flavor MUST have a `pair` id that exists, belongs to the same family, and has the opposite polarity

#### Scenario: Every role resolves
- **WHEN** a named flavor is resolved
- **THEN** each of `bg`, `card`, `text`, `muted`, `accent`, and `border` MUST resolve to a hex from that flavor’s official swatches

### Requirement: Color refs resolve fail-closed
A color ref MUST be one of: `{flavorId}.{swatchId}` (for example `catppuccin-mocha.mauve`), `{flavorId}.{role}` (for example `catppuccin-mocha.accent`), or hex `#RGB` / `#RRGGBB` / `#RRGGBBAA`. Unknown flavor ids, unknown swatch ids, unknown roles, and malformed hex MUST fail resolve. Resolve MUST NOT silently fall back to `dark`.

#### Scenario: Swatch ref resolves
- **WHEN** a ref is `catppuccin-mocha.mauve`
- **THEN** resolve MUST return that flavor’s official `mauve` hex

#### Scenario: Role ref resolves
- **WHEN** a ref is `catppuccin-mocha.accent`
- **THEN** resolve MUST return the hex of that flavor’s `accent` role

#### Scenario: Unknown swatch fails
- **WHEN** a ref’s flavor exists but the swatch or role is unknown
- **THEN** resolve MUST fail and MUST NOT substitute another color

#### Scenario: Unknown flavor fails
- **WHEN** a ref uses a flavor id that is not in the catalog
- **THEN** resolve MUST fail and MUST NOT fall back to `dark`
