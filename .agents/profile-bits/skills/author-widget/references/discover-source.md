# discoverSource

Single function in `packages/core/src/discover-source.ts`. Signature:

```ts
discoverSource({ path, filename, mime, body })
```

Surfaces: widget package load, Action, playground paste/drop, `just render`,
this skill. Do not fork a second heuristic in docs or templates.

Prefer **omit** `source` when the canonical filename discovers correctly.

## 1. Explicit `source`

If set, it is the kind (`react` | `md` | `mdx` | `html`). Still validate
against discovered bytes. Mismatch fails:

```text
source mismatch: declared react, discovered md
```

Do not write `source` unless the user asked to override discovery.

## 2. Path / filename (first, case-insensitive)

| Extension | Kind |
| --- | --- |
| `.tsx` `.jsx` `.ts` `.js` `.mts` `.cts` | `react` |
| `.mdx` | `mdx` |
| `.md` `.markdown` `.mdown` | `md` (step 4 may promote to `mdx`) |
| `.html` `.htm` | `html` (`fromHtml`) |

Canonical widget-dir entries (exactly one kind allowed unless `source` is
set): `widget.tsx` | `widget.mdx` | `widget.md` | `widget.html`.
(`widget.jsx` is accepted as react.) Also accept `index.*` / `render.tsx` /
`source.md(x)` **only if** `widget.*` is absent.

## 3. MIME (playground paste / upload)

| MIME | Kind |
| --- | --- |
| `text/jsx` `text/tsx` `application/javascript` | `react` |
| `text/mdx` | `mdx` |
| `text/markdown` | `md` |
| `text/html` | `html` |

If paste + filename disagree, filename wins unless sniff promotion applies.

## 4. Content sniff

Used when there is no extension, or when the path/MIME is `.md` /
`text/markdown` (promotion).

| Kind | Signals |
| --- | --- |
| `react` | ESM/JSX module: `import` / `export` / `function` plus JSX (`<[A-Z]`, `tw=`, `return (` with `<`) |
| `mdx` | Markdown **and** (`import`/`export` at line start, JSX `<PascalCase`, or `{expr}` that is not a `{#id}` attribute) |
| `md` | CommonMark/GFM without those MDX markers |
| `html` | Leading `<!doctype html>` / `<html` / a root tag without markdown headings |
| fail | `could not discover source; use .md, .mdx, .tsx or set source` |

## `.md` promotion

If the path says markdown but sniff says MDX, discover **`mdx`** and record
`promotedFrom: 'md'`. Do not compile JSX-in-`.md` through the md-only
pipeline.

## Conflicts

Two canonical entries of different kinds and no `source` → fail:

```text
ambiguous widget entries: widget.md and widget.tsx
```

Do not ship two canonical `widget.*` files in the same widget dir.

## Authoring defaults

| Widget | File | `source` field |
| --- | --- | --- |
| `stats` / `languages` | `widget.tsx` | omit |
| new React card | `widget.tsx` | omit |
| new MD card | `widget.md` | omit (no import/export/JSX) |
| new MDX card | `widget.mdx` | omit |
| new HTML card | `widget.html` | omit |
| drop-in MDX | `widget.mdx` | omit |

`demo` may keep extra **fixtures** (`demo.md` / `demo.mdx`) for discovery
and exclusive-family isolation. Those are not second canonical `widget.*`
entries.
