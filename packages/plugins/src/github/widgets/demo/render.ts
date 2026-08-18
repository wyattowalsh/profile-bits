import type { DemoOptions } from "@profile-bits/core";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { DemoWidget } from "./widget.js";

export async function renderDemoSvg(input: {
  text: string;
  subtitle?: string;
  theme?: WidgetTheme;
}): Promise<string> {
  const node = await fromJsx(
    createElement(DemoWidget, {
      text: input.text,
      subtitle: input.subtitle,
      theme: input.theme,
    }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}

export function demoTextFromPayload(
  payload: unknown,
  options: Partial<DemoOptions> = {},
): { text: string; subtitle?: string } {
  if (options.text !== undefined && options.text !== "") {
    const next: { text: string; subtitle?: string } = { text: options.text };
    if (options.subtitle !== undefined) {
      next.subtitle = options.subtitle;
    }
    return next;
  }
  const record =
    payload != null && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const demo =
    record.demo != null && typeof record.demo === "object"
      ? (record.demo as Record<string, unknown>)
      : record;
  const text =
    typeof demo.text === "string" && demo.text !== ""
      ? demo.text
      : "profile-bits";
  const subtitle =
    typeof demo.subtitle === "string" ? demo.subtitle : options.subtitle;
  const next: { text: string; subtitle?: string } = { text };
  if (subtitle !== undefined) {
    next.subtitle = subtitle;
  }
  return next;
}
