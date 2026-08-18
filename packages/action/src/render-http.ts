import type { JsonOptions } from "@profile-bits/core";
import { type HttpClient, HttpClientError } from "@profile-bits/integrations";
import { JsonWidgetError, renderJsonFromClient } from "@profile-bits/plugins";
import { resolveWidgetTheme } from "@profile-bits/renderer";
import type {
  RenderWidget,
  WidgetRenderRequest,
  WidgetRenderResult,
} from "./engine.ts";

export class UnhandledHttpWidgetError extends Error {
  override readonly name = "UnhandledHttpWidgetError";

  constructor(id: string) {
    super(`http render adapter does not handle widget ${id}`);
  }
}

export function createHttpRenderWidget(input: {
  client: HttpClient;
}): RenderWidget {
  const { client } = input;
  return async (request) => renderHttpWidget(client, request);
}

async function renderHttpWidget(
  client: HttpClient,
  request: WidgetRenderRequest,
): Promise<WidgetRenderResult> {
  if (request.id !== "json") {
    throw new UnhandledHttpWidgetError(request.id);
  }
  const options = jsonOptions(request);
  try {
    const svg = await renderJsonFromClient(client, {
      url: options.url,
      jmespath: options.jmespath,
      timeout_ms: options.timeout_ms,
      ...(options.headers !== undefined ? { headers: options.headers } : {}),
      theme: resolveWidgetTheme(request.theme),
    });
    return {
      id: request.id,
      outcome: "render",
      files: [
        {
          path: `${options.filename}.${request.config.format}`,
          contents: svg,
        },
      ],
    };
  } catch (error: unknown) {
    if (error instanceof JsonWidgetError || error instanceof HttpClientError) {
      return { id: request.id, outcome: "fail_widget" };
    }
    throw error;
  }
}

function jsonOptions(request: WidgetRenderRequest): JsonOptions {
  const options = request.options;
  if (!("jmespath" in options) || !("url" in options)) {
    throw new UnhandledHttpWidgetError(request.id);
  }
  return options;
}
