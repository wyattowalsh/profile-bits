import {
  CHESS_PACK_DEFAULT_WIDGETS,
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

const widgets = ["ratings", "game"] as const;

/**
 * Pack-level union. Integrations are chesscom and lichess.
 * author-widget adds Stat (ratings) and Board (game). Not yaml.
 */
export const CHESS_BITS_USED = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Stat",
  "Board",
] as const;

export const chessPlugin = {
  id: "chess",
  title: "Chess",
  docsPath: "chess",
  widgets,
  integrations: deriveIntegrationUnion(WIDGET_INTEGRATIONS, widgets),
  defaults: {
    widgets: [...CHESS_PACK_DEFAULT_WIDGETS],
  },
  bitsUsed: CHESS_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof CHESS_BITS_USED };
