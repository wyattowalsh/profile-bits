import {
  type PluginIdentity,
  WAKATIME_PACK_DEFAULT_WIDGETS,
} from "@profile-bits/core";
import { WAKATIME_SLICE_WIDGET_IDS } from "./slice.js";

export { WAKATIME_SLICE_WIDGET_IDS } from "./slice.js";

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
  "List",
] as const;

export const wakatimePlugin = {
  id: "wakatime",
  title: "WakaTime",
  docsPath: "wakatime",
  widgets: ["coding", ...WAKATIME_SLICE_WIDGET_IDS],
  integrations: ["wakatime"],
  defaults: { widgets: [...WAKATIME_PACK_DEFAULT_WIDGETS] },
  bitsUsed: WAKATIME_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof WAKATIME_BITS_USED };
