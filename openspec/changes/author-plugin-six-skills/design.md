## Context

`packages/bits/src/` contains the frozen 11 shared primitives and
`packages/themes/src/families/` contains host-owned named theme data. The
existing four-skill plugin has no focused owner for either destination.

## Goals / Non-Goals

**Goals**

- Ship exactly six authoring skills with names matching their directories.
- Make Theme-bit versus yaml-theme routing deterministic.
- Make in-card Chip versus Shields.io README routing deterministic.
- Preserve contained templates, live catalog reads, and read-only umbrella
  behavior.

**Non-goals**

- A seventh skill, `author-theme`, `author-badge`, MCP, commands, hooks, or LSP.
- Product source changes under `packages/**`.
- Changes to plugin-, widget-, or integration-contract.
- OpenSpec archive or generated OpenSpec skill changes.

## Decisions

### Exactly six skills

The closed allowlist is `author`, `author-bit`, `author-palette`,
`author-integration`, `author-widget`, and `author-plugin`. Empty args show
gallery items 0–5 and stop before reading contracts or live types.

### Bit destination and lifecycle

Frozen bits are single files at `packages/bits/src/<BitName>.tsx` with exports
in `packages/bits/src/index.ts`. Completing any of the frozen 11 is no-clobber.
An OpenSpec-approved 12th name may use one generic skill-local `Bit.template`;
there are no templates for the frozen 11.

### Palette destination and lifecycle

Named palette families live at
`packages/themes/src/families/<family>.ts` and register in
`packages/themes/src/registry.ts`. Existing families are extended, not
replaced. New ids/families and yaml shape changes are OpenSpec-first. The
skill never creates `packages/palettes/`.

### Theme and badge words are routes, not skill ids

`Theme` component routes to `author-bit`; yaml `theme`, flavors, swatches,
pairs, and seven-token maps route to `author-palette`. Bare theme is
ambiguous. In-card `Chip` routes to `author-bit`; Shields.io README images
route to sibling tooling. A new data-backed badge pack follows OpenSpec,
integration, plugin, then widget.

### Catalog and containment

All pack/widget/integration decisions read live
`packages/core/src/types.ts`; skills do not embed a frozen pack-id table.
Templates are inside their owning skill and contain no parent traversal.
Agent Plugin 1.0.0 remains closed and version `0.1.0`.

## Risks / Trade-offs

- Ambiguous theme requests could mutate the wrong layer; the router returns to
  the gallery unless the destination is explicit.
- A generic template could overwrite frozen bits; complete-existing explicitly
  stops and reserves the template for an approved 12th name.
- Symlink copies could drift; the harness remains committed relative
  `120000` links.

## Migration Plan

1. Lift the validator allowlist and add two valid skill stubs plus symlinks.
2. Replace stubs with skill cores, references, templates, and evals.
3. Patch umbrella and specialized dispatch, docs, live spec, and this delta.
4. Run the pinned skill, plugin, OpenSpec, and symlink gates.

Rollback reverts this change and the two new harness links. Do not archive.

## Open Questions

None.
