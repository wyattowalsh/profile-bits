import {
  Chip,
  Frame,
  Muted,
  Row,
  Stack,
  Text,
  Theme,
  useBitTheme,
} from "../../packages/bits/src/index.ts";
import {
  createElement,
  type ReactElement,
} from "../../packages/renderer/node_modules/react/index.js";
import type { CompositionExtras, ThemeName } from "./types.ts";

const PACKS = [
  {
    id: "github",
    auth: "optional",
    widgets: ["demo (opt-in)", "stats", "languages"],
  },
  {
    id: "wakatime",
    auth: "required",
    widgets: ["coding"],
  },
  {
    id: "rss",
    auth: "none",
    widgets: ["feed"],
  },
  {
    id: "http",
    auth: "{} is widget-less",
    widgets: ["json", "chips"],
  },
] as const;

function PackCard({
  id,
  auth,
  widgets,
}: {
  id: string;
  auth: string;
  widgets: readonly string[];
}): ReactElement {
  const theme = useBitTheme();
  return createElement(
    "div",
    {
      tw: "flex",
      style: {
        display: "flex",
        flexDirection: "column",
        padding: 14,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: theme.border,
        backgroundColor: theme.card,
        height: "100%",
        gap: 8,
      },
    },
    createElement(Text, { size: 16, weight: 700 }, id),
    createElement(Chip, { label: "auth", message: auth }),
    createElement(
      Stack,
      { gap: 6 },
      ...widgets.map((widget) =>
        createElement(Muted, { key: widget, size: 12 }, widget),
      ),
    ),
  );
}

function Body(): ReactElement {
  return createElement(
    "div",
    {
      tw: "w-full h-full flex",
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 16,
        gap: 10,
      },
    },
    createElement(
      Row,
      { gap: 8 },
      createElement(Chip, null, "first-party packs"),
      createElement(Muted, { size: 12 }, "do not invent a fifth"),
    ),
    createElement(
      "div",
      {
        tw: "flex",
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 12,
          flexGrow: 1,
          minHeight: 0,
        },
      },
      ...PACKS.map((pack) =>
        createElement(PackCard, { key: pack.id, ...pack }),
      ),
    ),
  );
}

export function element(
  theme: ThemeName,
  _extras?: CompositionExtras,
): ReactElement {
  return createElement(
    Theme,
    { theme },
    createElement(Frame, null, createElement(Body)),
  );
}
