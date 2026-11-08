/**
 * Docs preview POST body, permalink state, and response.
 * Named themes come from `@profile-bits/themes`. Never include token fields.
 * Catalog and playground list all first-party packs.
 */

import {
  CODING_INCLUDE_TOKENS,
  CODING_RANGE_TOKENS,
  HTTP_CHIP_PRESETS,
  HTTP_CHIP_TYPES,
} from "@profile-bits/core";
import { NAMED_THEME_IDS, type ThemeId } from "@profile-bits/themes";

export const PREVIEW_SCOPES = ["plugin", "widget", "bit"] as const;
export type PreviewScope = (typeof PREVIEW_SCOPES)[number];

/**
 * Docs preview packs. Index 0 is the github catalog landing.
 * Widget ids stay per pack — do not dump http/rss/wakatime ids into github.
 */
export const PREVIEW_PLUGIN_IDS = [
  "github",
  "wakatime",
  "rss",
  "http",
] as const;
export type PreviewPluginId = (typeof PREVIEW_PLUGIN_IDS)[number];

export const PREVIEW_GITHUB_WIDGET_IDS = [
  "demo",
  "stats",
  "languages",
  "repo",
] as const;
export type PreviewGithubWidgetId = (typeof PREVIEW_GITHUB_WIDGET_IDS)[number];

export const PREVIEW_WAKATIME_WIDGET_IDS = ["coding"] as const;
export type PreviewWakatimeWidgetId =
  (typeof PREVIEW_WAKATIME_WIDGET_IDS)[number];

export const PREVIEW_RSS_WIDGET_IDS = ["feed"] as const;
export type PreviewRssWidgetId = (typeof PREVIEW_RSS_WIDGET_IDS)[number];

export const PREVIEW_HTTP_WIDGET_IDS = ["json", "chips"] as const;
export type PreviewHttpWidgetId = (typeof PREVIEW_HTTP_WIDGET_IDS)[number];

/** POST `/api/preview` `widget` union. Github routes use PREVIEW_GITHUB_WIDGET_IDS. */
export const PREVIEW_WIDGET_IDS = [
  ...PREVIEW_GITHUB_WIDGET_IDS,
  ...PREVIEW_WAKATIME_WIDGET_IDS,
  ...PREVIEW_RSS_WIDGET_IDS,
  ...PREVIEW_HTTP_WIDGET_IDS,
] as const;
export type PreviewWidgetId = (typeof PREVIEW_WIDGET_IDS)[number];

export const PREVIEW_WIDGETS_BY_PLUGIN = {
  github: PREVIEW_GITHUB_WIDGET_IDS,
  wakatime: PREVIEW_WAKATIME_WIDGET_IDS,
  rss: PREVIEW_RSS_WIDGET_IDS,
  http: PREVIEW_HTTP_WIDGET_IDS,
} as const satisfies Record<PreviewPluginId, readonly PreviewWidgetId[]>;

/** Plugin-scope github still omits opt-in `repo`. */
export const PREVIEW_GITHUB_PLUGIN_SCOPE_WIDGETS = [
  "demo",
  "stats",
  "languages",
] as const satisfies readonly PreviewGithubWidgetId[];

export const PREVIEW_DEFAULT_WIDGETS_BY_PLUGIN = {
  github: ["demo"],
  wakatime: ["coding"],
  rss: ["feed"],
  http: ["chips"],
} as const satisfies Record<PreviewPluginId, readonly PreviewWidgetId[]>;

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
  "Image",
  "Heatmap",
  "Board",
  "Icon",
  "Grid",
  "List",
  "Time",
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

export const PREVIEW_REPO_INCLUDE_TOKENS = [
  "stars",
  "forks",
  "watchers",
  "issues",
  "license",
  "language",
] as const;
export type PreviewRepoIncludeToken =
  (typeof PREVIEW_REPO_INCLUDE_TOKENS)[number];

export const PREVIEW_CODING_INCLUDE_TOKENS = CODING_INCLUDE_TOKENS;
export type PreviewCodingIncludeToken =
  (typeof PREVIEW_CODING_INCLUDE_TOKENS)[number];

export const PREVIEW_CODING_RANGE_TOKENS = CODING_RANGE_TOKENS;
export type PreviewCodingRange = (typeof PREVIEW_CODING_RANGE_TOKENS)[number];

export const PREVIEW_CHIP_PRESETS = HTTP_CHIP_PRESETS;
export type PreviewChipPreset = (typeof PREVIEW_CHIP_PRESETS)[number];

export const PREVIEW_CHIP_TYPES = HTTP_CHIP_TYPES;
export type PreviewChipType = (typeof PREVIEW_CHIP_TYPES)[number];

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

export type PreviewRepoOptions = {
  filename?: string;
  include?: readonly PreviewRepoIncludeToken[];
  avatar?: boolean;
  animate?: boolean;
  repo?: string;
};

