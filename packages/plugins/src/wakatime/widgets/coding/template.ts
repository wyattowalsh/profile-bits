import { formatDuration } from "@profile-bits/bits";
import { container, type Node, percentage, text } from "@profile-bits/renderer";
import {
  resolveTheme,
  THEME_REGISTRY,
  type ThemePalette,
} from "@profile-bits/themes";
import { sparklineValues } from "../../read-dump.js";
import { type CodingViewModel, NO_CODING_DATA } from "./view-model.js";

const SPARK_HEIGHT = 14;
const SPARK_GAP = 2;
const SPARK_BAR = 4;

function durationText(seconds: number, theme: ThemePalette): Node {
  return text(formatDuration(seconds), {
    color: theme.muted,
    fontFamily: theme.font,
    fontSize: 12,
    fontWeight: 400,
  });
}

function sparklineNode(values: readonly number[], theme: ThemePalette): Node {
  const peak = values.reduce(
    (max, value) =>
      Math.max(max, Number.isFinite(value) ? Math.max(0, value) : 0),
    0,
  );
  const bars: Node[] = values.map((value) => {
    const amount = Number.isFinite(value) ? Math.max(0, value) : 0;
    const bar =
      peak <= 0 ? 1 : Math.max(1, Math.round((amount / peak) * SPARK_HEIGHT));
    const fill = amount > 0 ? theme.accent : theme.border;
    return container({
      style: {
        width: SPARK_BAR,
        height: bar,
        backgroundColor: fill,
        borderRadius: 2,
      },
      children: [
        text("\u2588", {
          color: fill,
          fontFamily: theme.font,
          fontSize: bar,
          fontWeight: 700,
        }),
      ],
    });
  });
  return container({
    style: {
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-end",
      gap: SPARK_GAP,
      height: SPARK_HEIGHT,
    },
    children: bars,
  });
}

export function codingTemplate(
  model: CodingViewModel,
  theme: ThemePalette = resolveTheme("dark", THEME_REGISTRY),
): Node {
  const totalText = text(model.empty ? NO_CODING_DATA : model.totalText, {
    color: theme.text,
    fontFamily: theme.font,
    fontSize: 16,
    fontWeight: 600,
  });
  const children: Node[] = [];
  if (model.empty) {
    children.push(totalText);
  } else {
    const header: Node[] = [totalText];
    if (model.totals !== undefined) {
      for (const stat of model.totals) {
        header.push(
          text(stat.label, {
            color: theme.muted,
            fontFamily: theme.font,
            fontSize: 12,
          }),
          durationText(stat.seconds, theme),
        );
      }
    }
    if (model.series !== undefined) {
      header.push(sparklineNode(sparklineValues(model.series), theme));
    }
    children.push(
      container({
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        children: header,
      }),
    );
    for (const slice of model.slices) {
      children.push(
        text(slice.key, {
          color: theme.muted,
          fontFamily: theme.font,
          fontSize: 12,
        }),
      );
      for (const row of slice.rows) {
        children.push(
          container({
            style: {
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            },
            children: [
              text(row.name, {
                color: theme.text,
                fontFamily: theme.font,
                fontSize: 12,
              }),
              durationText(row.totalSeconds, theme),
            ],
          }),
        );
      }
    }
  }
  return container({
    style: {
      width: percentage(100),
      height: percentage(100),
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      backgroundColor: theme.card,
      borderColor: theme.border,
      color: theme.text,
      fontFamily: theme.font,
    },
    children,
  });
}
