import type { PluginIdentity } from "@profile-bits/core";

export const RSS_BITS_USED = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
] as const;

export const rssPlugin = {
  id: "rss",
  title: "RSS",
  docsPath: "rss",
  widgets: ["feed"],
  integrations: ["rss"],
  defaults: { widgets: ["feed"] },
  bitsUsed: RSS_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof RSS_BITS_USED };
