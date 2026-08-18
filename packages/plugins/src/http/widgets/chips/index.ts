import type { ChipsOptions } from "@profile-bits/core";
import {
  type HttpClient,
  type NormalizedBadge,
  normalizeBadgeJson,
} from "@profile-bits/integrations";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import {
  ChipsWidgetError,
  loadChipsPayloads,
  toChipsWidgetError,
} from "./load.js";
import { ChipsWidget } from "./widget.js";

export { ChipsWidgetError, loadChipsPayloads } from "./load.js";
export { ChipsWidget, NO_CHIPS_DATA } from "./widget.js";

export async function renderChipsSvg(input: {
  badges: readonly NormalizedBadge[];
  theme?: WidgetTheme;
}): Promise<string> {
  const node = await fromJsx(
    createElement(ChipsWidget, {
      badges: input.badges,
      theme: input.theme,
    }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}

/** Consume cached badge JSON payloads. The widget performs no HTTP. */
export async function renderChipsFromPayloads(input: {
  payloads: readonly unknown[];
  theme?: WidgetTheme;
}): Promise<string> {
  let badges: NormalizedBadge[];
  try {
    badges = input.payloads.map((payload) => normalizeBadgeJson(payload));
  } catch (error: unknown) {
    throw toChipsWidgetError(error);
  }
  return renderChipsSvg({
    badges,
    theme: input.theme,
  });
}

export async function renderChipsFromClient(
  client: HttpClient,
  options: ChipsOptions,
  ctx: { user: string },
): Promise<string> {
  const badges = await loadChipsPayloads(client, options, ctx);
  return renderChipsSvg({ badges });
}
