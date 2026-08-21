/**
 * Rasterize README showcase PNGs through `@profile-bits/renderer` (Takumi).
 *
 * From the repo root:
 *   ./packages/cli/node_modules/.bin/tsx --tsconfig scripts/tsconfig.json scripts/render-readme-assets.ts
 *
 * Widgets are existing JSX/templates + committed fixtures. No live GitHub,
 * WakaTime, feeds, or shield fetches. This file does not import takumi-js.
 */
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Chip,
  Frame,
  Muted,
  Theme,
  useBitTheme,
} from "../packages/bits/src/index.ts";
import { resolveChipColor } from "../packages/integrations/src/http/colors.ts";
import { chipFixture } from "../packages/integrations/src/http/fixtures/chips/index.ts";
import {
  type NormalizedBadge,
  normalizeBadgeJson,
} from "../packages/integrations/src/http/normalize.ts";
import { loadFixture } from "../packages/integrations/src/rss/loadFixture.ts";
import { parseRssXml } from "../packages/integrations/src/rss/parse.ts";
import { getStaticFixtures } from "../packages/integrations/src/static/fixtures.ts";
import {
  selectCodingPayload,
  WakatimeStatsEnvelopeSchema,
} from "../packages/integrations/src/wakatime/payload.ts";
import { githubPreviewNode } from "../packages/plugins/src/github/preview.ts";
import {
  isEmptyJsonResult,
  searchJson,
} from "../packages/plugins/src/http/widgets/json/jmes.ts";
import { jsonTemplate } from "../packages/plugins/src/http/widgets/json/template.ts";
import { feedTemplate } from "../packages/plugins/src/rss/widgets/feed/template.ts";
import { codingTemplate } from "../packages/plugins/src/wakatime/widgets/coding/template.ts";
import { toCodingViewModel } from "../packages/plugins/src/wakatime/widgets/coding/view-model.ts";
import React, {
  createElement,
  type ReactElement,
} from "../packages/renderer/node_modules/react/index.js";
import {
  DARK_THEME,
  fromJsx,
  LIGHT_THEME,
  type Node,
  render,
  type ThemePalette,
} from "../packages/renderer/src/index.ts";
import { element as architectureElement } from "./readme-assets/architecture.ts";
import { element as cliVsActionElement } from "./readme-assets/cli-vs-action.ts";
import { element as formatsElement } from "./readme-assets/formats.ts";
import { element as heroElement } from "./readme-assets/hero.ts";
import { element as howItWorksElement } from "./readme-assets/how-it-works.ts";
import { element as locksElement } from "./readme-assets/locks.ts";
import { element as pluginMapElement } from "./readme-assets/plugin-map.ts";
import { assertPng, dataPng, rasterPng } from "./readme-assets/raster.ts";
import type { Composition, ThemeName } from "./readme-assets/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "docs/assets/readme");
const CARD_WIDTH = 480;
const CARD_HEIGHT = 160;

const CHIP_TYPES = [
  "npm",
  "stars",
  "forks",
  "license",
  "release",
  "ci",
] as const;

const WAKATIME_FIXTURE = join(
  ROOT,
  "packages/integrations/src/wakatime/fixtures/last_7_days.json",
);

const STATS_INCLUDE = [
  "followers",
  "repos",
  "stars",
  "forks",
  "gists",
] as const;

type AssetRow = {
  path: string;
  width: number;
  height: number;
  bytes: number;
  plugin: string;
  widget: string;
  fixture: string;
  alt: string;
};

function palette(theme: ThemeName): ThemePalette {
  return theme === "light" ? LIGHT_THEME : DARK_THEME;
}

const NO_CHIPS_DATA = "No data";

