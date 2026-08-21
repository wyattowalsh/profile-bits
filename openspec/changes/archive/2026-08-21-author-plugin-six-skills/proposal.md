## Why

The authoring plugin routes integrations, widgets, and packs but leaves shared
bits and host-owned theme palettes inside an umbrella checklist. That makes
`Theme` and badge language ambiguous and prevents focused completion,
OpenSpec gating, templates, and evals for those destinations.

## What Changes

- Expand the allowlist from four to exactly six skills: `author`,
  `author-bit`, `author-palette`, `author-integration`, `author-widget`, and
  `author-plugin`.
- Route the `Theme` UI primitive and in-card `Chip` to `author-bit`; route yaml
  `theme`, named flavors, swatches, and token maps to `author-palette`.
- Route Shields.io README images to sibling README tooling. Do not add
  `author-theme`, `author-badge`, or another skill.
- Keep empty arguments above Before routing and keep `author` read-only.
- Add contained bit/palette templates and evals without changing product
  package source.
- Keep Agent Plugins 1.0.0 closed manifest, plugin version `0.1.0`, live
  `types.ts` catalog, thin Action inputs, and `skills-ref@0.1.5`.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `author-plugin`: exactly six authoring skills, bit/palette routing and
  destinations, six symlink projections, validation, docs, and eval coverage.

## Impact

- Plugin SSOT: `.agents/profile-bits/**`
- Harness: six `.agents/skills/author*` relative symlinks
- Contract: `openspec/specs/author-plugin/spec.md` and this change delta only
- No product runtime changes, no three-layer contract rewrites, no MCP, no
  OpenSpec archive
