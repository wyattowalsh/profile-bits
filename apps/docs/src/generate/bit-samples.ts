import {
  Avatar,
  Bar,
  Board,
  Chip,
  Divider,
  Frame,
  Grid,
  Heatmap,
  Icon,
  Image,
  List,
  Muted,
  Row,
  Stack,
  Stat,
  Text,
  Theme,
  Time,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import { createElement, type ReactElement } from "react";
import { PREVIEW_BIT_IDS, type PreviewBitName } from "../preview/types";

export const BIT_SAMPLE_IDS = PREVIEW_BIT_IDS;

const OCTOCAT_AVATAR = "https://avatars.githubusercontent.com/u/583231?v=4";
const SAMPLE_COVER = "https://avatars.githubusercontent.com/u/583231?v=4";
const SAMPLE_TIME = "2026-08-16T11:00:00.000Z";

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
    default:
      return createElement(Text, null, String(bit));
  }
}
