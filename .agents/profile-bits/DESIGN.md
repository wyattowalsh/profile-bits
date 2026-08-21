# profile-bits Agent Plugin design

## Authoring

The plugin exposes exactly six skills:

| Skill | Destination |
| --- | --- |
| `author` | Read-only classification and ideate |
| `author-bit` | `packages/bits/src/<BitName>.tsx` |
| `author-palette` | `packages/themes/src/families/<family>.ts` |
| `author-integration` | `packages/integrations/src/<id>/` |
| `author-widget` | `packages/plugins/src/<pack>/widgets/<id>/` |
| `author-plugin` | `packages/plugins/src/<id>/` |

Empty arguments skip Before routing, show gallery items 0–5, and stop.
Ideate re-reads live disk, ranks `kind=bit`, `kind=palette`, or an existing
pack kind, names a handoff, and stops without copying templates.

`Theme` has two intentionally separate meanings. The shared `Theme` component
is a bit and routes to `author-bit`; root yaml `theme`, named flavors, swatches,
pairs, and seven-token maps route to `author-palette`. Bare “theme” is
ambiguous and returns to the gallery.

In-card `Chip` routes to `author-bit`. Shields.io README images route to the
sibling README plugin or `add-badges`. A new badge-fetching pack remains an
OpenSpec-first integration + plugin + widget change. No `author-theme`,
`author-badge`, or seventh skill directory ships.

Templates stay inside their owning skill and contain no parent traversal.
Catalog decisions always read live `packages/core/src/types.ts`; the skills do
not carry a frozen pack-id table.
