import type { FeedOptions } from "@profile-bits/core";
import { type RssClient, RssClientError } from "@profile-bits/integrations";
import { renderFeedFromClient } from "@profile-bits/plugins";
import { resolveWidgetTheme } from "@profile-bits/renderer";
import type {
  RenderWidget,
  WidgetRenderRequest,
  WidgetRenderResult,
} from "./engine.ts";

export class UnhandledFeedWidgetError extends Error {
  override readonly name = "UnhandledFeedWidgetError";

  constructor(id: string) {
    super(`rss render adapter does not handle widget ${id}`);
  }
}

export function createFeedRenderWidget(input: {
  client: RssClient;
}): RenderWidget {
  const { client } = input;
  return async (request) => renderFeedWidget(client, request);
}

async function renderFeedWidget(
  client: RssClient,
  request: WidgetRenderRequest,
): Promise<WidgetRenderResult> {
  if (request.id !== "feed") {
    throw new UnhandledFeedWidgetError(request.id);
  }
  const options = feedOptions(request);
  try {
    const svg = await renderFeedFromClient(client, {
      url: options.url,
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
    if (error instanceof RssClientError) {
      return { id: request.id, outcome: "fail_widget" };
    }
    throw error;
  }
}

function feedOptions(request: WidgetRenderRequest): FeedOptions {
  const options = request.options;
  if (!("url" in options) || !("limit" in options)) {
    throw new UnhandledFeedWidgetError(request.id);
  }
  return options;
}
