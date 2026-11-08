import {
  LEETCODE_PACK_DEFAULT_WIDGETS,
  type PluginIdentity,
  WIDGET_INTEGRATIONS,
} from "@profile-bits/core";

export function deriveIntegrationUnion(
  widgetIntegrations: Readonly<Record<string, readonly string[]>>,
  widgetIds: readonly string[],
): string[] {
  const union = new Set<string>();
  for (const widgetId of widgetIds) {
    const ids = widgetIntegrations[widgetId];
    if (ids === undefined) {
      throw new Error(
        `Pack widget "${widgetId}" has no integrations list; declare the integrations that widget consumes.`,
      );
    }
    if (ids.length < 1) {
      throw new Error(
        `Pack widget "${widgetId}" must declare at least one integration.`,
      );
    }
    for (const integrationId of ids) {
      union.add(integrationId);
    }
  }
  return [...union].sort();
}

const widgets = ["solved", "heatmap"] as const;

/** Pack-level union. author-widget adds Stat and Heatmap. Not yaml. */
export const LEETCODE_BITS_USED = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Stat",
  "Heatmap",
] as const;

export const leetcodePlugin = {
  id: "leetcode",
  title: "LeetCode",
  docsPath: "leetcode",
  widgets,
  integrations: deriveIntegrationUnion(WIDGET_INTEGRATIONS, widgets),
  defaults: {
    widgets: [...LEETCODE_PACK_DEFAULT_WIDGETS],
  },
  bitsUsed: LEETCODE_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof LEETCODE_BITS_USED };
