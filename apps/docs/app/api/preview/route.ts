import { type ThemeConfig, themeMembersFor } from "@profile-bits/core";
import { TakumiRenderError, TakumiTreeError } from "@profile-bits/renderer";
import { pickOptions } from "../../../src/preview/permalink";
import {
  assertPreviewOrigin,
  isPreviewOriginError,
} from "../../../src/preview/server/origin";
import { renderPreview } from "../../../src/preview/server/render-preview";
import {
  type BitPreviewRequest,
  isPreviewOutputFormat,
  isPreviewPluginId,
  isPreviewScope,
  isPreviewTheme,
  isPreviewWidgetId,
  isTokenQueryKey,
  isWidgetIdForPlugin,
  type PluginPreviewRequest,
  PREVIEW_RESPONSE_HEADERS,
  type PreviewPluginId,
  type PreviewRequest,
  type PreviewTheme,
  type PreviewWidgetId,
  type WidgetPreviewRequest,
} from "../../../src/preview/types";

export const runtime = "nodejs";

/** POST is layout preview for first-party packs. Not an embed API. */
function parsePreviewPlugin(value: unknown): PreviewPluginId | undefined {
  if (typeof value !== "string" || !isPreviewPluginId(value)) {
    return undefined;
  }
  return value;
}

function parsePreviewWidget(
  value: unknown,
  plugin: PreviewPluginId | undefined,
): PreviewWidgetId | undefined {
  if (typeof value !== "string" || !isPreviewWidgetId(value)) {
    return undefined;
  }
  if (plugin !== undefined && !isWidgetIdForPlugin(plugin, value)) {
    return undefined;
  }
  return value;
}

function parsePreviewRequest(value: unknown): PreviewRequest | undefined {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const rec: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (isTokenQueryKey(key) || key === "zip") {
      continue;
    }
    rec[key] = val;
  }

  const scope = rec.scope;
  if (typeof scope !== "string" || !isPreviewScope(scope)) {
    return undefined;
  }
  const format = rec.format;
  if (typeof format !== "string" || !isPreviewOutputFormat(format)) {
    return undefined;
  }
  const theme = rec.theme;
  if (!isPreviewTheme(theme)) {
    return undefined;
  }
  const user = rec.user;
  if (typeof user !== "string" || user.trim() === "") {
    return undefined;
  }

  let plugin: PreviewPluginId | undefined;
  if (rec.plugin !== undefined) {
    plugin = parsePreviewPlugin(rec.plugin);
    if (plugin === undefined) {
      return undefined;
    }
  }

  let widget: PreviewWidgetId | undefined;
  if (rec.widget !== undefined) {
    widget = parsePreviewWidget(rec.widget, plugin);
    if (widget === undefined) {
      return undefined;
    }
  }

  const output_pair = rec.output_pair === true;
  try {
    themeMembersFor({
      theme: toThemeConfig(theme),
      output_pair,
    });
  } catch {
    return undefined;
  }
  const options = pickOptions(rec.options);
  const globals = { options, format, theme, output_pair, user };

  if (scope === "plugin") {
    if (plugin === undefined) {
      return undefined;
    }
    const request: PluginPreviewRequest = {
      ...globals,
      scope,
      plugin,
    };
    if (widget !== undefined) {
      request.widget = widget;
    }
    return request;
  }

  if (scope === "widget") {
    if (widget === undefined) {
      return undefined;
    }
    const request: WidgetPreviewRequest = {
      ...globals,
      scope,
      widget,
    };
    if (plugin !== undefined) {
      request.plugin = plugin;
    }
    return request;
  }

  if (typeof rec.bit !== "string" || rec.bit.trim() === "") {
    return undefined;
  }
  const request: BitPreviewRequest = {
    ...globals,
    scope: "bit",
    bit: rec.bit,
  };
  if (plugin !== undefined) {
    request.plugin = plugin;
  }
  if (widget !== undefined) {
    request.widget = widget;
  }
  return request;
}

function toThemeConfig(theme: PreviewTheme): ThemeConfig {
  return theme as ThemeConfig;
}

function previewResponse(
  body: unknown,
  init: { status?: number } = {},
): Response {
  return Response.json(body, {
    status: init.status,
    headers: PREVIEW_RESPONSE_HEADERS,
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertPreviewOrigin(request);
  } catch (error) {
    if (isPreviewOriginError(error)) {
      return error.toResponse();
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return previewResponse({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = parsePreviewRequest(parsed);
  if (body === undefined) {
    return previewResponse({ error: "Invalid preview body" }, { status: 400 });
  }

  try {
    const preview = await renderPreview(body);
    return previewResponse(preview);
  } catch (error) {
    if (
      error instanceof TakumiRenderError ||
      error instanceof TakumiTreeError
    ) {
      return previewResponse(
        { error: "Preview render failed" },
        { status: 422 },
      );
    }
    throw error;
  }
}

export function GET(_request: Request): Response {
  return new Response(null, {
    status: 405,
    headers: {
      ...PREVIEW_RESPONSE_HEADERS,
      Allow: "POST",
    },
  });
}
