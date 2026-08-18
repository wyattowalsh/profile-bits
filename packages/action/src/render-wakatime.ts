import type { CodingOptions } from "@profile-bits/core";
import {
  type WakatimeClient,
  WakatimeClientError,
} from "@profile-bits/integrations";
import { renderCodingSvg } from "@profile-bits/plugins";
import { resolveWidgetTheme } from "@profile-bits/renderer";
import type {
  RenderWidget,
  WidgetRenderRequest,
  WidgetRenderResult,
} from "./engine.ts";

export class UnhandledWakatimeWidgetError extends Error {
  override readonly name = "UnhandledWakatimeWidgetError";

  constructor(id: string) {
    super(`wakatime render adapter does not handle widget ${id}`);
  }
}

export function createWakatimeRenderWidget(input: {
  client: WakatimeClient;
}): RenderWidget {
  const { client } = input;
  return async (request) => renderWakatimeWidget(client, request);
}

async function renderWakatimeWidget(
  client: WakatimeClient,
  request: WidgetRenderRequest,
): Promise<WidgetRenderResult> {
  if (request.id !== "coding") {
    throw new UnhandledWakatimeWidgetError(request.id);
  }
  const options = codingOptions(request);
  try {
    const payload = await client.fetchStats({
      range: options.range,
      include: options.include,
      limit: options.limit,
    });
    const svg = await renderCodingSvg({
      payload,
      include: options.include,
      limit: options.limit,
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
    if (
      error instanceof WakatimeClientError &&
      error.outcome === "fail_widget"
    ) {
      return { id: request.id, outcome: "fail_widget" };
    }
    throw error;
  }
}

function codingOptions(request: WidgetRenderRequest): CodingOptions {
  const options = request.options;
  if (!isCodingOptions(options)) {
    throw new UnhandledWakatimeWidgetError(request.id);
  }
  return options;
}

function isCodingOptions(
  options: WidgetRenderRequest["options"],
): options is CodingOptions {
  return (
    "filename" in options &&
    "range" in options &&
    "include" in options &&
    "limit" in options
  );
}
