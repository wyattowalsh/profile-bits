## Purpose

Defines `/generate` theming chrome: a family-grouped picker, custom mixer, permalink, yaml export, and pair preview that share one run-global theme with playground GlobalBar.

## ADDED Requirements

### Requirement: One run-global theme on generate and playground
`/generate/catalog`, `/generate/github`, `/generate/github/[widget]`, `/generate/bits`, `/generate/bits/[bit]`, and `/playground/*` MUST share one run-global theme via the shared GlobalBar picker. Theming MUST NOT be per-bit or per-widget independent themes. This capability MUST NOT rewrite the in-flight playground change; playground chrome MUST reuse the same picker and permalink params.

#### Scenario: Generate and playground share theme
- **WHEN** a visitor sets `theme=catppuccin-mocha` on `/generate/github/languages` and opens `/generate/bits/Bar` or `/playground/github`
- **THEN** those surfaces MUST restore the same theme id from the shared permalink params

#### Scenario: Per-widget themes are forbidden
- **WHEN** a visitor previews two widgets in one generate session
- **THEN** both MUST use the same run-global theme and MUST NOT store independent theme ids per widget

### Requirement: Family-grouped combobox replaces light dark toggle
The light/dark toggle MUST be replaced by a family-grouped combobox. The combobox MUST search by family and flavor and MUST show swatch chips for `bg`, `card`, and `accent`. Docs MUST import the host catalog and MUST NOT re-list the 47 ids in a local `PREVIEW_THEMES` union.

#### Scenario: Combobox lists catalog families
- **WHEN** a visitor opens the theme picker
- **THEN** flavors MUST be grouped by family and MUST be searchable by family or flavor label

#### Scenario: Docs import the catalog
- **WHEN** generate or playground chrome enumerates themes
- **THEN** it MUST import the host catalog and MUST NOT hardcode a two-item `light` | `dark` list as the only options

### Requirement: Customize mixer with contrast warning
A Customize panel MUST offer the 7 role slots. Each color slot MUST search all catalog swatches plus hex. The mixer MUST show a live 480×160 preview. Contrast below 4.5:1 for text-on-bg or muted-on-bg MUST show a warning and MUST NOT block render. `font` MUST remain Geist.

#### Scenario: Mixer edits a role
- **WHEN** a visitor sets custom `accent` to `catppuccin-mocha.mauve`
- **THEN** the live 480×160 preview MUST use that mauve hex for `accent`

#### Scenario: Low contrast warns
- **WHEN** text-on-bg or muted-on-bg contrast is below 4.5:1
- **THEN** the mixer MUST show a warning and MUST still allow render

### Requirement: Permalink named id or custom refs
Named themes MUST permalink as `theme=<id>`. Custom themes MUST permalink as `theme=custom` plus `cbg`, `ccard`, `ctext`, `cmuted`, `caccent`, `cborder` refs, and `cpair` when a pair is set. Permalinks MUST NOT use JSON blobs or token fields. Cross-links `/playground` ↔ `/generate` MUST keep these params and MUST still strip tokens.

#### Scenario: Named permalink restores
- **WHEN** the query contains `theme=catppuccin-mocha`
- **THEN** generate and playground MUST restore that named id

#### Scenario: Custom permalink round-trips
- **WHEN** a visitor mixes mauve accent and copies the permalink
- **THEN** opening that URL MUST restore `theme=custom` plus the seven color/pair refs and MUST NOT include tokens

### Requirement: Generate export emits named id or custom object
Generate yaml export MUST emit the named id or the `theme.custom` object. Playground codegen MUST use the same exporter. `output_pair` preview MUST render the resolved pair (family pair or custom `pair`).

#### Scenario: Export named id
- **WHEN** the picker is on `nord` and the visitor copies generated yaml
- **THEN** the yaml MUST contain `theme: nord`

#### Scenario: Export custom object
- **WHEN** the mixer has a custom mix and the visitor copies generated yaml
- **THEN** the yaml MUST contain `theme.custom` with the six color roles and MUST include `pair` when `output_pair` is true

#### Scenario: Pair preview shows two figures
- **WHEN** `output_pair` is true
- **THEN** preview MUST show the light member and the dark member as two figures

### Requirement: Preview POST theme widens without tokens
`POST /api/preview` body `theme` MUST accept a named id or the same custom object as yaml. The body MUST still omit token fields. Preview MUST still use fixtures when no App token is configured.

#### Scenario: Preview accepts custom theme
- **WHEN** `POST /api/preview` receives `theme: { custom: { … } }` and no token fields
- **THEN** the server MUST render using the resolved custom palette

#### Scenario: Preview still has no token fields
- **WHEN** generate posts a preview body
- **THEN** the body MUST NOT include token fields
