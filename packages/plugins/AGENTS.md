# @profile-bits/plugins

First-party packs follow live `FIRST_PARTY_PLUGIN_IDS` in `packages/core/src/types.ts`: **`github`**, **`wakatime`**, **`rss`**, **`http`**, **`spotify`**, **`leetcode`**, **`chess`**, and **`steam`**. GitHub widgets: **`demo`** (opt-in / playground smoke), **`stats`** and **`languages`** (defaults when the plugin is on with no widget list), **`repo`**, **`top-repos`**, and **`contributions`** (opt-in). WakaTime widgets: **`coding`** (default) plus opt-in **`editors`**, **`projects`**, **`os`**, **`langs`**. Rss widgets: **`feed`** (default; required https `url`) and opt-in **`latest`**. Http widgets: **`json`** (required https `url`) and **`chips`** (required `preset` + `types`; no `url`/`headers`/`bits`); `plugins.http: {}` is widget-less. Spotify widgets: **`now-playing`** (default) and opt-in **`top`**. LeetCode widgets: **`solved`** (default) and opt-in **`heatmap`**. Chess widgets: **`ratings`** (default) and opt-in **`game`** (integrations `chesscom` and `lichess`; widget id is not `stats`). Steam widgets: **`player`** (default) and opt-in **`recent`**.

A new widget is not a new plugin. A new integration is not a new plugin. Do not invent first-party packs beyond live `FIRST_PARTY_PLUGIN_IDS`.

## Widgets

- **No HTTP** in widgets. Consume the cached integration payload.
- `demo` → `static` only. `stats` / `languages` / `repo` / `top-repos` / `contributions` → `github`. `coding` / `editors` / `projects` / `os` / `langs` → `wakatime`. `feed` / `latest` → `rss`. `json` / `chips` → `http`. `now-playing` / `top` → `spotify`. `solved` / `heatmap` → `leetcode`. `ratings` / `game` → `chesscom` and `lichess`. `player` / `recent` → `steam`.
- Card 480×160. Default format svg (baked still). Empty languages → “No language data”. Empty repo → “No repo data”. Empty top-repos → “No repositories”. Empty coding → “No coding data”. Empty feed → “No feed items”. Empty json after successful jmespath → “No data”. Empty chips → “No data”. Empty now-playing → “No now playing”. Empty top tracks → “No top tracks”. Empty solved → “No solved data”. Empty heatmap → “No submissions” (zero-count days omitted). Empty ratings → “No ratings data”. Empty game → “No game data”. Empty player → “No player”. Empty recent → “No recent games”. `0` and `false` render when the dump has them. Do not invent `0` for omitted include keys.
- Layout: `packages/plugins/src/github/widgets/{demo,stats,languages,repo,top-repos,contributions}/`, `packages/plugins/src/wakatime/widgets/{coding,editors,projects,os,langs}/`, `packages/plugins/src/rss/widgets/{feed,latest}/`, `packages/plugins/src/http/widgets/{json,chips}/`, `packages/plugins/src/spotify/widgets/{now-playing,top}/`, `packages/plugins/src/leetcode/widgets/{solved,heatmap}/`, `packages/plugins/src/chess/widgets/{ratings,game}/`, `packages/plugins/src/steam/widgets/{player,recent}/`, each with its pack `plugin.ts`. Elbow packs are not re-exported from the plugins barrel.
- Do not import `takumi-js` / `@takumi-rs/*` directly; use `@profile-bits/renderer`.

## Forbidden

- Do **not** edit `packages/core/**` except an OpenSpec change that already owns `packages/core/src/types.ts`. Live `FIRST_PARTY_*` already includes spotify, leetcode, chess, steam, and their widgets and integrations. Do not append ids beyond that catalog from a widget edit.
- Do **not** edit root `action.yml` (thin codegen owns it).
- Do **not** add flattened `plugin_*_*_*` Action inputs. No `plugin_wakatime`, `plugin_rss`, or `plugin_http` bool.
- Do **not** delete `src/author-skill-templates.test.ts`; it greps `.agents` templates + `ci.yml` via `import.meta.url`.
