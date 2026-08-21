# Ideate: rank the next add

Load only for `ideate`, `next`, `brainstorm`, or “what should I add”. Empty
arguments do not load this file.

Ideate is read-only. Re-read live disk, rank one add plus 1–2 runners-up, print
the table, name the handoff skill, and stop. Copy no templates.

## Kinds and handoffs

| `kind` | Handoff | Typical destination |
| --- | --- | --- |
| `bit` | `author-bit` | `packages/bits/src/<BitName>.tsx` |
| `palette` | `author-palette` | `packages/themes/src/families/<family>.ts` |
| `integration` | `author-integration` | `packages/integrations/src/<id>/` |
| `widget` | `author-widget` | `packages/plugins/src/<pack>/widgets/<id>/` |
| `pack` | `author-plugin` | `packages/plugins/src/<id>/` |

Do not use `kind=theme` or `kind=badge`. `Theme` UI work is `kind=bit`; yaml
theme and named flavor work is `kind=palette`; README badges are sibling work.

## Inventory

Read, in order:

1. Live `packages/core/src/types.ts` registries and `ActionInputsSchema`.
2. `packages/integrations/src/<id>/` and the integrations barrel.
3. `packages/plugins/src/<pack>/plugin.ts` and declared widgets.
4. `packages/bits/src/index.ts` and the frozen 11 source files.
5. `packages/themes/src/registry.ts` and family sources.
6. The four OpenSpec contracts.

Do not paste a closed pack-id table into output or this skill.

## Ranking

1. Typed catalog id with missing implementation.
1b. Existing pack missing pack-level `bitsUsed`; `kind=pack`,
    `handoff=author-plugin`, `openspec=no`. Apply to whichever live pack the
    re-read shows; never freeze one pack id as the hole.
2. Missing member of the frozen 11 bits; `kind=bit`,
   `handoff=author-bit`, `openspec=no`. An entirely present bit tree does not
   produce this row.
2b. Incomplete named palette already present in the live theme registry;
    `kind=palette`, `handoff=author-palette`, `openspec=no`.
3. Card needs a data source that is absent; `kind=integration` first.
4. New card fits an existing pack; `kind=widget`.
5. Requested capability fits no existing pack; `kind=pack`, with OpenSpec for
   a new id.
6. An explicitly requested new bit or palette id is OpenSpec-gated; honor the
   named kind and route to the matching skill.

Named kinds bypass unprompted ranking unless a lock fires.

## Theme and badge decisions

- `Theme bit` → `kind=bit`, `author-bit`.
- yaml theme / flavor / palette / tokens → `kind=palette`, `author-palette`.
- bare `theme` with no destination → return to the author gallery.
- in-card `Chip` → `kind=bit`, `author-bit`.
- Shields.io README image → sibling README tooling; do not rank it here.
- badge-fetching pack → OpenSpec, integration, pack, then widget.

## Output

| Column | Content |
| --- | --- |
| `kind` | one of bit, palette, integration, widget, pack |
| `why` | live file and registry evidence |
| `target` | repo-root destination |
| `openspec` | `yes` plus capability, or `no` |
| `handoff` | one of the five specialized skills |

Print one top row and 1–2 runners-up. Stop after naming the top handoff.

## Locks

Refuse without substitute inventory: MCP, flattened Action inputs,
unauthenticated GitHub, REST `/languages`, `openspec --json`, parent-traversal
destinations, and a second pack for an existing first-party id.
