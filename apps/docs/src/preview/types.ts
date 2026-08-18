/**
 * Docs preview POST body, permalink state, and response.
 * Named themes come from `@profile-bits/themes`. Never include token fields.
 * Catalog pack is github; playground also lists http.
 */

import { NAMED_THEME_IDS, type ThemeId } from "@profile-bits/themes";

export const PREVIEW_SCOPES = ["plugin", "widget", "bit"] as const;
export type PreviewScope = (typeof PREVIEW_SCOPES)[number];

/**
 * Docs preview packs. Index 0 is the github catalog.
 * Http is the fixtures-only `/playground/http` explorer. Do not add more plugin ids.
 */
export const PREVIEW_PLUGIN_IDS = ["github", "http"] as const;
export type PreviewPluginId = (typeof PREVIEW_PLUGIN_IDS)[number];

export const PREVIEW_WIDGET_IDS = ["demo", "stats", "languages"] as const;
export type PreviewWidgetId = (typeof PREVIEW_WIDGET_IDS)[number];

/** Bits export names. Do not import packages/bits. Unknown names stay string. */
export const PREVIEW_BIT_IDS = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Stat",
  "Bar",
  "Chip",
  "Avatar",
  "Divider",
] as const;
export type PreviewBitName = (typeof PREVIEW_BIT_IDS)[number] | (string & {});

export const PREVIEW_OUTPUT_FORMATS = [
  "svg",
  "png",
  "jpeg",
  "webp",
  "ico",
  "gif",
  "apng",
] as const;
export type PreviewOutputFormat = (typeof PREVIEW_OUTPUT_FORMATS)[number];

export const PREVIEW_THEMES = NAMED_THEME_IDS;
export type PreviewNamedTheme = ThemeId;
export type PreviewCustomRoles = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  pair?: string;
};
export type PreviewCustomTheme = {
  custom: PreviewCustomRoles;
};
export type PreviewTheme = PreviewNamedTheme | PreviewCustomTheme;

export const PREVIEW_STATS_INCLUDE_TOKENS = [
  "followers",
  "following",
  "repos",
  "stars",
  "forks",
  "gists",
  "contributions",
] as const;
export type PreviewStatsIncludeToken =
  (typeof PREVIEW_STATS_INCLUDE_TOKENS)[number];

export const PREVIEW_PROVENANCES = ["fixture", "live", "rate_limited"] as const;
export type PreviewProvenance = (typeof PREVIEW_PROVENANCES)[number];

/**
 * Named secret query keys that must never round-trip into a permalink.
 * `isTokenQueryKey` also denies `token` / `token_*` prefixes and `*_token` suffixes.
 */
export const PREVIEW_TOKEN_QUERY_KEYS = [
  "github_token",
  "committer_token",
  "token",
  "pat",
  "access_token",
  "authorization",
  "gist_token",
  "http_token_env",
  "http_token",
  "wakatime_token",
] as const;
export type PreviewTokenQueryKey = (typeof PREVIEW_TOKEN_QUERY_KEYS)[number];

export const PREVIEW_CACHE_CONTROL = "no-store";
export const PREVIEW_ROBOTS_TAG = "noindex";
export const PREVIEW_RESPONSE_HEADERS = {
  "Cache-Control": PREVIEW_CACHE_CONTROL,
  "X-Robots-Tag": PREVIEW_ROBOTS_TAG,
} as const;

export type PreviewDemoOptions = {
  text?: string;
  subtitle?: string;
  animate?: boolean;
};

export type PreviewStatsOptions = {
  filename?: string;
  include?: readonly PreviewStatsIncludeToken[];
  hide_rank?: boolean;
  avatar?: boolean;
  animate?: boolean;
  include_private?: boolean;
  include_forks?: boolean;
  include_archived?: boolean;
};

export type PreviewLanguagesOptions = {
  filename?: string;
  limit?: number;
  min_pct?: number;
  exclude?: readonly string[];
  animate?: boolean;
  include_private?: boolean;
  include_forks?: boolean;
  include_archived?: boolean;
};

/**
 * Yaml-shaped widget options from the core Zod shapes, plus optional globals.
 * No token fields.
 */
