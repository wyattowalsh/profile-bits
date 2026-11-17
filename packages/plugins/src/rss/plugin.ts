import type { PluginIdentity } from "@profile-bits/core";

/** Pack bits. `latest` uses Time for absolute stamps and Relative for age. */
export const RSS_BITS_USED = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Time",
  "Relative",
] as const;

export const rssPlugin = {
  id: "rss",
  title: "RSS",
  docsPath: "rss",
  widgets: ["feed", "latest"],
  integrations: ["rss"],
  defaults: { widgets: ["feed"] },
  bitsUsed: RSS_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof RSS_BITS_USED };
