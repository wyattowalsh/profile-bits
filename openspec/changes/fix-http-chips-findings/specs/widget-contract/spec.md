## ADDED Requirements

### Requirement: Action http adapter renders chips
The Action http adapter MUST render widget `chips` when the request id is `chips` and the options include `preset`. The chips branch MUST run before json option parsing. The adapter MUST call chips render with Action `user` (empty string when absent) and MUST forward the request theme. The adapter MUST write exactly one file path `filename` plus the run format extension (for example `chips.svg`) and MUST NOT append `-dark`.

A chips widget error MUST map to `fail_widget` for the **entire** chips widget. One type expand, GET, or normalize failure MUST fail the whole chips widget and MUST NOT write a partial card. Json error mapping MUST stay json-widget or http-client errors → `fail_widget`. Unknown ids handled by the http adapter MUST remain unhandled http widget errors. Github widget `stats` MUST NOT be rendered by the http adapter.

#### Scenario: chips 200 writes filename.format
- **WHEN** chips yaml renders successfully as svg with filename `chips`
- **THEN** the adapter MUST write `chips.svg` at 480×160 and MUST NOT write a `-dark` path from the adapter

#### Scenario: chips 404 is fail_widget
- **WHEN** an expanded chips JSON URL returns HTTP 404
- **THEN** the adapter MUST return `fail_widget` and MUST NOT throw

#### Scenario: one type failure fails the whole widget
- **WHEN** any one chips type expand, GET, or normalize fails and other types would succeed
- **THEN** the chips widget MUST fail entirely and MUST NOT write a partial card

#### Scenario: request theme is forwarded
- **WHEN** the Action http adapter renders chips with request theme `light`
- **THEN** chips render MUST receive that theme and MUST NOT substitute a resolved widget theme in its place

#### Scenario: stats remains unhandled by the http adapter
- **WHEN** the http adapter is invoked with widget id `stats`
- **THEN** it MUST fail as an unhandled http widget and MUST NOT treat stats as chips

### Requirement: chips client render forwards optional theme
Chips render from the injected http client MUST accept an optional theme on the call context and MUST apply that theme to the SVG. Omitting theme and passing only `user` MUST remain valid. Light and dark themes MUST produce distinct SVG output when theme is forwarded.

#### Scenario: omitted theme remains valid
- **WHEN** chips render is called with `{ user: "vercel" }` and no theme
- **THEN** render MUST succeed or fail_widget per load outcome and MUST NOT reject the context for a missing theme

#### Scenario: light and dark SVG differ
- **WHEN** chips render is called twice with the same payloads and themes `light` and `dark`
- **THEN** the two SVG strings MUST differ
