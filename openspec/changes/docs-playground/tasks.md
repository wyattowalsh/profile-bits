## 1. T130a Fumadocs app

- [ ] 1.1 Scaffold the Fumadocs + shadcn + Tailwind docs app under `apps/docs` (layout, nav hrefs `/playground` and `/generate`, MDX docs chrome). FORBIDDEN: `source.config.*`, `llms.txt`, `app/playground/**`, `app/api/preview/**`, `src/preview/**`, `src/codegen/**`, `src/generate/**`.
- [ ] 1.2 Docs chrome MUST NOT be the README widget runtime (no Radix/shadcn DOM primitives inside Takumi output). Card size remains 480×160 in docs copy. v0 pack is `github` only.

## 2. T130b llms.txt

- [ ] 2.1 Add `llms.txt` derived from plugin/widget option schemas (stub allowed; MUST NOT be a hand-copied option list). FORBIDDEN: `source.config.ts`, playground/preview/export files owned by T130a/T310/T311*/T312.
- [ ] 2.2 Verify `llms.txt` lists github widgets `demo`, `stats`, and `languages` from schemas, not a parallel hardcoded table.

## 3. T130c source.config

- [ ] 3.1 Implement `apps/docs/source.config.ts` for Fumadocs MDX source. FORBIDDEN: `llms.txt`, playground/preview/export implementation files.

## 4. T310 preview

- [ ] 4.1 Implement `POST /api/preview` (`app/api/preview/**` plus `src/preview/**` server). Accept POST body `{ scope, options, format, theme, output_pair, user }` with no token fields. Reject GET. Send `Cache-Control: no-store` and `X-Robots-Tag: noindex`. Response `{ files: { id, mime, bytesBase64, filename }[], provenance, generatedAt }`. `runtime = nodejs`. FORBIDDEN: `export-workflow.ts`, `readme-mode.*`, `/generate` UI.
- [ ] 4.2 When no GitHub App token is configured, wrap T110 `static` fixtures only (no second JSON pack), send **zero outbound GitHub** requests, and set `provenance: fixture`. NEVER unauthenticated GitHub.
- [ ] 4.3 When an App token exists, cache GitHub by login with TTL; one github client per request; reuse core `auth-policy`. On 403/rate-limit, fall back to fixtures with `provenance: rate_limited`. `include_private` without `canPrivate` MUST fail that widget. Still frames MAY use docs-only `ImageResponse`; `gif` / `apng` / animated `webp` MUST return `renderAnimation` bytes (`apng` as `image/png`). NEVER log visitor tokens.
- [ ] 4.4 Add tests: GET rejected; no App token → fixtures and zero GitHub; POST omits token fields; `no-store` / `noindex` headers; motion formats are `renderAnimation` bytes not a CSS-fake PNG.

## 5. T311a export-workflow

- [ ] 5.1 Implement `src/codegen/export-workflow.ts` only: emit thin workflow YAML (thin `action.yml` inputs, `on: schedule` + `workflow_dispatch`) and `.github/profile-bits.yml` from playground state. MUST NOT emit flattened `plugin_<plugin>_<widget>_<option>` inputs. MUST NOT put tokens in generated YAML. FORBIDDEN: `readme-mode.*`, `app/api/preview/**`, T311b UI files.
- [ ] 5.2 Add tests: yaml + thin workflow round-trip; generated workflow has no `plugin_github_stats_include` or other `plugin_*_*_*` inputs; tokens absent from output.

## 6. T311b playground UI

- [ ] 6.1 Implement playground UI (`app/playground/**` and codegen chrome except `readme-mode.*` and `export-workflow.ts`): routes `/playground` → `/playground/github` and `/playground/github/[widget]`; three columns (left plugin → widget checkboxes → schema forms → integration panel; center Takumi preview + theme toggle + pair mode + format picker including gif/apng/animated webp; right three copy targets). Primary CTA Copy (no Download/Share primary). Permalink `URLSearchParams` only; never tokens in the URL. Visitor-pasted tokens in `sessionStorage` only. Source paste/drop MUST call core `discoverSource` (no forked heuristic). Cross-link to `/generate` strips tokens.
- [ ] 6.2 Schema forms MUST come from the same plugin/widget schemas as yaml/codegen (`getPlaygroundFields()`), not a hand-authored option table. FORBIDDEN: `readme-mode.*`, `export-workflow.ts`, `packages/**`.
- [ ] 6.3 Add tests: landing redirect; three copy targets present; permalink round-trip without tokens; format picker includes gif/apng/animated webp; Copy is primary CTA.

## 7. T312 readme-mode

- [ ] 7.1 Implement `readme-mode.*`: dual-pane README mode showing actual `renderSvg` / `renderAnimation` bytes plus a constraint checklist (baked still SVG, no CSS/SMIL README promise, APNG-as-png, 480×160, relative `![](./profile-bits/…)`). MUST NOT claim to be a Camo or `?sanitize=true` oracle. FORBIDDEN: `export-workflow.ts`, T310 route files, T311b-owned UI except the README-mode slot.
- [ ] 7.2 Add tests: README mode displays baked bytes (not a CSS loop on a still PNG); checklist present; copy does not mention Camo as an XML rewriter.
