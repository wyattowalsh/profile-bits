import type { PluginIdentity } from "@profile-bits/core";

export const DEMO_BITS_USED = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
] as const;

export const STATS_BITS_USED = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Stat",
  "Chip",
  "Avatar",
  "Divider",
] as const;

export const LANGUAGES_BITS_USED = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Bar",
  "Chip",
] as const;

export const GITHUB_BITS_USED = [
  ...new Set([
    ...DEMO_BITS_USED,
    ...STATS_BITS_USED,
    ...LANGUAGES_BITS_USED,
  ]),
].toSorted();

export const githubWidgetRegistry = {
  demo: { id: "demo", bitsUsed: DEMO_BITS_USED },
  stats: { id: "stats", bitsUsed: STATS_BITS_USED },
  languages: { id: "languages", bitsUsed: LANGUAGES_BITS_USED },
} as const;

export const githubPlugin = {
  id: "github",
  title: "GitHub",
  docsPath: "github",
  widgets: ["demo", "stats", "languages"],
  integrations: ["static", "github"],
  defaults: { widgets: ["stats", "languages"] },
  bitsUsed: GITHUB_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof GITHUB_BITS_USED };

export function bitsUsedForWidget(
  widget: keyof typeof githubWidgetRegistry,
): readonly string[] {
  return githubWidgetRegistry[widget].bitsUsed;
}
