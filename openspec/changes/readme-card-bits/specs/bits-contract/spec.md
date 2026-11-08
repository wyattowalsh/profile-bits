## Purpose

Shared Takumi-safe widget UI primitives in `packages/bits`. This capability names Frozen 11 as complete-existing, approves Wave 3 README-card bits Image, Heatmap, Board, Icon, Grid, List, and Time, and refuses overlay primitives that need portals or document.

## ADDED Requirements

### Requirement: Frozen 11 stay complete-existing
The Frozen 11 bit names MUST remain `Theme`, `Frame`, `Stack`, `Row`, `Text`, `Muted`, `Stat`, `Bar`, `Chip`, `Avatar`, and `Divider`. Completing any of those names MUST inventory live `packages/bits/src/<BitName>.tsx` plus the barrel export and MUST stop as complete-existing when source and export exist. This change MUST NOT rewrite Frozen 11 sources, MUST NOT copy `Bit.template` onto Frozen 11 files, and MUST NOT remove Frozen 11 from `BIT_EXPORTS`. Visual contracts for Frozen 11 MUST stay in live source and DESIGN.md (this capability MUST NOT restate pixel tables for those eleven).

#### Scenario: Frozen 11 membership is unchanged
- **WHEN** this change lands
- **THEN** Frozen 11 MUST still be Theme, Frame, Stack, Row, Text, Muted, Stat, Bar, Chip, Avatar, and Divider

#### Scenario: Completing Theme stops as complete-existing
- **WHEN** `author-bit` is asked to complete `Theme` and `packages/bits/src/Theme.tsx` plus the barrel export exist
- **THEN** it MUST report complete-existing and MUST NOT overwrite that file

#### Scenario: Frozen 11 sources are not rewritten by this change
- **WHEN** this OpenSpec change is applied as W3-B-01
- **THEN** it MUST NOT edit `packages/bits/src/{Theme,Frame,Stack,Row,Text,Muted,Stat,Bar,Chip,Avatar,Divider}.tsx`

### Requirement: Approved README-card primitives are Image Heatmap Board Icon Grid List Time
The OpenSpec-approved 12th+ bit names MUST be exactly `Image`, `Heatmap`, `Board`, `Icon`, `Grid`, `List`, and `Time`. Each MUST land later at `packages/bits/src/<BitName>.tsx` with a named export and a `BIT_EXPORTS` entry. Ranking name Cover MUST map to `Image` and MUST NOT create `Cover.tsx` or a `Cover` export. This change MUST NOT invent extra first-party bit names beyond those seven plus Frozen 11.

#### Scenario: Seven names are approved
- **WHEN** Wave 3 asks `author-bit` for a README-card primitive
- **THEN** the approved names MUST be Image, Heatmap, Board, Icon, Grid, List, and Time

#### Scenario: Cover is Image not a bit id
- **WHEN** a ranking or pack plan says Cover for album or game art
- **THEN** the bit MUST be `Image` and MUST NOT add a `Cover` export

#### Scenario: No extra first-party bit names
- **WHEN** this change lands
- **THEN** it MUST NOT approve bit names other than Frozen 11 plus Image, Heatmap, Board, Icon, Grid, List, and Time

### Requirement: Image is rectangular cover art
`Image` MUST render rectangular cover art via `img` (album, game, or similar). It MUST NOT use Avatar’s circle crop (`borderRadius: size / 2` as the default shape). It MUST be Takumi-safe (`img` plus `tw` / `style` / `className` only).

#### Scenario: Image is not Avatar
- **WHEN** Spotify or Steam cover art is rendered
- **THEN** it MUST use `Image` as a rectangle and MUST NOT use `Avatar` as the cover primitive

#### Scenario: Image uses img
- **WHEN** `Image` renders a source URL
- **THEN** the markup MUST include `img` and MUST NOT use `react-dom` or `document`

### Requirement: Heatmap is a day grid
`Heatmap` MUST render a day grid of intensity cells (contribution calendar / solved-day grid). It MUST NOT be a chess `Board` and MUST NOT be the generic `Grid` layout bit. Cells MUST read color from host theme context and MUST NOT import named-flavor hex.

#### Scenario: Heatmap is a day grid not an 8x8 board
- **WHEN** GitHub contributions or LeetCode solved days are shown
- **THEN** they MUST use `Heatmap` and MUST NOT use `Board`

#### Scenario: Heatmap colors come from theme context
- **WHEN** `Heatmap` fills cells
- **THEN** it MUST read `ThemePalette` from bit theme context and MUST NOT import catalog flavor hex

