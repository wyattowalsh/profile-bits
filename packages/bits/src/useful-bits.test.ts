import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DARK_THEME, fromJsx } from "@profile-bits/renderer";
import { readableInk } from "@profile-bits/themes";
import { createElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { AvatarStack } from "./AvatarStack.js";
import { Banner } from "./Banner.js";
import { Callout } from "./Callout.js";
import { Code } from "./Code.js";
import { Compare } from "./Compare.js";
import { Delta, formatDelta } from "./Delta.js";
import { Dot } from "./Dot.js";
import { Duration, formatDuration } from "./Duration.js";
import { Empty } from "./Empty.js";
import { Eyebrow } from "./Eyebrow.js";
import { Figure } from "./Figure.js";
import { BIT_EXPORTS } from "./index.js";
import { KeyValue } from "./KeyValue.js";
import { Legend } from "./Legend.js";
import { formatMeter, Meter, meterPercent } from "./Meter.js";
import { percentShares } from "./mix.js";
import { formatOrdinal, Ordinal } from "./Ordinal.js";
import { Quote } from "./Quote.js";
import { Rating, ratingFilled } from "./Rating.js";
import { formatRelative, Relative } from "./Relative.js";
import { Ring } from "./Ring.js";
import { Sparkline } from "./Sparkline.js";
import { StackBar } from "./StackBar.js";
import { Status } from "./Status.js";
import { Strip } from "./Strip.js";
import { Table } from "./Table.js";
import { Text } from "./Text.js";
import { Theme } from "./Theme.js";
import { Timeline } from "./Timeline.js";
import { Wrap } from "./Wrap.js";

type TakumiNode = {
  type: string;
  text?: string;
  style?: Record<string, unknown>;
  children?: TakumiNode[];
};

const SRC = dirname(fileURLToPath(import.meta.url));
const NOW = "2026-08-16T12:00:00.000Z";
const USEFUL_BITS = [
  "Sparkline",
  "Meter",
  "Duration",
  "Relative",
  "Delta",
  "Ordinal",
  "Quote",
  "Timeline",
  "Empty",
  "Figure",
  "Table",
  "StackBar",
  "Compare",
  "Legend",
  "Code",
  "Callout",
  "Dot",
  "Rating",
  "Strip",
  "Wrap",
  "Ring",
  "AvatarStack",
  "KeyValue",
  "Banner",
  "Eyebrow",
  "Status",
] as const;

const REFUSED = [
  "Cover",
  "Dialog",
  "Toast",
  "Popover",
  "Dropdown",
  "Command",
] as const;

function collectTexts(node: TakumiNode): string[] {
  const texts: string[] = [];
  if (typeof node.text === "string" && node.text.length > 0) {
    texts.push(node.text);
  }
  for (const child of node.children ?? []) {
    texts.push(...collectTexts(child));
  }
  return texts;
}

function findAll(
  node: TakumiNode,
  predicate: (candidate: TakumiNode) => boolean,
): TakumiNode[] {
  const matches: TakumiNode[] = [];
  if (predicate(node)) {
    matches.push(node);
  }
  for (const child of node.children ?? []) {
    matches.push(...findAll(child, predicate));
  }
  return matches;
}

async function render(element: ReactElement): Promise<TakumiNode> {
  return (await fromJsx(
    createElement(Theme, { theme: "dark" }, element),
  )) as TakumiNode;
}

describe("useful bit formatters", () => {
  it("formats durations with the two largest units", () => {
    expect(formatDuration(Number.NaN)).toBe("0s");
    expect(formatDuration(-4)).toBe("0s");
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(59)).toBe("59s");
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(61)).toBe("1m 1s");
    expect(formatDuration(90)).toBe("1m 30s");
    expect(formatDuration(3599)).toBe("59m 59s");
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(3661)).toBe("1h 1m");
    expect(formatDuration(86400)).toBe("1d");
    expect(formatDuration(86400 + 3600 + 60)).toBe("1d 1h");
    expect(formatDuration(90000)).toBe("1d 1h");
  });

  it("formats relative ages against an injected clock", () => {
    expect(formatRelative("not-a-date", NOW)).toBe("not-a-date");
    expect(formatRelative("2026-08-16T10:00:00.000Z", "not-a-date")).toBe(
      "2026-08-16T10:00:00.000Z",
    );
    expect(formatRelative(NOW, NOW)).toBe("just now");
    expect(formatRelative("2026-08-16T11:59:30.000Z", NOW)).toBe("just now");
    expect(formatRelative("2026-08-16T12:00:30.000Z", NOW)).toBe("just now");
    expect(formatRelative("2026-08-16T12:00:44.000Z", NOW)).toBe("just now");
    expect(formatRelative("2026-08-16T11:59:15.000Z", NOW)).toBe("1m");
    expect(formatRelative("2026-08-16T12:00:45.000Z", NOW)).toBe("in 1m");
    expect(formatRelative("2026-08-16T11:58:30.000Z", NOW)).toBe("1m");
    expect(formatRelative("2026-08-16T10:00:00.000Z", NOW)).toBe("2h");
    expect(formatRelative("2026-08-13T12:00:00.000Z", NOW)).toBe("3d");
    expect(formatRelative("2026-08-10T12:00:00.000Z", NOW)).toBe("6d");
    expect(formatRelative("2026-08-09T12:00:00.000Z", NOW)).toBe("1w");
    expect(formatRelative("2026-08-06T12:00:00.000Z", NOW)).toBe("1w");
    expect(formatRelative("2026-07-18T12:00:00.000Z", NOW)).toBe("4w");
    expect(formatRelative("2026-07-17T12:00:00.000Z", NOW)).toBe("1mo");
    expect(formatRelative("2026-07-07T12:00:00.000Z", NOW)).toBe("1mo");
    expect(formatRelative("2025-07-12T12:00:00.000Z", NOW)).toBe("1y");
    expect(formatRelative("2026-08-16T14:00:00.000Z", NOW)).toBe("in 2h");
  });

  it("formats signed deltas, ranks, meter widths, and star counts", () => {
    expect(formatDelta(0)).toBe("0");
    expect(formatDelta(-0)).toBe("0");
    expect(formatDelta(Number.NaN)).toBe("0");
    expect(formatDelta(0.04)).toBe("+0");
    expect(formatDelta(1.25)).toBe("+1.3");
    expect(formatDelta(-2)).toBe("\u22122");
    expect(formatDelta(1e21)).toBe("+1e+21");
    expect(formatDelta(-1e21)).toBe("\u22121e+21");
    expect(formatOrdinal(12)).toBe("#12");
    expect(formatOrdinal(1)).toBe("#1");
    expect(formatOrdinal(0)).toBe("\u2014");
    expect(formatOrdinal(-3)).toBe("\u2014");
    expect(formatOrdinal(1.5)).toBe("\u2014");
    expect(formatOrdinal(Number.POSITIVE_INFINITY)).toBe("\u2014");
    expect(formatMeter(42)).toBe("42");
    expect(formatMeter(1.26)).toBe("1.3");
    expect(formatMeter(Number.NaN)).toBe("0");
    expect(meterPercent(42, 100)).toBe(42);
    expect(meterPercent(150, 100)).toBe(100);
    expect(meterPercent(10, 0)).toBe(0);
    expect(meterPercent(-25, 100)).toBe(0);
    expect(meterPercent(25, -100)).toBe(0);
    expect(meterPercent(-40, -50)).toBe(0);
    expect(ratingFilled(3.6, 5)).toBe(4);
    expect(ratingFilled(2.5, 5)).toBe(3);
    expect(ratingFilled(2.5, 1)).toBe(1);
    expect(ratingFilled(2.5, 0)).toBe(0);
    expect(ratingFilled(-1, 5)).toBe(0);
  });

  it("treats non-positive shares as zero width", () => {
    expect(percentShares([0, 0, 0])).toEqual([0, 0, 0]);
    expect(percentShares([1, 0, 1])).toEqual([50, 0, 50]);
    expect(percentShares([-2, 4, -1])).toEqual([0, 100, 0]);
    expect(percentShares([-5, -1])).toEqual([0, 0]);
  });
});

