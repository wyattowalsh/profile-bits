import {
  Board,
  Chip,
  Frame,
  Grid,
  Heatmap,
  Icon,
  Image,
  List,
  Text,
  Theme,
  Time,
} from "@profile-bits/bits";
import { isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { PREVIEW_BIT_IDS } from "../preview/types";
import { BIT_SAMPLE_IDS, bitSampleElement } from "./bit-samples";

const README_CARD_BIT_NAMES = [
  "Image",
  "Heatmap",
  "Board",
  "Icon",
  "Grid",
  "List",
  "Time",
] as const;

const REFUSED_BIT_NAMES = [
  "Cover",
  "Dialog",
  "Toast",
  "Popover",
  "Dropdown",
  "Command",
] as const;

function propsOf(element: ReactElement): Record<string, unknown> {
  return element.props as Record<string, unknown>;
}

function onlyChild(element: ReactElement): ReactElement {
  const children = propsOf(element).children;
  if (!isValidElement(children)) {
    throw new Error("expected a single React element child");
  }
  return children;
}

function childElements(element: ReactElement): ReactElement[] {
  const children = propsOf(element).children;
  if (Array.isArray(children)) {
    return children.filter((child): child is ReactElement =>
      isValidElement(child),
    );
  }
  if (isValidElement(children)) {
    return [children];
  }
  throw new Error("expected React element children");
}

function sampleRoot(bit: (typeof PREVIEW_BIT_IDS)[number]): ReactElement {
  const theme = bitSampleElement(bit, "dark");
  expect(theme.type).toBe(Theme);
  const frame = onlyChild(theme);
  expect(frame.type).toBe(Frame);
  return onlyChild(frame);
}

describe("bit-samples", () => {
  it("covers Frozen 11 plus README-card bit export names", () => {
    expect(BIT_SAMPLE_IDS).toEqual(PREVIEW_BIT_IDS);
    expect(BIT_SAMPLE_IDS).toHaveLength(18);
    expect(BIT_SAMPLE_IDS.slice(0, 11)).toEqual([
      "Theme",
      "Frame",
      "Stack",
      "Row",
      "Text",
      "Muted",
      "Stat",
      "Bar",
      "Chip",
      "Avatar",
      "Divider",
    ]);
    expect(BIT_SAMPLE_IDS.slice(11)).toEqual([...README_CARD_BIT_NAMES]);
    for (const bit of PREVIEW_BIT_IDS) {
      const element = bitSampleElement(bit, "dark");
      expect(element.type).toBe(Theme);
    }
    for (const refused of REFUSED_BIT_NAMES) {
      expect(BIT_SAMPLE_IDS).not.toContain(refused);
    }
  });

  it("uses split Chip chrome with label and message", () => {
    const chip = sampleRoot("Chip");
    expect(chip.type).toBe(Chip);
    expect(propsOf(chip)).toEqual({
      label: "npm",
      message: "1.2.3",
    });
  });

  it("samples Image as rectangular cover art, not Cover or Avatar", () => {
    const image = sampleRoot("Image");
    expect(image.type).toBe(Image);
    expect(propsOf(image)).toEqual({
      src: "https://avatars.githubusercontent.com/u/583231?v=4",
      alt: "cover",
      width: 96,
      height: 48,
    });
    expect(propsOf(image)).not.toHaveProperty("size");
  });

  it("samples Heatmap as a day grid of intensity cells", () => {
    const heatmap = sampleRoot("Heatmap");
    expect(heatmap.type).toBe(Heatmap);
    expect(propsOf(heatmap)).toEqual({
      weeks: [
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
      ],
    });
  });

  it("samples Board as a default 8×8 starting position", () => {
    const board = sampleRoot("Board");
    expect(board.type).toBe(Board);
    expect(propsOf(board)).toEqual({});
  });

  it("samples Icon as a geometric mark without a DOM icon library", () => {
    const icon = sampleRoot("Icon");
    expect(icon.type).toBe(Icon);
    expect(propsOf(icon)).toEqual({});
  });

  it("samples Grid as generic two-dimensional children, not Heatmap or Board", () => {
    const grid = sampleRoot("Grid");
    expect(grid.type).toBe(Grid);
    expect(propsOf(grid)).toMatchObject({ columns: 2, gap: 8 });
    const cells = childElements(grid);
    expect(cells).toHaveLength(4);
    expect(cells.map((cell) => cell.type)).toEqual([Text, Text, Text, Text]);
    expect(cells.map((cell) => propsOf(cell).children)).toEqual([
      "alpha",
      "beta",
      "gamma",
      "delta",
    ]);
  });

  it("samples List as title-plus-meta item rows", () => {
    const list = sampleRoot("List");
    expect(list.type).toBe(List);
    expect(propsOf(list)).toEqual({
      items: [
        { title: "Track One", meta: "Artist" },
        { title: "Track Two", meta: "2:14" },
      ],
    });
  });

  it("samples Time as a formatted timestamp string without HTTP", () => {
    const time = sampleRoot("Time");
    expect(time.type).toBe(Time);
    expect(propsOf(time)).toEqual({ value: "2026-08-16T11:00:00.000Z" });
  });

  it("does not treat unknown names as README-card samples", () => {
    const unknown = onlyChild(onlyChild(bitSampleElement("Cover", "dark")));
    expect(unknown.type).toBe(Text);
    expect(propsOf(unknown).children).toBe("Cover");
  });
});
