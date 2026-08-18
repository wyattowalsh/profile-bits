## MODIFIED Requirements

### Requirement: Widget is one template plus option schema
A widget MUST have an id, title, description, option schema, integrations list, size, formats, defaults, fetch, render, and examples. A widget MUST bind to exactly one Takumi template. Root Takumi node MUST use `width: 100%` and `height: 100%`. Theme tokens MUST be limited to `bg`, `card`, `text`, `muted`, `accent`, `border`, and `font`. Those tokens MUST come from a host-resolved `ThemePalette` only. A widget MUST NOT declare a local palette, a per-widget token type, or plugin-owned hex. Author-widget templates MUST accept a named `ThemeId` or a resolved `ThemePalette` and MUST NOT invent `{{WIDGET}}ThemeTokens`.

#### Scenario: Widget declares a single template
- **WHEN** a widget is registered
- **THEN** it MUST expose one option schema and one Takumi template and MUST list the integrations it consumes

#### Scenario: Widget uses resolved palette only
- **WHEN** a widget template reads colors
- **THEN** it MUST use a host-resolved `ThemePalette` and MUST NOT read a plugin-local hex map

## ADDED Requirements

### Requirement: Bits consume theme context only
Bits MUST read colors from the host theme context (`useBitTheme()` / `<Theme>`). `<Theme>` MUST accept a named `ThemeId` or a resolved `ThemePalette`. Bits MUST NOT import flavor hex from the catalog or from plugins.

#### Scenario: Bit reads context only
- **WHEN** a bit renders
- **THEN** it MUST read the current `ThemePalette` from theme context and MUST NOT import named-flavor hex

#### Scenario: Theme wrapper accepts id or palette
- **WHEN** `<Theme>` is given a named id or a resolved palette
- **THEN** descendant bits MUST see the same resolved 7-token palette

### Requirement: All packs inherit one resolved palette
Changing the run-global theme MUST change github, wakatime, rss, http, and bit samples together. A widget MUST NOT keep a private dark/light hex table that can drift from the host catalog. Baked SVG MUST still contain no `<style>`, `@keyframes`, SMIL, or `foreignObject`.

#### Scenario: Named theme applies across packs
- **WHEN** the run theme is `catppuccin-mocha`
- **THEN** github, wakatime, rss, http, and bit renders MUST use mocha `bg` hex and MUST NOT use Primer `#0d1117` unless that hex is mocha `bg`

#### Scenario: Baked SVG stays still
- **WHEN** a themed widget is rendered as default SVG
- **THEN** the file MUST NOT contain `<style>`, `@keyframes`, SMIL, or `foreignObject`