function ChipsBody({
  badges,
}: {
  badges: readonly NormalizedBadge[];
}): ReactElement {
  const theme = useBitTheme();
  if (badges.length === 0) {
    return createElement(
      "div",
      {
        tw: "w-full h-full flex",
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      createElement(Muted, null, NO_CHIPS_DATA),
    );
  }
  return createElement(
    "div",
    {
      tw: "w-full h-full flex flex-wrap",
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        alignContent: "center",
        alignItems: "center",
        gap: 8,
        padding: 8,
      },
    },
    ...badges.map((badge) =>
      createElement(Chip, {
        key: `${badge.label}:${badge.message}:${badge.color ?? ""}`,
        label: badge.label,
        message: badge.message,
        messageColor: resolveChipColor(badge.color, theme.accent),
      }),
    ),
  );
}

function chipsElement(
  badges: readonly NormalizedBadge[],
  theme: ThemeName,
): ReactElement {
  return createElement(
    Theme,
    { theme },
    createElement(Frame, null, createElement(ChipsBody, { badges })),
  );
}

async function rasterCard(node: Node): Promise<Uint8Array> {
  return render(node, "png");
}

async function writeAsset(
  name: string,
  bytes: Uint8Array,
  width: number,
  height: number,
  meta: Omit<AssetRow, "path" | "width" | "height" | "bytes">,
): Promise<AssetRow> {
  assertPng(bytes, width, height);
  const path = join(OUT_DIR, name);
  await writeFile(path, bytes);
  const row: AssetRow = {
    path: join("docs/assets/readme", name),
    width,
    height,
    bytes: bytes.byteLength,
    ...meta,
  };
  console.log(
    `${row.path}\t${row.width}×${row.height}\t${row.bytes} bytes\t${row.plugin}/${row.widget}`,
  );
  return row;
}

function loadCodingPayload() {
  const envelope = WakatimeStatsEnvelopeSchema.parse(
    JSON.parse(readFileSync(WAKATIME_FIXTURE, "utf8")) as unknown,
  );
  return selectCodingPayload(envelope.data, ["languages", "editors"], 8);
}

function optionalDataPng(name: string): string | undefined {
  try {
    return dataPng(readFileSync(join(OUT_DIR, name)));
  } catch {
    return undefined;
  }
}

async function writeChrome(
  name: string,
  composition: Composition,
  theme: ThemeName,
  width: number,
  height: number,
  extras: Parameters<Composition>[1],
  meta: Omit<AssetRow, "path" | "width" | "height" | "bytes">,
): Promise<AssetRow> {
  const node = await fromJsx(composition(theme, extras));
  const bytes = await rasterPng(node, width, height);
  return writeAsset(name, bytes, width, height, meta);
}

function manifestMarkdown(rows: readonly AssetRow[]): string {
  const dark = rows.filter((row) => !row.path.includes("-light.png"));
  const light = rows.filter((row) => row.path.includes("-light.png"));
  const table = (list: readonly AssetRow[]) =>
    [
      "| Path | Pixels | Bytes | Plugin / widget | Fixture | Alt text |",
      "| --- | ---: | ---: | --- | --- | --- |",
      ...list.map(
        (row) =>
          `| \`${row.path}\` | ${row.width}×${row.height} | ${row.bytes} | ${row.plugin} / ${row.widget} | ${row.fixture} | ${row.alt} |`,
      ),
    ].join("\n");
  return `# README asset manifest

Takumi-rasterized stills for the GitHub README showcase. Dark is default. Light is the \`light-*\` pair. No live GitHub, WakaTime, feeds, or shield fetches.

## Dark (default)

${table(dark)}

## Light pair

${table(light)}
`;
}

