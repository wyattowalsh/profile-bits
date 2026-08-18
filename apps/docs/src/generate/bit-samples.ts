import {
  Avatar,
  Bar,
  Chip,
  Divider,
  Frame,
  Muted,
  Row,
  Stack,
  Stat,
  Text,
  Theme,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import { createElement, type ReactElement } from "react";
import { PREVIEW_BIT_IDS, type PreviewBitName } from "../preview/types";

export const BIT_SAMPLE_IDS = PREVIEW_BIT_IDS;

export function bitSampleElement(
  bit: PreviewBitName,
  theme: WidgetTheme = "dark",
): ReactElement {
  const inner = sampleInner(bit);
  return createElement(Theme, { theme }, createElement(Frame, null, inner));
}

function sampleInner(bit: PreviewBitName): ReactElement {
  switch (bit) {
    case "Theme":
      return createElement(Text, null, "Theme");
    case "Frame":
      return createElement(Text, null, "Frame");
    case "Stack":
      return createElement(Stack, null, createElement(Text, null, "Stack"));
    case "Row":
      return createElement(Row, null, createElement(Text, null, "Row"));
    case "Text":
      return createElement(Text, null, "Text");
    case "Muted":
      return createElement(Muted, null, "Muted");
    case "Stat":
      return createElement(Stat, { label: "Stars", value: "12" });
    case "Bar":
      return createElement(Bar, { pct: 42, label: "TypeScript" });
    case "Chip":
      return createElement(Chip, null, "Chip");
    case "Avatar":
      return createElement(Avatar, {
        src: "https://avatars.githubusercontent.com/u/583231?v=4",
        size: 36,
      });
    case "Divider":
      return createElement(Divider, null);
    default:
      return createElement(Text, null, String(bit));
  }
}
