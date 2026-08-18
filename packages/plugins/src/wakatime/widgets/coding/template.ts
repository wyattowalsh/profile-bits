import { container, type Node, percentage, text } from "@profile-bits/renderer";
import {
  resolveTheme,
  THEME_REGISTRY,
  type ThemePalette,
} from "@profile-bits/themes";
import { type CodingViewModel, NO_CODING_DATA } from "./view-model.js";

export function codingTemplate(
  model: CodingViewModel,
  theme: ThemePalette = resolveTheme("dark", THEME_REGISTRY),
): Node {
  const children: Node[] = [
    text(model.empty ? NO_CODING_DATA : model.totalText, {
      color: theme.text,
      fontFamily: theme.font,
      fontSize: 16,
      fontWeight: 600,
    }),
  ];
  if (!model.empty) {
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
          text(row.name, {
            color: theme.text,
            fontFamily: theme.font,
            fontSize: 12,
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
