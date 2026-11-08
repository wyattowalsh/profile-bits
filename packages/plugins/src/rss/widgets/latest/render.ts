import type { RssClient } from "@profile-bits/integrations";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { type LatestReaderSource, sliceLatestItems } from "./view-model.js";
import { LatestWidget } from "./widget.js";

export type RssLatestClient = RssClient;

export async function renderLatestSvg(input: {
  items: LatestReaderSource;
  limit: number;
  theme?: WidgetTheme;
  timezone?: string;
}): Promise<string> {
  const node = await fromJsx(
    createElement(LatestWidget, {
      items: sliceLatestItems(input.items, input.limit),
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}

/** Consume a cached rss dump. The widget performs no HTTP. */
export async function renderLatestFromClient(
  client: RssClient,
  input: {
    url: string;
    limit: number;
    theme?: WidgetTheme;
    timezone?: string;
  },
): Promise<string> {
  const dump = await client.fetchFeed(input.url);
  return renderLatestSvg({
    items: dump,
    limit: input.limit,
    ...(input.theme !== undefined ? { theme: input.theme } : {}),
    ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
  });
}
