import {
  type PluginIdentity,
  SPOTIFY_PACK_DEFAULT_WIDGETS,
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

const widgets = ["now-playing", "top"] as const;

/** Pack-level union. author-widget adds Image for album art. Not yaml. */
export const SPOTIFY_BITS_USED = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Image",
] as const;

export const spotifyPlugin = {
  id: "spotify",
  title: "Spotify",
  docsPath: "spotify",
  widgets,
  integrations: deriveIntegrationUnion(WIDGET_INTEGRATIONS, widgets),
  defaults: {
    widgets: [...SPOTIFY_PACK_DEFAULT_WIDGETS],
  },
  bitsUsed: SPOTIFY_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof SPOTIFY_BITS_USED };
