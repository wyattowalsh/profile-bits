## 1. OpenSpec artifacts (W2-HTTP-01)

- [x] 1.1 Exclusive: `openspec/changes/widen-http/proposal.md`. Json full JSON; chips raw `{label,message,color,name,value,link}`; chips GET `auth: none`. No flatten. No live `author-integration add` for github/wakatime/rss/http. Do not rewrite `docs-full-catalog-playground`.
- [x] 1.2 Exclusive: `openspec/changes/widen-http/design.md`. Dump vs widget reader; later nodes own `client.ts` / fixtures / widgets. No Playwright. No `v1` on `main`.
- [x] 1.3 Exclusive: `specs/integration-contract/spec.md`. ADDED json-full-JSON + chips-raw-badge-JSON. MODIFIED chips reuse (no fetch-time normalize), expander (cache keeps `link`/`value`), HTTP matrix (jmespath widget-side).
- [x] 1.4 Exclusive: `specs/widget-contract/spec.md`. ADDED json `jmespath` reader + chips normalize reader. MODIFIED frozen json/chips, chip chrome (ignore `link` at render, keep on dump), fail_widget matrix.
- [x] 1.5 `pnpm exec openspec validate --strict --type change widen-http`. Do not archive. Do not edit `openspec/specs/**`.

## 2. Tests (W2-HTTP-01)

- [x] 2.1 Exclusive: `scripts/widen-http.test.ts`. Assert change files name full JSON dump, chips raw badge fields, chips GET `auth: none`, widget-side jmespath/normalize, forbid `plugin_*_*_*` and `author-integration add` on live dests, and keep shieldcn fixture `link`/`value`.

## 3. Later apply (not this node)

- [x] 3.1 W2-HTTP-02: payload types for json full JSON and chips raw badge JSON under `packages/integrations/src/http/**`. Optional schema MUST NOT drop keys. Do not flatten Action inputs.
- [x] 3.2 W2-HTTP-03: extend live `client.ts`; no extra vendor client; no octokit; chips GET `auth: none`; origins `shieldcn.dev` + `img.shields.io`. MUST NOT `author-integration add` http.
- [x] 3.3 W2-HTTP-04: chips fixtures keep `link`/`value` (and shields `name`/`value`) in the cached dump.
- [x] 3.4 W2-HTTP-05: json JMESPath stays widget-side; `normalizeBadgeJson` stays a widget reader; template still uses `label`/`message`/`color`.
- [x] 3.5 W2-HTTP-06: dump tests; chips auth none; zero live network; no Playwright in the Action.
- [x] 3.6 `pnpm exec openspec validate --strict --type change widen-http` after apply. Do not archive from a types-only node. Do not commit. Do not tag `v1` at `main`. Do not treat `POST /api/preview` as an embed API.
