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
import React, { createElement, type ReactElement } from "react";
import {
  Chip,
  Divider,
  Frame,
  Muted,
  Row,
  Stack,
  Stat,
  Text,
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
import {
  assertTakumiTree,
  DARK_THEME,
  fromJsx,
  getRenderer,
  LIGHT_THEME,
  type Node,
  render,
  type ThemePalette,
} from "../packages/renderer/src/index.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "docs/assets/readme");
const HERO_WIDTH = 1200;
const HERO_HEIGHT = 400;
const CARD_WIDTH = 480;
const CARD_HEIGHT = 160;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

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

type ThemeName = "dark" | "light";

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

function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function assertPng(bytes: Uint8Array, width: number, height: number): void {
  if (bytes.byteLength < 1024) {
    throw new Error(`png too small: ${bytes.byteLength} bytes`);
  }
  const magicOk = PNG_MAGIC.every((value, index) => bytes[index] === value);
  if (!magicOk) {
    throw new Error("not a PNG");
  }
  const size = pngSize(bytes);
  if (size.width !== width || size.height !== height) {
    throw new Error(
      `png ${size.width}×${size.height}, expected ${width}×${height}`,
    );
  }
}

function dataPng(bytes: Uint8Array): string {
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
}

function HeroSample({ src }: { src: string }): ReactElement {
  const theme = useBitTheme();
  return createElement(
    "div",
    {
      tw: "flex",
      style: {
        display: "flex",
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
      },
    },
    createElement("img", {
      src,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      alt: "github stats sample",
      style: { width: CARD_WIDTH, height: CARD_HEIGHT },
    }),
  );
}

const NO_CHIPS_DATA = "No data";

/** Same Frame/Chip wrap as `packages/plugins/src/http/widgets/chips/widget.tsx`. */
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

function heroElement(theme: ThemeName, sampleSrc: string): ReactElement {
  return createElement(
    Theme,
    { theme },
    createElement(
      Frame,
      null,
      createElement(
        "div",
        {
          tw: "w-full h-full flex",
          style: {
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 48,
            paddingRight: 48,
            gap: 40,
          },
        },
        createElement(
          Stack,
          { gap: 14 },
          createElement(
            Row,
            { gap: 8 },
            createElement(Chip, null, "JSX → PNG"),
            createElement(Chip, null, "480×160"),
            createElement(Chip, null, "Geist"),
          ),
          createElement(Text, { size: 40, weight: 700 }, "profile-bits"),
          createElement(
            Muted,
            { size: 16 },
            "GitHub profile widgets, rendered from JSX by Takumi.",
          ),
          createElement(
            Row,
            { gap: 8 },
            createElement(Chip, { label: "pack", message: "github" }),
            createElement(Chip, { label: "pack", message: "wakatime" }),
            createElement(Chip, { label: "pack", message: "rss" }),
            createElement(Chip, { label: "pack", message: "http" }),
          ),
          createElement(Divider),
          createElement(
            Row,
            { gap: 24 },
            createElement(Stat, { label: "canvas", value: "480×160" }),
            createElement(Stat, { label: "ratio", value: "3:1" }),
            createElement(Stat, { label: "engine", value: "Takumi" }),
          ),
        ),
        createElement(HeroSample, { src: sampleSrc }),
      ),
    ),
  );
}

async function rasterCard(node: Node): Promise<Uint8Array> {
  assertTakumiTree(node);
  return render(node, "png");
}

async function rasterHero(node: Node): Promise<Uint8Array> {
  assertTakumiTree(node);
  const renderer = await getRenderer();
  const bytes = await renderer.render(node, {
    width: HERO_WIDTH,
    height: HERO_HEIGHT,
    format: "png",
  });
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
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
      options: { stats: { avatar: false } },
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
            "packages/integrations/src/static/fixtures/octocat.json (avatar omitted, offline)",
          alt: "octocat GitHub stats card: followers, repos, stars",
        },
      ),
    );

    const languagesNode = await githubPreviewNode({
      widget: "languages",
      theme,
      payload: fixtures,
      options: { languages: { limit: 4 } },
    });
    rows.push(
      await writeAsset(
        `github-languages${suffix}.png`,
        await rasterCard(languagesNode),
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
    rows.push(
      await writeAsset(
        `http-chips${suffix}.png`,
        await rasterCard(chipsNode),
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

    const heroNode = await fromJsx(heroElement(theme, dataPng(statsBytes)));
    rows.push(
      await writeAsset(
        `hero${suffix}.png`,
        await rasterHero(heroNode),
        HERO_WIDTH,
        HERO_HEIGHT,
        {
          plugin: "readme",
          widget: "hero",
          fixture: "bits + sampled github-stats PNG",
          alt: "profile-bits README hero: JSX to PNG GitHub profile widgets",
        },
      ),
    );
  }

  console.log(`\n${rows.length} files → ${OUT_DIR}`);
}

await main();
