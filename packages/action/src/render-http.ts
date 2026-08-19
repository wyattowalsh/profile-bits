import type { ChipsOptions, JsonOptions } from "@profile-bits/core";
import { type HttpClient, HttpClientError } from "@profile-bits/integrations";
import {
  ChipsWidgetError,
  JsonWidgetError,
  renderChipsFromClient,
  renderJsonFromClient,
} from "@profile-bits/plugins";
import { resolveWidgetTheme } from "@profile-bits/renderer";
import type {
  RenderWidget,
  WidgetRenderRequest,
  WidgetRenderResult,
} from "./engine.ts";
import { logWorkflowWarning } from "./workflow-log.ts";

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
  const chips = chipsOptions(request);
  if (chips !== undefined) {
    try {
      const svg = await renderChipsFromClient(client, chips, {
        user: request.inputs.user ?? "",
        theme: request.theme,
      });
      return {
        id: request.id,
        outcome: "render",
        files: [
          {
            path: `${chips.filename}.${request.config.format}`,
            contents: svg,
          },
        ],
      };
    } catch (error: unknown) {
      if (error instanceof ChipsWidgetError) {
        logHttpFailWidget("chips", error);
        return { id: request.id, outcome: "fail_widget" };
      }
      throw error;
    }
  }
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
      logHttpFailWidget("json", error);
      return { id: request.id, outcome: "fail_widget" };
    }
    throw error;
  }
}

function logHttpFailWidget(widget: "json" | "chips", error: unknown): void {
  logWorkflowWarning({
    message: formatHttpFailWidgetLine(widget, error),
    group: `http ${widget}`,
  });
}

function formatHttpFailWidgetLine(
  widget: "json" | "chips",
  error: unknown,
): string {
  const parts = [`http ${widget} fail_widget`];
  const clientError = httpClientErrorFromCause(error);
  if (clientError === undefined) {
    return parts.join(" ");
  }
  if (clientError.code !== undefined) {
    parts.push(`code=${clientError.code}`);
  }
  if (clientError.status !== undefined) {
    parts.push(`status=${clientError.status}`);
  }
  const host = hostnameField(clientError.host);
  if (host !== undefined) {
    parts.push(`host=${host}`);
  }
  if (clientError.attempt !== undefined) {
    parts.push(`attempt=${clientError.attempt}`);
  }
  return parts.join(" ");
}

function httpClientErrorFromCause(error: unknown): HttpClientError | undefined {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current != null && !seen.has(current)) {
    seen.add(current);
    if (current instanceof HttpClientError) {
      return current;
    }
    if (current instanceof Error) {
      current = current.cause;
      continue;
    }
    break;
  }
  return undefined;
}

function hostnameField(host: string | undefined): string | undefined {
  if (host === undefined || host === "") {
    return undefined;
  }
  if (
    host.includes("/") ||
    host.includes("?") ||
    host.includes("#") ||
    host.includes("@")
  ) {
    return undefined;
  }
  return host;
}

function chipsOptions(request: WidgetRenderRequest): ChipsOptions | undefined {
  const options = request.options;
  if (request.id === "chips" && "preset" in options) {
    return options;
  }
  return undefined;
}

function jsonOptions(request: WidgetRenderRequest): JsonOptions {
  const options = request.options;
  if (!("jmespath" in options) || !("url" in options)) {
    throw new UnhandledHttpWidgetError(request.id);
  }
  return options;
}