export type PreviewOptions = {
  demo?: PreviewDemoOptions;
  stats?: PreviewStatsOptions;
  languages?: PreviewLanguagesOptions;
  format?: PreviewOutputFormat;
  theme?: PreviewTheme;
  output_pair?: boolean;
};

type PreviewGlobals = {
  options: PreviewOptions;
  format: PreviewOutputFormat;
  theme: PreviewTheme;
  output_pair: boolean;
  user: string;
};

export type PluginPreviewRequest = PreviewGlobals & {
  scope: "plugin";
  plugin: PreviewPluginId;
  widget?: PreviewWidgetId;
  bit?: undefined;
};

export type WidgetPreviewRequest = PreviewGlobals & {
  scope: "widget";
  plugin?: PreviewPluginId;
  widget: PreviewWidgetId;
  bit?: undefined;
};

export type BitPreviewRequest = PreviewGlobals & {
  scope: "bit";
  plugin?: PreviewPluginId;
  widget?: PreviewWidgetId;
  bit: PreviewBitName;
};

/** POST /api/preview body and permalink object. No token fields. */
export type PreviewRequest =
  | PluginPreviewRequest
  | WidgetPreviewRequest
  | BitPreviewRequest;

/** v0 pack id. Safe for server pages — do not import this from client shells. */
export const PREVIEW_PLUGIN_ID: PreviewPluginId = "github";

export const DEFAULT_PREVIEW_REQUEST: PluginPreviewRequest = {
  scope: "plugin",
  plugin: PREVIEW_PLUGIN_ID,
  options: {},
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

export type PreviewFile = {
  id: string;
  mime: string;
  bytesBase64: string;
  filename: string;
};

export type PreviewResponse = {
  files: PreviewFile[];
  provenance: PreviewProvenance;
  generatedAt: string;
};

export function isPreviewScope(value: string): value is PreviewScope {
  return (PREVIEW_SCOPES as readonly string[]).includes(value);
}

export function isPreviewPluginId(value: string): value is PreviewPluginId {
  return (PREVIEW_PLUGIN_IDS as readonly string[]).includes(value);
}

export function isPreviewWidgetId(value: string): value is PreviewWidgetId {
  return (PREVIEW_WIDGET_IDS as readonly string[]).includes(value);
}

export function isPreviewBitName(
  value: string,
): value is (typeof PREVIEW_BIT_IDS)[number] {
  return (PREVIEW_BIT_IDS as readonly string[]).includes(value);
}

export function isPreviewOutputFormat(
  value: string,
): value is PreviewOutputFormat {
  return (PREVIEW_OUTPUT_FORMATS as readonly string[]).includes(value);
}

export function isPreviewNamedTheme(value: string): value is PreviewNamedTheme {
  return (PREVIEW_THEMES as readonly string[]).includes(value);
}

export function isPreviewCustomTheme(
  value: unknown,
): value is PreviewCustomTheme {
  if (value == null || typeof value !== "object" || !("custom" in value)) {
    return false;
  }
  const roles = (value as PreviewCustomTheme).custom;
  return (
    roles != null &&
    typeof roles === "object" &&
    typeof roles.bg === "string" &&
    typeof roles.card === "string" &&
    typeof roles.text === "string" &&
    typeof roles.muted === "string" &&
    typeof roles.accent === "string" &&
    typeof roles.border === "string"
  );
}

export function isPreviewTheme(value: unknown): value is PreviewTheme {
  return (
    (typeof value === "string" && isPreviewNamedTheme(value)) ||
    isPreviewCustomTheme(value)
  );
}

export function previewThemeParam(theme: PreviewTheme): string {
  return typeof theme === "string" ? theme : "custom";
}

export function isPreviewStatsIncludeToken(
  value: string,
): value is PreviewStatsIncludeToken {
  return (PREVIEW_STATS_INCLUDE_TOKENS as readonly string[]).includes(value);
}

export function isTokenQueryKey(key: string): boolean {
  const lower = key.toLowerCase();
  if ((PREVIEW_TOKEN_QUERY_KEYS as readonly string[]).includes(lower)) {
    return true;
  }
  return lower.startsWith("token") || lower.endsWith("_token");
}