async function main(): Promise<void> {
  Object.assign(globalThis, { React });
  await mkdir(OUT_DIR, { recursive: true });

  const fixtures = getStaticFixtures();
  const codingPayload = loadCodingPayload();
  const feedItems = parseRssXml(loadFixture("rss2.xml"));
  const jsonPayload = {
    login: fixtures.user.login,
    followers: fixtures.stats.followers,
    repos: fixtures.stats.repos,
  };
  const chipPayloads = CHIP_TYPES.map((type) => chipFixture("shieldcn", type));
  const rows: AssetRow[] = [];

  for (const theme of ["dark", "light"] as const) {
    const suffix = theme === "light" ? "-light" : "";
    const themePalette = palette(theme);

    const demoNode = await githubPreviewNode({
      widget: "demo",
      theme,
      payload: fixtures,
      options: { demo: { subtitle: fixtures.user.bio } },
    });
    rows.push(
      await writeAsset(
        `github-demo${suffix}.png`,
        await rasterCard(demoNode),
        CARD_WIDTH,
        CARD_HEIGHT,
        {
          plugin: "github",
          widget: "demo",
          fixture: "packages/integrations/src/static/fixtures/octocat.json",
          alt: "profile-bits demo card, octocat static fixture",
        },
      ),
    );

    const statsNode = await githubPreviewNode({
      widget: "stats",
      theme,
      payload: fixtures,
      options: {
        stats: {
          avatar: false,
          include: [...STATS_INCLUDE],
        },
      },
    });
    const statsBytes = await rasterCard(statsNode);
    rows.push(
      await writeAsset(
        `github-stats${suffix}.png`,
        statsBytes,
        CARD_WIDTH,
        CARD_HEIGHT,
        {
          plugin: "github",
          widget: "stats",
          fixture:
            "octocat.json (avatar omitted, include followers/repos/stars/forks/gists)",
          alt: "octocat GitHub stats card: followers, repos, stars, forks, gists",
        },
      ),
    );

    const languagesNode = await githubPreviewNode({
      widget: "languages",
      theme,
      payload: fixtures,
      options: { languages: { limit: 4 } },
    });
    const languagesBytes = await rasterCard(languagesNode);
    rows.push(
      await writeAsset(
        `github-languages${suffix}.png`,
        languagesBytes,
        CARD_WIDTH,
        CARD_HEIGHT,
        {
          plugin: "github",
          widget: "languages",
          fixture: "packages/integrations/src/static/fixtures/octocat.json",
          alt: "language mix card from octocat fixture bytes",
        },
      ),
    );

    const helloWorld = fixtures.repos[0];
    if (helloWorld == null) {
      throw new Error("octocat fixture missing repos[0]");
    }
    const repoNode = await githubPreviewNode({
      widget: "repo",
      theme,
      payload: {
        ...fixtures,
        repository: {
          ...helloWorld,
          ownerAvatarUrl: fixtures.user.avatarUrl,
        },
      },
      options: { repo: { repo: helloWorld.fullName } },
    });
    rows.push(
      await writeAsset(
        `github-repo${suffix}.png`,
        await rasterCard(repoNode),
        CARD_WIDTH,
        CARD_HEIGHT,
        {
          plugin: "github",
          widget: "repo",
          fixture: "octocat.json repos[0] Hello-World (no live GET /repos)",
          alt: "octocat Hello-World GitHub repo card from the static fixture",
        },
      ),
    );

    const codingNode = codingTemplate(
      toCodingViewModel(codingPayload, ["languages", "editors"], 8),
      themePalette,
    );
    rows.push(
      await writeAsset(
        `wakatime-coding${suffix}.png`,
        await rasterCard(codingNode),
        CARD_WIDTH,
        CARD_HEIGHT,
        {
          plugin: "wakatime",
          widget: "coding",
          fixture:
            "packages/integrations/src/wakatime/fixtures/last_7_days.json",
          alt: "WakaTime coding stats for the last 7 days, fixture payload",
        },
      ),
    );

    const feedNode = feedTemplate(feedItems.slice(0, 5), themePalette);
    rows.push(
      await writeAsset(
        `rss-feed${suffix}.png`,
        await rasterCard(feedNode),
        CARD_WIDTH,
        CARD_HEIGHT,
        {
          plugin: "rss",
          widget: "feed",
          fixture: "packages/integrations/src/rss/fixtures/rss2.xml",
          alt: "RSS feed card from the rss2.xml fixture",
        },
      ),
    );

    const jsonValue = searchJson(jsonPayload, "@");
    const jsonNode = jsonTemplate({
      value: jsonValue,
      empty: isEmptyJsonResult(jsonValue),
      url: "https://example.com/octocat.json",
      theme: themePalette,
    });
    rows.push(
      await writeAsset(
        `http-json${suffix}.png`,
        await rasterCard(jsonNode),
        CARD_WIDTH,
        CARD_HEIGHT,
        {
          plugin: "http",
          widget: "json",
          fixture: "octocat.json user/stats fields (no live HTTP)",
          alt: "HTTP JSON card showing octocat login, followers, and repos",
        },
      ),
    );

    const chipsNode = await fromJsx(
      chipsElement(
        chipPayloads.map((payload) => normalizeBadgeJson(payload)),
        theme,
      ),
    );
    const chipsBytes = await rasterCard(chipsNode);
    rows.push(
      await writeAsset(
        `http-chips${suffix}.png`,
        chipsBytes,
        CARD_WIDTH,
        CARD_HEIGHT,
        {
          plugin: "http",
          widget: "chips",
          fixture:
            "packages/integrations/src/http/fixtures/chips/shieldcn/{npm,stars,forks,license,release,ci}.json",
          alt: "HTTP chips card from shieldcn fixtures",
        },
      ),
    );

    const markSrc = optionalDataPng(
      theme === "light" ? "mark-light.png" : "mark.png",
    );
    const grainSrc =
      theme === "dark" ? optionalDataPng("grain.png") : undefined;

    rows.push(
      await writeChrome(
        `hero${suffix}.png`,
        heroElement,
        theme,
        1200,
        400,
        {
          sampleSrcs: {
            stats: dataPng(statsBytes),
            languages: dataPng(languagesBytes),
            chips: dataPng(chipsBytes),
          },
          markSrc,
          grainSrc,
        },
        {
          plugin: "readme",
          widget: "hero",
          fixture: "bits + scaled stats/languages/chips stills",
          alt: "profile-bits README hero: JSX to PNG GitHub profile widgets",
        },
      ),
    );

    const chrome: Array<{
      name: string;
      composition: Composition;
      width: number;
      height: number;
      widget: string;
      alt: string;
    }> = [
      {
        name: `how-it-works${suffix}.png`,
        composition: howItWorksElement,
        width: 1200,
        height: 200,
        widget: "how-it-works",
        alt: "yaml SSOT to Takumi engine to committed files",
      },
      {
        name: `plugin-map${suffix}.png`,
        composition: pluginMapElement,
        width: 1200,
        height: 240,
        widget: "plugin-map",
        alt: "first-party packs github wakatime rss http",
      },
      {
        name: `architecture${suffix}.png`,
        composition: architectureElement,
        width: 1200,
        height: 240,
        widget: "architecture",
        alt: "yaml and thin Action inputs through Takumi to widget files",
      },
      {
        name: `locks${suffix}.png`,
        composition: locksElement,
        width: 1200,
        height: 120,
        widget: "locks",
        alt: "no embed API, yaml SSOT, never unauth GitHub, Action commits files",
      },
      {
        name: `formats${suffix}.png`,
        composition: formatsElement,
        width: 1200,
        height: 80,
        widget: "formats",
        alt: "output formats svg png jpeg webp ico gif apng",
      },
      {
        name: `cli-vs-action${suffix}.png`,
        composition: cliVsActionElement,
        width: 1200,
        height: 120,
        widget: "cli-vs-action",
        alt: "CLI output_action none versus Marketplace commit",
      },
    ];

    for (const item of chrome) {
      rows.push(
        await writeChrome(
          item.name,
          item.composition,
          theme,
          item.width,
          item.height,
          undefined,
          {
            plugin: "readme",
            widget: item.widget,
            fixture: "bits + DESIGN.md tokens",
            alt: item.alt,
          },
        ),
      );
    }
  }

  await writeFile(join(OUT_DIR, "MANIFEST.md"), manifestMarkdown(rows));
  console.log(`\n${rows.length} files → ${OUT_DIR}`);
}

await main();
