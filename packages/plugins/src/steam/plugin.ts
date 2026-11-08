import {
  type PluginIdentity,
  STEAM_PACK_DEFAULT_WIDGETS,
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

const widgets = ["player", "recent"] as const;

/** Pack-level union. author-widget adds Stat and Image. Not yaml. */
export const STEAM_BITS_USED = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Stat",
  "Image",
] as const;

export const steamPlugin = {
  id: "steam",
  title: "Steam",
  docsPath: "steam",
  widgets,
  integrations: deriveIntegrationUnion(WIDGET_INTEGRATIONS, widgets),
  defaults: {
    widgets: [...STEAM_PACK_DEFAULT_WIDGETS],
  },
  bitsUsed: STEAM_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof STEAM_BITS_USED };
