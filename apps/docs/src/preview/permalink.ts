import {
  type BitPreviewRequest,
  isPreviewNamedTheme,
  isPreviewOutputFormat,
  isPreviewPluginId,
  isPreviewScope,
  isPreviewStatsIncludeToken,
  isPreviewTheme,
  isPreviewWidgetId,
  isTokenQueryKey,
  type PluginPreviewRequest,
  type PreviewBitName,
  type PreviewCustomRoles,
  type PreviewDemoOptions,
  type PreviewLanguagesOptions,
  type PreviewOptions,
  type PreviewOutputFormat,
  type PreviewPluginId,
  type PreviewRequest,
  type PreviewScope,
  type PreviewStatsIncludeToken,
  type PreviewStatsOptions,
  type PreviewTheme,
  type PreviewWidgetId,
  previewThemeParam,
  type WidgetPreviewRequest,
} from "./types";

export const PLAYGROUND_PATH_PREFIX = "/playground";
export const GENERATE_PATH_PREFIX = "/generate";

const OPTIONS_KEY = "options";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function pickBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function pickString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function pickNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function pickDemo(value: unknown): PreviewDemoOptions {
  const rec = asRecord(value);
  if (!rec) {
    return {};
  }
  const out: PreviewDemoOptions = {};
  const text = pickString(rec.text);
  const subtitle = pickString(rec.subtitle);
  const animate = pickBoolean(rec.animate);
  if (text !== undefined) {
    out.text = text;
  }
  if (subtitle !== undefined) {
    out.subtitle = subtitle;
  }
  if (animate !== undefined) {
    out.animate = animate;
  }
  return out;
}

function pickStatsInclude(
  value: unknown,
): PreviewStatsIncludeToken[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter(
    (item): item is PreviewStatsIncludeToken =>
      typeof item === "string" && isPreviewStatsIncludeToken(item),
  );
}

function pickStats(value: unknown): PreviewStatsOptions {
  const rec = asRecord(value);
  if (!rec) {
    return {};
  }
  const out: PreviewStatsOptions = {};
  const filename = pickString(rec.filename);
  const include = pickStatsInclude(rec.include);
  const hide_rank = pickBoolean(rec.hide_rank);
  const avatar = pickBoolean(rec.avatar);
  const animate = pickBoolean(rec.animate);
  const include_private = pickBoolean(rec.include_private);
  const include_forks = pickBoolean(rec.include_forks);
  const include_archived = pickBoolean(rec.include_archived);
  if (filename !== undefined) {
    out.filename = filename;
  }
  if (include !== undefined) {
    out.include = include;
  }
  if (hide_rank !== undefined) {
    out.hide_rank = hide_rank;
  }
  if (avatar !== undefined) {
    out.avatar = avatar;
  }
  if (animate !== undefined) {
    out.animate = animate;
  }
  if (include_private !== undefined) {
    out.include_private = include_private;
  }
  if (include_forks !== undefined) {
    out.include_forks = include_forks;
  }
  if (include_archived !== undefined) {
    out.include_archived = include_archived;
  }
  return out;
}

function pickStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === "string");
}

function pickLanguages(value: unknown): PreviewLanguagesOptions {
  const rec = asRecord(value);
  if (!rec) {
    return {};
  }
  const out: PreviewLanguagesOptions = {};
  const filename = pickString(rec.filename);
  const limit = pickNumber(rec.limit);
  const min_pct = pickNumber(rec.min_pct);
  const exclude = pickStringArray(rec.exclude);
  const animate = pickBoolean(rec.animate);
  const include_private = pickBoolean(rec.include_private);
  const include_forks = pickBoolean(rec.include_forks);
  const include_archived = pickBoolean(rec.include_archived);
  if (filename !== undefined) {
    out.filename = filename;
  }
  if (limit !== undefined) {
    out.limit = limit;
  }
  if (min_pct !== undefined) {
    out.min_pct = min_pct;
  }
  if (exclude !== undefined) {
    out.exclude = exclude;
  }
  if (animate !== undefined) {
    out.animate = animate;
  }
  if (include_private !== undefined) {
    out.include_private = include_private;
  }
  if (include_forks !== undefined) {
    out.include_forks = include_forks;
  }
  if (include_archived !== undefined) {
    out.include_archived = include_archived;
  }
  return out;
}

function pickFormat(value: unknown): PreviewOutputFormat | undefined {
  return typeof value === "string" && isPreviewOutputFormat(value)
    ? value
    : undefined;
}

const CUSTOM_ROLE_KEYS = [
  "bg",
  "card",
  "text",
  "muted",
  "accent",
  "border",
] as const;

