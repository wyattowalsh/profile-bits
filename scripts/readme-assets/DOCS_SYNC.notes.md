# Docs sync notes (Lane C)

Sidecar only. Parent decides whether to apply. Do **not** redesign the Fumadocs app.

## Verdict

| Surface | vs live types / `action.yml` / AGENTS locks | Drift? |
| --- | --- | --- |
| `apps/docs/public/llms.txt` (from `apps/docs/src/llms/llms-txt.ts`) | Four packs + widget ids; Action delivery vs local CLI vs playground vs catalog vs gist; yaml SSOT; no flattened inputs | **No hard contradiction.** Mild stub gap: thin-input list omits live `wakatime_token`, `http_token_env`, `allow_skipped`, `committer_*`, `output_condition`, `timezone`. Tests treat this as a stub, not a full `action.yml` dump. |
| `apps/docs/app/page.tsx` (homepage) | “The v0 first-party pack is `github` only (`demo`, `stats`, `languages`).” | **Yes — drift.** Live `FIRST_PARTY_PLUGIN_IDS` = `github`, `wakatime`, `rss`, `http`. |
| `apps/docs/app/docs/page.tsx` | Title/description: “v0 ships one first-party plugin: github…” | **Yes — same drift.** |
| `apps/docs/app/generate/catalog/page.tsx` | Lede: first-party gallery for the **github** pack (`demo`/`stats`/`languages`), not a marketplace. `catalogEntries()` uses `PREVIEW_WIDGET_IDS` (github widgets only). `PREVIEW_PLUGIN_IDS` is `["github", "http"]` but catalog still indexes github widgets. | **Partial.** “Not a marketplace” matches README. “v0 github-only gallery” understates live packs. Do not expand into a marketplace UI. |
| Playground | Docs `AGENTS.md`: `/playground/github`, `/playground/http`; fixtures only; `POST /api/preview` is layout preview. | Aligns with README (no embed API). `DESIGN.md` still says `PREVIEW_PLUGIN_IDS` is github only and “Don't add `/playground/http` UI” — **DESIGN lag**, not homepage copy. |

## Minimal sync (recommended)

Homepage still saying **“v0 github only”** will contradict the merged README. Smallest honest edits (copy only):

1. **`apps/docs/app/page.tsx`** — Replace the “v0 first-party pack is github only” sentence with the live pack sentence already used in `llms.txt` / `AGENTS.md`: four packs (`github` / `wakatime` / `rss` / `http`) with live widget ids. Keep the rest (Action delivery, `just render` not an embed API, 480×160, Takumi vs docs chrome).
2. **`apps/docs/app/docs/page.tsx`** — Stop claiming github is the only plugin. Keep the page as **github pack usage** (that route can stay github-scoped). Change metadata/description from “v0 ships one first-party plugin” to “github pack: `demo`, `stats`, `languages`” plus a one-liner that other first-party packs exist.
3. **Catalog (optional, still minimal)** — One lede clause: gallery currently shows github widgets; first-party packs also include `wakatime` (`coding`), `rss` (`feed`), `http` (`json`, `chips`). Do **not** rebuild catalog routing or add a plugin store.

**Skip unless parent wants stub completeness:** adding `wakatime_token` / `http_token_env` to the `llms.txt` thin-input sentence. Not required for README merge; `llms.txt` already lists all four packs.

**Out of scope for this merge:** playground redesign, new docs framework, documenting `POST /api/preview` as an embed API, flattening Action inputs, inventing a public docs URL.

## Related (not docs-app) conflicts for parent

| Source | Issue |
| --- | --- |
| `git remote` | `wyattowalsh/profile-bits`. Consumer pin is `wyattowalsh/profile-bits@v1` (never `wyatt/`). |
| Tags | No `v1` / `v1.*` in this clone. Draft says pin a published orphan release tag, never `main`. |
| `DESIGN.md` Catalog table | `http` widgets listed as `json` only; live types include `chips`. “Code vs archived spec” engine-hole prose may lag `packages/action/AGENTS.md` (engine enumerates github + `coding` + `json` + `chips` + `feed`). |
| Root `AGENTS.md` Locks | Abbreviated thin-input list vs full live `action.yml` (draft documents the generated file). |
| Live `README.md` | ~22-line stub (Fumadocs/shadcn notes + “questions”). **Not edited** by Lane C. |

## Lane C confirmation

- Wrote `scripts/readme-assets/README.draft.md` only (plus this notes file).
- Did **not** edit live `README.md`.
- Did **not** commit or push.
- Did **not** add a second docs framework.
