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
import { loadChipsPayloads, toChipsWidgetError } from "./load.js";
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
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
    }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}

/** Widget reader: map cached raw badge JSON to `{ label, message, color? }`. */
export function readChipsBadges(
  payloads: readonly unknown[],
): NormalizedBadge[] {
  try {
    return payloads.map((payload) => normalizeBadgeJson(payload));
  } catch (error: unknown) {
    throw toChipsWidgetError(error);
  }
}

/** Consume cached badge JSON payloads. The widget performs no HTTP. */
export async function renderChipsFromPayloads(input: {
  payloads: readonly unknown[];
  theme?: WidgetTheme;
}): Promise<string> {
  return renderChipsSvg({
    badges: readChipsBadges(input.payloads),
    ...(input.theme !== undefined ? { theme: input.theme } : {}),
  });
}

export async function renderChipsFromClient(
  client: HttpClient,
  options: ChipsOptions,
  ctx: { user: string; theme?: WidgetTheme },
): Promise<string> {
  const payloads = await loadChipsPayloads(client, options, ctx);
  return renderChipsFromPayloads({
    payloads,
    ...(ctx.theme !== undefined ? { theme: ctx.theme } : {}),
  });
}