describe("useful bits render", () => {
  it("exports the useful set and still refuses overlays", () => {
    for (const name of USEFUL_BITS) {
      expect(BIT_EXPORTS).toContain(name);
    }
    for (const name of REFUSED) {
      expect(BIT_EXPORTS).not.toContain(name);
    }
  });

  it("stays Takumi-safe in every useful bit source", () => {
    const names = new Set<string>(USEFUL_BITS);
    const files = readdirSync(SRC).filter(
      (file: string) =>
        file.endsWith(".tsx") && names.has(file.replace(/\.tsx$/, "")),
    );
    expect(files).toHaveLength(USEFUL_BITS.length);
    for (const file of files) {
      const source = readFileSync(join(SRC, file), "utf8");
      expect(source).not.toContain("react-dom");
      expect(source).not.toContain("useEffect");
      expect(source).not.toContain("createPortal");
      expect(source).not.toContain("document");
      expect(source).not.toMatch(/\bfetch\b/);
      expect(source).not.toContain("boxShadow");
      expect(source).not.toMatch(/<svg|<canvas|<table/i);
    }
  });

  it("keeps Duration and Relative off the system clock", () => {
    for (const file of ["Duration.tsx", "Relative.tsx"]) {
      const source = readFileSync(join(SRC, file), "utf8");
      expect(source).not.toContain("Date.now");
    }
  });

  it("renders each useful bit without document or fetch", async () => {
    expect(globalThis.document).toBeUndefined();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const spark = await render(
      createElement(Sparkline, { values: [0, 2, 4], height: 28, barWidth: 4 }),
    );
    const bars = findAll(spark, (node) => node.style?.width === 4);
    expect(bars.map((node) => node.style?.height)).toEqual([1, 14, 28]);
    expect(bars[0]?.style?.backgroundColor).toBe(DARK_THEME.border);
    expect(bars[2]?.style?.backgroundColor).toBe(DARK_THEME.accent);

    const meter = await render(
      createElement(Meter, { value: 42, max: 100, label: "Solved" }),
    );
    expect(collectTexts(meter)).toEqual(
      expect.arrayContaining(["Solved", "42"]),
    );
    expect(findAll(meter, (node) => node.style?.width === "42%")).toHaveLength(
      1,
    );

    const duration = await render(createElement(Duration, { seconds: 3661 }));
    expect(collectTexts(duration)).toContain("1h 1m");

    const relative = await render(
      createElement(Relative, {
        value: "2026-08-16T10:00:00.000Z",
        now: NOW,
      }),
    );
    expect(collectTexts(relative)).toContain("2h");

    const delta = await render(createElement(Delta, { value: 4 }));
    expect(collectTexts(delta).join(" ")).toContain("+4");

    const ordinal = await render(
      createElement(Ordinal, { rank: 3, label: "Rapid" }),
    );
    expect(collectTexts(ordinal)).toEqual(
      expect.arrayContaining(["#3", "Rapid"]),
    );

    const quote = await render(
      createElement(Quote, { text: "Ship it", attribution: "Ada" }),
    );
    expect(collectTexts(quote)).toEqual(
      expect.arrayContaining(["Ship it", "\u2014 Ada"]),
    );

    const timeline = await render(
      createElement(Timeline, {
        items: [{ title: "Commit", meta: "2h" }],
      }),
    );
    expect(collectTexts(timeline)).toEqual(
      expect.arrayContaining(["Commit", "2h"]),
    );

    const empty = await render(createElement(Empty, null, "No data"));
    expect(collectTexts(empty)).toContain("No data");

    const figure = await render(
      createElement(Figure, {
        src: "https://example.com/cover.png",
        alt: "cover",
        caption: "Album",
        width: 48,
        height: 48,
      }),
    );
    expect(collectTexts(figure)).toContain("Album");
    expect(findAll(figure, (node) => node.type === "image")).toHaveLength(1);

    const table = await render(
      createElement(Table, {
        columns: ["Mode", "Rating"],
        rows: [["Rapid", "1800"]],
      }),
    );
    expect(collectTexts(table)).toEqual(
      expect.arrayContaining(["Mode", "Rating", "Rapid", "1800"]),
    );

    const stack = await render(
      createElement(StackBar, {
        segments: [
          { value: 1, label: "TS" },
          { value: 1, label: "Go" },
        ],
      }),
    );
    const shares = findAll(stack, (node) => node.style?.width === "50%");
    expect(shares).toHaveLength(2);
    expect(shares[0]?.style?.backgroundColor).toBe(DARK_THEME.accent);
    expect(shares[1]?.style?.backgroundColor).toBe(DARK_THEME.muted);

    const compare = await render(
      createElement(Compare, {
        left: { label: "White", value: 1 },
        right: { label: "Black", value: 3 },
      }),
    );
    expect(collectTexts(compare).join(" ")).toContain("White 1");
    expect(collectTexts(compare).join(" ")).toContain("Black 3");
    expect(
      findAll(compare, (node) => node.style?.width === "25%"),
    ).toHaveLength(1);
    expect(
      findAll(compare, (node) => node.style?.width === "75%"),
    ).toHaveLength(1);

    const legend = await render(
      createElement(Legend, { items: [{ label: "TS" }, { label: "Go" }] }),
    );
    expect(collectTexts(legend)).toEqual(expect.arrayContaining(["TS", "Go"]));

    const code = await render(createElement(Code, null, "pnpm test"));
    expect(collectTexts(code)).toContain("pnpm test");

    const callout = await render(createElement(Callout, null, "Pinned"));
    expect(collectTexts(callout)).toContain("Pinned");
    expect(
      findAll(callout, (node) => node.style?.borderLeftWidth === 3),
    ).toHaveLength(1);

    const dot = await render(createElement(Dot, { size: 8, tone: "accent" }));
    expect(
      findAll(
        dot,
        (node) =>
          node.style?.width === 8 &&
          node.style?.backgroundColor === DARK_THEME.accent,
      ),
    ).toHaveLength(1);

    const rating = await render(createElement(Rating, { value: 3, outOf: 5 }));
    const stars = collectTexts(rating);
    expect(stars).toHaveLength(5);
    expect(stars.every((star) => star === "\u2605")).toBe(true);

    const strip = await render(
      createElement(Strip, { cells: [{ count: 0 }, { count: 4 }] }),
    );
    const cells = findAll(strip, (node) => node.style?.width === 10);
    expect(cells).toHaveLength(2);
    expect(cells[0]?.style?.backgroundColor).not.toBe(
      cells[1]?.style?.backgroundColor,
    );

    const wrap = await render(
      createElement(Wrap, null, createElement(Text, null, "alpha")),
    );
    expect(collectTexts(wrap)).toContain("alpha");
    expect(
      findAll(wrap, (node) => node.style?.flexWrap === "wrap"),
    ).toHaveLength(1);

    const ring = await render(createElement(Ring, { value: "12", size: 40 }));
    expect(collectTexts(ring)).toContain("12");
    expect(
      findAll(ring, (node) => node.style?.borderRadius === 20),
    ).toHaveLength(1);

    const stackAvatars = await render(
      createElement(AvatarStack, {
        srcs: [
          "https://example.com/a.png",
          "https://example.com/b.png",
          "https://example.com/c.png",
          "https://example.com/d.png",
          "https://example.com/e.png",
        ],
        max: 4,
        size: 28,
      }),
    );
    expect(findAll(stackAvatars, (node) => node.type === "image")).toHaveLength(
      3,
    );
    expect(collectTexts(stackAvatars)).toContain("+2");

    const pair = await render(
      createElement(KeyValue, { label: "Stars", value: 12 }),
    );
    expect(collectTexts(pair)).toEqual(expect.arrayContaining(["Stars", "12"]));

    const banner = await render(createElement(Banner, null, "Live"));
    expect(collectTexts(banner)).toContain("Live");
    const bannerNode = findAll(
      banner,
      (node) => node.style?.backgroundColor === DARK_THEME.accent,
    );
    expect(bannerNode[0]?.style?.color).toBe(readableInk(DARK_THEME.accent));

    const eyebrow = await render(createElement(Eyebrow, null, "Today"));
    expect(collectTexts(eyebrow)).toContain("Today");
    expect(
      findAll(eyebrow, (node) => node.style?.textTransform === "uppercase"),
    ).toHaveLength(1);

    const status = await render(
      createElement(Status, { label: "In game", tone: "accent" }),
    );
    expect(collectTexts(status)).toContain("In game");

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders an empty series as a drawable mark", async () => {
    await render(createElement(Sparkline, { values: [] }));
    await render(createElement(StackBar, { segments: [] }));
    await render(createElement(Strip, { cells: [] }));
  });

  it("omits zero and negative stack segments", async () => {
    const zeros = await render(
      createElement(StackBar, {
        segments: [
          { value: 0, label: "A" },
          { value: 0, label: "B" },
        ],
      }),
    );
    expect(collectTexts(zeros)).toContain("\u2588");
    expect(
      findAll(
        zeros,
        (node) => node.style?.backgroundColor === DARK_THEME.accent,
      ),
    ).toHaveLength(0);

    const middle = await render(
      createElement(StackBar, {
        segments: [
          { value: 1, label: "A" },
          { value: 0, label: "B" },
          { value: 1, label: "C" },
        ],
      }),
    );
    const halves = findAll(middle, (node) => node.style?.width === "50%");
    expect(halves).toHaveLength(2);
    expect(halves[0]?.style?.backgroundColor).toBe(DARK_THEME.accent);
    expect(halves[1]?.style?.backgroundColor).toBe(DARK_THEME.muted);
    expect(findAll(middle, (node) => node.style?.width === "0%")).toHaveLength(
      0,
    );

    const negatives = await render(
      createElement(StackBar, {
        segments: [
          { value: -2, label: "A" },
          { value: 4, label: "B" },
          { value: -1, label: "C" },
        ],
      }),
    );
    expect(
      findAll(
        negatives,
        (node) =>
          node.style?.width === "100%" &&
          node.style?.backgroundColor === DARK_THEME.accent,
      ),
    ).toHaveLength(1);
  });

  it("reserves the only avatar slot for overflow", async () => {
    const capped = await render(
      createElement(AvatarStack, {
        srcs: [
          "https://example.com/a.png",
          "https://example.com/b.png",
          "https://example.com/c.png",
        ],
        max: 1,
      }),
    );
    expect(findAll(capped, (node) => node.type === "image")).toHaveLength(0);
    expect(collectTexts(capped)).toEqual(["+3"]);

    const empty = await render(createElement(AvatarStack, { srcs: [] }));
    expect(findAll(empty, (node) => node.type === "image")).toHaveLength(0);
    expect(collectTexts(empty)).toEqual(["\u2588"]);
  });

  it("splits a zero-zero compare evenly", async () => {
    const tied = await render(
      createElement(Compare, {
        left: { label: "White", value: 0 },
        right: { label: "Black", value: 0 },
      }),
    );
    expect(collectTexts(tied).join(" ")).toContain("White 0");
    expect(collectTexts(tied).join(" ")).toContain("Black 0");
    expect(findAll(tied, (node) => node.style?.width === "50%")).toHaveLength(
      2,
    );
  });
});
