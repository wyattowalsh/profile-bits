import type { PluginIdentity } from "@profile-bits/core";

export const WAKATIME_BITS_USED = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Stat",
  "Bar",
  "Chip",
  "Divider",
] as const;

export const wakatimePlugin = {
  id: "wakatime",
  title: "WakaTime",
  docsPath: "wakatime",
  widgets: ["coding"],
  integrations: ["wakatime"],
  defaults: { widgets: ["coding"] },
  bitsUsed: WAKATIME_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof WAKATIME_BITS_USED };
