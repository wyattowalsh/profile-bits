import {
  Frame,
  Muted,
  Row,
  Text,
  Theme,
  useBitTheme,
} from "../../packages/bits/src/index.ts";
import {
  createElement,
  type ReactElement,
} from "../../packages/renderer/node_modules/react/index.js";
import type { CompositionExtras, ThemeName } from "./types.ts";

const NODES = [
  "yaml",
  "thin action.yml",
  "action engine",
  "plugins",
  "integrations",
  "bits",
  "renderer",
  "files",
] as const;

function Box({ label }: { label: string }): ReactElement {
  const theme = useBitTheme();
  return createElement(
    "div",
    {
      tw: "flex",
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 8,
        paddingBottom: 8,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: theme.border,
        backgroundColor: theme.card,
      },
    },
    createElement(Text, { size: 12, weight: 600 }, label),
  );
}

function Arrow(): ReactElement {
  return createElement(Muted, { size: 14 }, ">");
}

function Body(): ReactElement {
  const items: ReactElement[] = [];
  NODES.forEach((label, index) => {
    items.push(createElement(Box, { key: label, label }));
    if (index < NODES.length - 1) {
      items.push(createElement(Arrow, { key: `a-${label}` }));
    }
  });
  return createElement(
    "div",
    {
      tw: "w-full h-full flex",
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 20,
        gap: 12,
      },
    },
    createElement(Muted, { size: 12 }, "yaml + thin inputs to Takumi files"),
    createElement(Row, { gap: 8 }, ...items),
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
