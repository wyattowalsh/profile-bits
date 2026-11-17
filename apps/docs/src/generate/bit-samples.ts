import {
  Avatar,
  AvatarStack,
  Banner,
  Bar,
  Board,
  Callout,
  Chip,
  Code,
  Compare,
  Delta,
  Divider,
  Dot,
  Duration,
  Empty,
  Eyebrow,
  Figure,
  Frame,
  Grid,
  Heatmap,
  Icon,
  Image,
  KeyValue,
  Legend,
  List,
  Meter,
  Muted,
  Ordinal,
  Quote,
  Rating,
  Relative,
  Ring,
  Row,
  Sparkline,
  Stack,
  StackBar,
  Stat,
  Status,
  Strip,
  Table,
  Text,
  Theme,
  Time,
  Timeline,
  Wrap,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import { createElement, type ReactElement } from "react";
import { PREVIEW_BIT_IDS, type PreviewBitName } from "../preview/types";

export const BIT_SAMPLE_IDS = PREVIEW_BIT_IDS;

const OCTOCAT_AVATAR = "https://avatars.githubusercontent.com/u/583231?v=4";
const SAMPLE_COVER = "https://avatars.githubusercontent.com/u/583231?v=4";
const SAMPLE_TIME = "2026-08-16T11:00:00.000Z";
const SAMPLE_NOW = "2026-08-16T12:00:00.000Z";

const SAMPLE_HEATMAP_WEEKS = [
  {
    days: [
      { date: "2026-01-04", count: 0, weekday: 0 },
      { date: "2026-01-05", count: 1, weekday: 1 },
      { date: "2026-01-06", count: 2, weekday: 2 },
      { date: "2026-01-07", count: 3, weekday: 3 },
      { date: "2026-01-08", count: 4, weekday: 4 },
      { date: "2026-01-09", count: 0, weekday: 5 },
      { date: "2026-01-10", count: 0, weekday: 6 },
    ],
  },
  {
    days: [{ date: "2026-01-11", count: 2, weekday: 0 }],
  },
] as const;

const SAMPLE_LIST_ITEMS = [
  { title: "Track One", meta: "Artist" },
  { title: "Track Two", meta: "2:14" },
] as const;

export function bitSampleElement(
  bit: PreviewBitName,
  theme: WidgetTheme = "dark",
): ReactElement {
  const inner = sampleInner(bit);
  return createElement(Theme, { theme }, createElement(Frame, null, inner));
}

function sampleInner(bit: PreviewBitName): ReactElement {
  switch (bit) {
    case "Theme":
      return createElement(Text, null, "Theme");
    case "Frame":
      return createElement(Text, null, "Frame");
    case "Stack":
      return createElement(Stack, null, createElement(Text, null, "Stack"));
    case "Row":
      return createElement(Row, null, createElement(Text, null, "Row"));
    case "Text":
      return createElement(Text, null, "Text");
    case "Muted":
      return createElement(Muted, null, "Muted");
    case "Stat":
      return createElement(Stat, { label: "Stars", value: "12" });
    case "Bar":
      return createElement(Bar, { pct: 42, label: "TypeScript" });
    case "Chip":
      return createElement(Chip, { label: "npm", message: "1.2.3" });
    case "Avatar":
      return createElement(Avatar, {
        src: OCTOCAT_AVATAR,
        size: 36,
      });
    case "Divider":
      return createElement(Divider, null);
    case "Image":
      return createElement(Image, {
        src: SAMPLE_COVER,
        alt: "cover",
        width: 96,
        height: 48,
      });
    case "Heatmap":
      return createElement(Heatmap, { weeks: SAMPLE_HEATMAP_WEEKS });
    case "Board":
      return createElement(Board, {});
    case "Icon":
      return createElement(Icon, {});
    case "Grid":
      return createElement(
        Grid,
        { columns: 2, gap: 8 },
        createElement(Text, null, "alpha"),
        createElement(Text, null, "beta"),
        createElement(Text, null, "gamma"),
        createElement(Text, null, "delta"),
      );
    case "List":
      return createElement(List, { items: SAMPLE_LIST_ITEMS });
    case "Time":
      return createElement(Time, { value: SAMPLE_TIME });
    case "Sparkline":
      return createElement(Sparkline, { values: [1, 3, 2, 5, 4] });
    case "Meter":
      return createElement(Meter, { value: 42, max: 100, label: "Solved" });
    case "Duration":
      return createElement(Duration, { seconds: 3661 });
    case "Relative":
      return createElement(Relative, {
        value: SAMPLE_TIME,
        now: SAMPLE_NOW,
      });
    case "Delta":
      return createElement(Delta, { value: 4 });
    case "Ordinal":
      return createElement(Ordinal, { rank: 3, label: "Rapid" });
    case "Quote":
      return createElement(Quote, {
        text: "Ship the card",
        attribution: "profile-bits",
      });
    case "Timeline":
      return createElement(Timeline, {
        items: [
          { title: "Commit", meta: "2h" },
          { title: "Release", meta: "1d" },
        ],
      });
    case "Empty":
      return createElement(Empty, null, "No data");
    case "Figure":
      return createElement(Figure, {
        src: SAMPLE_COVER,
        alt: "cover",
        width: 96,
        height: 48,
        caption: "Album",
      });
    case "Table":
      return createElement(Table, {
        columns: ["Mode", "Rating"],
        rows: [["Rapid", "1800"]],
      });
    case "StackBar":
      return createElement(StackBar, {
        segments: [
          { value: 3, label: "TypeScript" },
          { value: 1, label: "Go" },
        ],
      });
    case "Compare":
      return createElement(Compare, {
        left: { label: "White", value: 1 },
        right: { label: "Black", value: 3 },
      });
    case "Legend":
      return createElement(Legend, {
        items: [{ label: "TypeScript" }, { label: "Go" }],
      });
    case "Code":
      return createElement(Code, null, "pnpm test");
    case "Callout":
      return createElement(Callout, null, "Pinned");
    case "Dot":
      return createElement(Dot, { tone: "accent" });
    case "Rating":
      return createElement(Rating, { value: 4, outOf: 5 });
    case "Strip":
      return createElement(Strip, {
        cells: [{ count: 0 }, { count: 2 }, { count: 4 }],
      });
    case "Wrap":
      return createElement(
        Wrap,
        null,
        createElement(Text, null, "alpha"),
        createElement(Text, null, "beta"),
      );
    case "Ring":
      return createElement(Ring, { value: "12" });
    case "AvatarStack":
      return createElement(AvatarStack, {
        srcs: [OCTOCAT_AVATAR, OCTOCAT_AVATAR, OCTOCAT_AVATAR],
      });
    case "KeyValue":
      return createElement(KeyValue, { label: "Stars", value: 12 });
    case "Banner":
      return createElement(Banner, null, "Live");
    case "Eyebrow":
      return createElement(Eyebrow, null, "Today");
    case "Status":
      return createElement(Status, { label: "In game", tone: "accent" });
    default:
      return createElement(Text, null, String(bit));
  }
}