function pickTheme(value: unknown): PreviewTheme | undefined {
  return isPreviewTheme(value) ? value : undefined;
}

/** Drop token keys and keep yaml-shaped option fields only. */
export function pickOptions(value: unknown): PreviewOptions {
  const rec = asRecord(value);
  if (!rec) {
    return {};
  }
  const out: PreviewOptions = {};
  if ("demo" in rec) {
    out.demo = pickDemo(rec.demo);
  }
  if ("stats" in rec) {
    out.stats = pickStats(rec.stats);
  }
  if ("languages" in rec) {
    out.languages = pickLanguages(rec.languages);
  }
  const format = pickFormat(rec.format);
  const theme = pickTheme(rec.theme);
  const output_pair = pickBoolean(rec.output_pair);
  if (format !== undefined) {
    out.format = format;
  }
  if (theme !== undefined) {
    out.theme = theme;
  }
  if (output_pair !== undefined) {
    out.output_pair = output_pair;
  }
  return out;
}

function readPlugin(state: PreviewRequest): PreviewPluginId | undefined {
  return state.plugin;
}

function readWidget(state: PreviewRequest): PreviewWidgetId | undefined {
  return state.widget;
}

function readBit(state: PreviewRequest): PreviewBitName | undefined {
  return state.scope === "bit" ? state.bit : undefined;
}

/**
 * Permalink is URLSearchParams only. Never writes tokens, zip, or embed URLs.
 * Extra enumerable keys on `state` (including token-like fields) are ignored.
 */
export function serialize(state: PreviewRequest): URLSearchParams {
  const params = new URLSearchParams();
  const scope = state.scope;
  params.set("scope", scope);

  const plugin = readPlugin(state);
  if (scope === "plugin" || scope === "widget") {
    params.set("plugin", plugin ?? "github");
  } else if (plugin !== undefined) {
    params.set("plugin", plugin);
  }

  const widget = readWidget(state);
  if (scope === "widget") {
    params.set("widget", widget ?? "demo");
  } else if (widget !== undefined) {
    params.set("widget", widget);
  }

  const bit = readBit(state);
  if (scope === "bit") {
    params.set("bit", bit ?? "Theme");
  } else if (bit !== undefined) {
    params.set("bit", String(bit));
  }

  params.set(OPTIONS_KEY, JSON.stringify(pickOptions(state.options)));
  params.set("format", state.format);
  writeThemeParams(params, state.theme);
  params.set("output_pair", state.output_pair ? "true" : "false");
  params.set("user", state.user);

  for (const key of [...params.keys()]) {
    if (isTokenQueryKey(key)) {
      params.delete(key);
    }
  }
  params.delete("zip");
  return params;
}

function toSearchParams(
  input: string | URLSearchParams | URL,
): URLSearchParams {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input);
  }
  if (input instanceof URL) {
    return new URLSearchParams(input.searchParams);
  }
  const trimmed = input.trim();
  if (
    trimmed.includes("://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("?")
  ) {
    try {
      const url = new URL(trimmed, "https://profile-bits.invalid");
      return new URLSearchParams(url.searchParams);
    } catch {
      const query = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed;
      return new URLSearchParams(query);
    }
  }
  return new URLSearchParams(trimmed);
}

function parseBooleanParam(value: string | null): boolean {
  if (value == null) {
    return false;
  }
  return value === "true" || value === "1";
}

function parseOptionsParam(value: string | null): PreviewOptions {
  if (value == null || value.trim() === "") {
    return {};
  }
  try {
    return pickOptions(JSON.parse(value) as unknown);
  } catch {
    return {};
  }
}

function parsePluginParam(value: string | null): PreviewPluginId | undefined {
  if (value == null || !isPreviewPluginId(value)) {
    return undefined;
  }
  return value;
}

function parseWidgetParam(value: string | null): PreviewWidgetId | undefined {
  if (value == null || !isPreviewWidgetId(value)) {
    return undefined;
  }
  return value;
}

function parseBitParam(value: string | null): PreviewBitName | undefined {
  if (value == null || value.trim() === "") {
    return undefined;
  }
  return value;
}

function parseScopeParam(value: string | null): PreviewScope {
  if (value != null && isPreviewScope(value)) {
    return value;
  }
  return "plugin";
}

function parseFormatParam(value: string | null): PreviewOutputFormat {
  if (value != null && isPreviewOutputFormat(value)) {
    return value;
  }
  return "svg";
}