export type PreviewCodingOptions = {
  filename?: string;
  range?: PreviewCodingRange;
  include?: readonly PreviewCodingIncludeToken[];
  limit?: number;
  api_domain?: string;
  animate?: boolean;
};

export type PreviewFeedOptions = {
  filename?: string;
  url?: string;
  limit?: number;
  animate?: boolean;
};

export type PreviewJsonOptions = {
  filename?: string;
  url?: string;
  jmespath?: string;
  timeout_ms?: number;
  animate?: boolean;
};

export type PreviewChipsOptions = {
  filename?: string;
  preset?: PreviewChipPreset;
  types?: readonly PreviewChipType[];
  package?: string;
  repo?: string;
  workflow?: string;
  timeout_ms?: number;
  animate?: boolean;
};

/**
 * Yaml-shaped widget options from the core Zod shapes, plus optional globals.
 * No token fields.
 */
export type PreviewOptions = {
  demo?: PreviewDemoOptions;
  stats?: PreviewStatsOptions;
  languages?: PreviewLanguagesOptions;
  repo?: PreviewRepoOptions;
  coding?: PreviewCodingOptions;
  feed?: PreviewFeedOptions;
  json?: PreviewJsonOptions;
  chips?: PreviewChipsOptions;
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

export function isPreviewGithubWidgetId(
  value: string,
): value is PreviewGithubWidgetId {
  return (PREVIEW_GITHUB_WIDGET_IDS as readonly string[]).includes(value);
}

export function isPreviewWakatimeWidgetId(
  value: string,
): value is PreviewWakatimeWidgetId {
  return (PREVIEW_WAKATIME_WIDGET_IDS as readonly string[]).includes(value);
}

export function isPreviewRssWidgetId(
  value: string,
): value is PreviewRssWidgetId {
  return (PREVIEW_RSS_WIDGET_IDS as readonly string[]).includes(value);
}

export function isPreviewHttpWidgetId(
  value: string,
): value is PreviewHttpWidgetId {
  return (PREVIEW_HTTP_WIDGET_IDS as readonly string[]).includes(value);
}

export function widgetsForPlugin(
  plugin: PreviewPluginId,
): readonly PreviewWidgetId[] {
  return PREVIEW_WIDGETS_BY_PLUGIN[plugin];
}

export function isWidgetIdForPlugin(
  plugin: PreviewPluginId,
  value: string,
): value is PreviewWidgetId {
  return (widgetsForPlugin(plugin) as readonly string[]).includes(value);
}

export function pluginForWidget(widget: PreviewWidgetId): PreviewPluginId {
  for (const plugin of PREVIEW_PLUGIN_IDS) {
    if (isWidgetIdForPlugin(plugin, widget)) {
      return plugin;
    }
  }
  return "github";
}

export function defaultWidgetsForPlugin(
  plugin: PreviewPluginId,
): readonly PreviewWidgetId[] {
  return PREVIEW_DEFAULT_WIDGETS_BY_PLUGIN[plugin];
}

export function pluginScopeWidgets(
  plugin: PreviewPluginId,
): readonly PreviewWidgetId[] {
  if (plugin === "github") {
    return PREVIEW_GITHUB_PLUGIN_SCOPE_WIDGETS;
  }
  return widgetsForPlugin(plugin);
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

function isFilledRole(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
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
    isFilledRole(roles.bg) &&
    isFilledRole(roles.card) &&
    isFilledRole(roles.text) &&
    isFilledRole(roles.muted) &&
    isFilledRole(roles.accent) &&
    isFilledRole(roles.border)
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

export function isPreviewRepoIncludeToken(
  value: string,
): value is PreviewRepoIncludeToken {
  return (PREVIEW_REPO_INCLUDE_TOKENS as readonly string[]).includes(value);
}

export function isPreviewCodingIncludeToken(
  value: string,
): value is PreviewCodingIncludeToken {
  return (PREVIEW_CODING_INCLUDE_TOKENS as readonly string[]).includes(value);
}

export function isPreviewCodingRange(
  value: string,
): value is PreviewCodingRange {
  return (PREVIEW_CODING_RANGE_TOKENS as readonly string[]).includes(value);
}

export function isPreviewChipPreset(value: string): value is PreviewChipPreset {
  return (PREVIEW_CHIP_PRESETS as readonly string[]).includes(value);
}

export function isPreviewChipType(value: string): value is PreviewChipType {
  return (PREVIEW_CHIP_TYPES as readonly string[]).includes(value);
}

export function isTokenQueryKey(key: string): boolean {
  const lower = key.toLowerCase();
  if ((PREVIEW_TOKEN_QUERY_KEYS as readonly string[]).includes(lower)) {
    return true;
  }
  return lower.startsWith("token") || lower.endsWith("_token");
}
