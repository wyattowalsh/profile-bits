import type { RssFeedItem } from "@profile-bits/integrations";
import { container, type Node, percentage, text } from "@profile-bits/renderer";
import {
  resolveTheme,
  THEME_REGISTRY,
  type ThemePalette,
} from "@profile-bits/themes";

export const NO_FEED_ITEMS = "No feed items";

export type FeedItem = RssFeedItem;

export function feedLines(items: readonly FeedItem[]): readonly string[] {
  if (items.length === 0) {
    return [NO_FEED_ITEMS];
  }
  return items.map((item) => item.title);
}

export function feedTemplate(
  items: readonly FeedItem[],
  theme: ThemePalette = resolveTheme("dark", THEME_REGISTRY),
): Node {
  const empty = items.length === 0;
  const children: Node[] = feedLines(items).map((line) =>
    text(line, {
      color: empty ? theme.muted : theme.text,
      fontFamily: theme.font,
      fontSize: empty ? 16 : 12,
      fontWeight: empty ? 600 : 400,
    }),
  );
  return container({
    style: {
      width: percentage(100),
      height: percentage(100),
      display: "flex",
      flexDirection: "column",
      justifyContent: empty ? "center" : "flex-start",
      backgroundColor: theme.card,
      borderColor: theme.border,
      color: theme.text,
      fontFamily: theme.font,
    },
    children,
  });
}