### Requirement: Board is an 8x8 grid
`Board` MUST render an 8×8 grid (chess). It MUST NOT be `Heatmap` and MUST NOT replace generic `Grid`. Markup MUST stay Takumi-safe `div` / `span` / `img` plus `tw` / `style` / `className`.

#### Scenario: Chess uses Board
- **WHEN** a chess game position is shown on a README card
- **THEN** it MUST use `Board` as an 8×8 grid and MUST NOT use `Heatmap`

#### Scenario: Board is eight by eight
- **WHEN** `Board` renders
- **THEN** it MUST present eight columns and eight rows

### Requirement: Icon Grid List and Time are Takumi-safe marks and layout
`Icon` MUST be a compact mark via `img` or geometric `div` / `span` and MUST NOT import a DOM icon library. `Grid` MUST lay out children in two-dimensional cells and MUST NOT specialize into `Heatmap` or `Board`. `List` MUST stack item rows and MUST NOT replace `Stack` as the generic column layout. `Time` MUST render a formatted timestamp string and MUST NOT perform HTTP.

#### Scenario: Icon does not load a DOM icon library
- **WHEN** `Icon` renders
- **THEN** it MUST use `img` or geometric `div` / `span` and MUST NOT import `react-icons` or `document`

#### Scenario: Grid is not Heatmap or Board
- **WHEN** a widget needs a generic two-dimensional cell layout
- **THEN** it MUST use `Grid` and MUST NOT require `Heatmap` or `Board` for that layout

#### Scenario: List is item rows not Stack
- **WHEN** a widget shows stacked item rows (title plus meta)
- **THEN** it MUST use `List` and MUST NOT treat `Stack` as the item-row primitive

#### Scenario: Time does not fetch
- **WHEN** `Time` renders a timestamp
- **THEN** it MUST format the provided string and MUST NOT perform HTTP

### Requirement: Overlay primitives stay refused
`packages/bits` MUST NOT add `Dialog`, `Toast`, `Popover`, `Dropdown`, or `Command`. Those names need portals, `document`, or `useEffect` and MUST remain out of `BIT_EXPORTS` and pack `bitsUsed`.

#### Scenario: Dialog is refused
- **WHEN** an author asks for a Dialog bit
- **THEN** the system MUST stop and MUST NOT add `packages/bits/src/Dialog.tsx`

#### Scenario: Toast Popover Dropdown Command are refused
- **WHEN** an author asks for Toast, Popover, Dropdown, or Command in `packages/bits`
- **THEN** the system MUST stop and MUST NOT add those source files or barrel exports

### Requirement: Bits stay Takumi-safe and out of yaml
Bits MUST use `div` / `span` / `img` plus `tw` / `style` / `className` only. Bits MUST NOT import `react-dom`, MUST NOT call `useEffect`, MUST NOT use portals, and MUST NOT touch `document`. Users MUST NEVER put `bits:` in `.github/profile-bits.yml`. Takumi imports MUST stay in `@profile-bits/renderer`. Colors MUST come from host theme context. This change MUST NOT add flattened `plugin_<plugin>_<widget>_<option>` Action inputs, MUST NOT add first-party pack / widget / integration ids, and MUST NOT treat `POST /api/preview` as a public embed API.

#### Scenario: No document or react-dom
- **WHEN** a bit in this capability renders
- **THEN** it MUST NOT import `react-dom` and MUST NOT read `document`

#### Scenario: yaml has no bits key
- **WHEN** a consumer writes `.github/profile-bits.yml`
- **THEN** parse MUST NOT accept a `bits:` key as widget configuration

#### Scenario: No flattened Action inputs or new first-party ids
- **WHEN** this change lands
- **THEN** the system MUST NOT add `plugin_<plugin>_<widget>_<option>` inputs and MUST NOT append `FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, or `FIRST_PARTY_INTEGRATION_IDS`

### Requirement: This change does not land bit sources
W3-B-01 MUST be the OpenSpec contract only. It MUST NOT write `packages/bits/src/{Image,Heatmap,Board,Icon,Grid,List,Time}.tsx`, MUST NOT edit `packages/bits/src/index.ts` `BIT_EXPORTS`, MUST NOT edit DESIGN.md, and MUST NOT add `/generate/bits` samples. Later nodes MUST copy `Bit.template` per approved name (W3-B-02…08), then barrel (W3-B-09), then docs samples (W3-B-10).

#### Scenario: W3-B-01 does not create Image.tsx
- **WHEN** this OpenSpec change is written
- **THEN** `packages/bits/src/Image.tsx` MUST NOT exist yet

#### Scenario: Barrel and docs samples wait
- **WHEN** this OpenSpec change is written
- **THEN** `BIT_EXPORTS` MUST still be Frozen 11 only and `/generate/bits` MUST NOT gain the seven samples from this node
