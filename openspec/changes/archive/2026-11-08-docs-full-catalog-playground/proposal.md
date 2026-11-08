## Why

The docs app was frozen as github-only codegen plus a fixtures-only chips sidecar. Visitors could not playground or catalog wakatime, rss, or http json, and DESIGN still described that freeze. The product already ships four packs and eight widgets; the site must show them as a real playground and visual library with non-empty cards.

## What Changes

- Docs playground serves `/playground/{plugin}` and `/playground/{plugin}/[widget]` for `github`, `wakatime`, `rss`, and `http`. `/playground` still redirects to `/playground/github`.
- Plugin selector is real. Widget checkboxes and schema tuners are per pack. Do not dump `coding` / `feed` / `json` / `chips` into github widget ids.
- `/generate/catalog` lists all four packs and eight widgets. Widget index uses each pack’s `bitsUsed`. Visual generator routes exist per pack. Bits index shows samples. Themes library lists the 47 named ids.
- Default preview is non-empty fixtures (octocat, WakaTime `last_7_days`, Atom feed, `chipFixture` / json sample). Empty-state copy stays for empty payloads only.
- Optional live: GitHub via server `GITHUB_APP` / `GITHUB_APP_TOKEN` (existing). WakaTime via server preview token env. rss/json/chips via existing SSRF / origin-allowlist clients when the visitor typed a live url (or chips live env). Never unauthenticated GitHub. Preview POST still omits token fields. `GET /api/preview` stays rejected.
- `POST /api/preview` remains layout preview, not a public embed API.

## Capabilities

### New Capabilities

- (none — docs surfaces only; no fifth pack, no new widget id, no new integration id)

### Modified Capabilities

- `playground`: all four packs; github widget list includes `repo`; plugin selector is real.
- `http-chips-playground`: http is a first-class playground pack (`json` + `chips`); fixtures remain the no-network default.
- `integration-contract`: allow `/playground/rss`; keep fixture default and do not add `feed` to github widget ids.

## Impact

- Specs: MODIFIED deltas under this change. Do not edit `openspec/specs/**` until archive. Do not edit `openspec/changes/marketplace-release/**` or `openspec/changes/add-github-repo-widget/**`.
- Code: `apps/docs/**`, playground field groups in `packages/core/src/codegen/docs-fields.ts`, DESIGN.md, `apps/docs/AGENTS.md`. Widgets still fetch none. No flattened Action inputs. No `v1` tag.
