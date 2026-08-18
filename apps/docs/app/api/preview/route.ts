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
  type PluginPreviewRequest,
  PREVIEW_RESPONSE_HEADERS,
  type PreviewRequest,
  type WidgetPreviewRequest,
} from "../../../src/preview/types";

export const runtime = "nodejs";

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
  if (rec.plugin !== undefined) {
    if (typeof rec.plugin !== "string" || !isPreviewPluginId(rec.plugin)) {
      return undefined;
    }
  }
  if (rec.widget !== undefined) {
    if (typeof rec.widget !== "string" || !isPreviewWidgetId(rec.widget)) {
      return undefined;
    }
  }

  const output_pair = rec.output_pair === true;
  const options = pickOptions(rec.options);
  const globals = { options, format, theme, output_pair, user };

  if (scope === "plugin") {
    if (typeof rec.plugin !== "string" || !isPreviewPluginId(rec.plugin)) {
      return undefined;
    }
    const request: PluginPreviewRequest = {
      ...globals,
      scope,
      plugin: rec.plugin,
    };
    if (typeof rec.widget === "string" && isPreviewWidgetId(rec.widget)) {
      request.widget = rec.widget;
    }
    return request;
  }

  if (scope === "widget") {
    if (typeof rec.widget !== "string" || !isPreviewWidgetId(rec.widget)) {
      return undefined;
    }
    const request: WidgetPreviewRequest = {
      ...globals,
      scope,
      widget: rec.widget,
    };
    if (typeof rec.plugin === "string" && isPreviewPluginId(rec.plugin)) {
      request.plugin = rec.plugin;
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
  if (typeof rec.plugin === "string" && isPreviewPluginId(rec.plugin)) {
    request.plugin = rec.plugin;
  }
  if (typeof rec.widget === "string" && isPreviewWidgetId(rec.widget)) {
    request.widget = rec.widget;
  }
  return request;
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

  const preview = await renderPreview(body);
  return previewResponse(preview);
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
