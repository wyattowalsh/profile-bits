import { container, type Node, percentage, text } from "@profile-bits/renderer";
import {
  resolveTheme,
  THEME_REGISTRY,
  type ThemePalette,
} from "@profile-bits/themes";
import { formatJsonRows } from "./jmes.js";

export const NO_JSON_DATA = "No data";

export function jsonHostnameLabel(url: string | undefined): string {
  if (url == null || url.trim() === "") {
    return "JSON";
  }
  try {
    const hostname = new URL(url).hostname;
    return hostname === "" ? "JSON" : hostname;
  } catch {
    return "JSON";
  }
}

export function jsonTemplate(input: {
  value: unknown;
  empty: boolean;
  url?: string;
  theme?: ThemePalette;
}): Node {
  const theme = input.theme ?? resolveTheme("dark", THEME_REGISTRY);
  const lines = input.empty ? [NO_JSON_DATA] : formatJsonRows(input.value);
  const children: Node[] = [
    text(jsonHostnameLabel(input.url), {
      color: theme.muted,
      fontFamily: theme.font,
      fontSize: 11,
      fontWeight: 500,
    }),
    ...lines.map((line) =>
      text(line, {
        color: input.empty ? theme.muted : theme.text,
        fontFamily: theme.font,
        fontSize: input.empty ? 16 : 13,
        fontWeight: input.empty ? 600 : 400,
      }),
    ),
  ];
  return container({
    style: {
      width: percentage(100),
      height: percentage(100),
      display: "flex",
      flexDirection: "column",
      justifyContent: input.empty ? "center" : "flex-start",
      backgroundColor: theme.card,
      borderColor: theme.border,
      color: theme.text,
      fontFamily: theme.font,
    },
    children,
  });
}