function writeThemeParams(params: URLSearchParams, theme: PreviewTheme): void {
  params.set("theme", previewThemeParam(theme));
  if (typeof theme === "string") {
    return;
  }
  const roles = theme.custom;
  params.set("cbg", roles.bg);
  params.set("ccard", roles.card);
  params.set("ctext", roles.text);
  params.set("cmuted", roles.muted);
  params.set("caccent", roles.accent);
  params.set("cborder", roles.border);
  if (roles.pair !== undefined) {
    params.set("cpair", roles.pair);
  }
}

function readCustomRoles(
  params: URLSearchParams,
): PreviewCustomRoles | undefined {
  const roles: PreviewCustomRoles = {
    bg: params.get("cbg") ?? "",
    card: params.get("ccard") ?? "",
    text: params.get("ctext") ?? "",
    muted: params.get("cmuted") ?? "",
    accent: params.get("caccent") ?? "",
    border: params.get("cborder") ?? "",
  };
  if (CUSTOM_ROLE_KEYS.some((key) => roles[key] === "")) {
    return undefined;
  }
  const pair = params.get("cpair");
  if (pair != null && pair !== "") {
    roles.pair = pair;
  }
  return roles;
}

function parseThemeParam(params: URLSearchParams): PreviewTheme {
  const value = params.get("theme");
  if (value === "custom") {
    const roles = readCustomRoles(params);
    if (roles !== undefined) {
      return { custom: roles };
    }
    return "dark";
  }
  if (value != null && isPreviewNamedTheme(value)) {
    return value;
  }
  return "dark";
}

/**
 * Parse a permalink query string. Token-like keys are dropped.
 * Path/host (embed URL shape) is ignored; only URLSearchParams are read.
 */
export function parse(input: string | URLSearchParams | URL): PreviewRequest {
  const raw = toSearchParams(input);
  const params = stripTokens(raw);
  const scope = parseScopeParam(params.get("scope"));
  const format = parseFormatParam(params.get("format"));
  const theme = parseThemeParam(params);
  const output_pair = parseBooleanParam(params.get("output_pair"));
  const user = params.get("user") ?? "";
  const options = parseOptionsParam(params.get(OPTIONS_KEY));
  const plugin = parsePluginParam(params.get("plugin"));
  const widget = parseWidgetParam(params.get("widget"));
  const bit = parseBitParam(params.get("bit"));
  const globals = { options, format, theme, output_pair, user };

  if (scope === "widget") {
    const request: WidgetPreviewRequest = {
      ...globals,
      scope,
      plugin: plugin ?? "github",
      widget: widget ?? "demo",
    };
    return request;
  }

  if (scope === "bit") {
    const request: BitPreviewRequest = {
      ...globals,
      scope,
      bit: bit ?? "Theme",
    };
    if (plugin !== undefined) {
      request.plugin = plugin;
    }
    if (widget !== undefined) {
      request.widget = widget;
    }
    return request;
  }

  const request: PluginPreviewRequest = {
    ...globals,
    scope: "plugin",
    plugin: plugin ?? "github",
  };
  if (widget !== undefined) {
    request.widget = widget;
  }
  return request;
}

export function stripTokens(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of [...next.keys()]) {
    if (isTokenQueryKey(key)) {
      next.delete(key);
    }
  }
  return next;
}

function swapPreviewPrefix(pathname: string): string {
  if (
    pathname === PLAYGROUND_PATH_PREFIX ||
    pathname.startsWith(`${PLAYGROUND_PATH_PREFIX}/`)
  ) {
    return `${GENERATE_PATH_PREFIX}${pathname.slice(PLAYGROUND_PATH_PREFIX.length)}`;
  }
  if (
    pathname === GENERATE_PATH_PREFIX ||
    pathname.startsWith(`${GENERATE_PATH_PREFIX}/`)
  ) {
    return `${PLAYGROUND_PATH_PREFIX}${pathname.slice(GENERATE_PATH_PREFIX.length)}`;
  }
  return pathname;
}

/**
 * Swap `/playground` ↔ `/generate`, keep the query, strip tokens.
 * Returns path + query (no origin).
 */
export function toCrossLink(href: string): string {
  const trimmed = href.trim();
  if (
    trimmed.startsWith("?") ||
    (!trimmed.includes("/") && !trimmed.includes("://"))
  ) {
    const params = stripTokens(
      new URLSearchParams(trimmed.startsWith("?") ? trimmed.slice(1) : trimmed),
    );
    const query = params.toString();
    return query ? `?${query}` : "";
  }

  const url = new URL(trimmed, "https://profile-bits.invalid");
  const params = stripTokens(url.searchParams);
  const path = swapPreviewPrefix(url.pathname);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
