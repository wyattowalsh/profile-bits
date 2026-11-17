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
The OpenSpec-approved README-card bit names MUST be exactly `Image`, `Heatmap`, `Board`, `Icon`, `Grid`, `List`, and `Time`. Each MUST exist at `packages/bits/src/<BitName>.tsx` with a named export and a `BIT_EXPORTS` entry. Ranking name Cover MUST map to `Image` and MUST NOT create `Cover.tsx` or a `Cover` export. This change MUST NOT invent extra README-card bit names beyond those seven plus Frozen 11. Later useful bits MAY also appear in `BIT_EXPORTS`.

#### Scenario: Seven names are approved
- **WHEN** Wave 3 asks `author-bit` for a README-card primitive
- **THEN** the approved names MUST be Image, Heatmap, Board, Icon, Grid, List, and Time

#### Scenario: Cover is Image not a bit id
- **WHEN** a ranking or pack plan says Cover for album or game art
- **THEN** the bit MUST be `Image` and MUST NOT add a `Cover` export

#### Scenario: No extra first-party bit names
- **WHEN** this change lands
- **THEN** it MUST NOT approve README-card bit names other than Frozen 11 plus Image, Heatmap, Board, Icon, Grid, List, and Time, and later useful bits MAY remain in `BIT_EXPORTS`

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

### Requirement: Approved README-card sources are exported
`packages/bits/src/Image.tsx`, `packages/bits/src/Heatmap.tsx`, `packages/bits/src/Board.tsx`, `packages/bits/src/Icon.tsx`, `packages/bits/src/Grid.tsx`, `packages/bits/src/List.tsx`, and `packages/bits/src/Time.tsx` MUST exist. Each MUST be a named export and a `BIT_EXPORTS` entry. `BIT_EXPORTS` MUST include Frozen 11 and those seven names and MAY also include later useful bits. `Cover` MUST NOT be exported. `Dialog`, `Toast`, `Popover`, `Dropdown`, and `Command` MUST remain out of `BIT_EXPORTS`. This change MUST NOT rewrite Frozen 11 sources, MUST NOT edit DESIGN.md, and MUST NOT add flattened `plugin_<plugin>_<widget>_<option>` Action inputs. `/generate/bits` MAY include samples for the seven and for later useful bits.

#### Scenario: Image source exists and is exported
- **WHEN** this change is present on disk
- **THEN** `packages/bits/src/Image.tsx` MUST exist and `BIT_EXPORTS` MUST include `Image`

#### Scenario: Barrel includes the seven and may include later useful bits
- **WHEN** `BIT_EXPORTS` is read from `packages/bits/src/index.ts`
- **THEN** `BIT_EXPORTS` MUST include Image, Heatmap, Board, Icon, Grid, List, and Time, MUST still include Frozen 11, and MAY also include later useful bits
