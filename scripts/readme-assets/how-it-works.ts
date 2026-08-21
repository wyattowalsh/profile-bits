import {
  Chip,
  Frame,
  Muted,
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

const STEPS = [
  {
    kicker: "1",
    title: "yaml SSOT",
    body: ".github/profile-bits.yml holds widget options.",
  },
  {
    kicker: "2",
    title: "Takumi engine",
    body: "JSX cards rasterize without a browser.",
  },
  {
    kicker: "3",
    title: "committed files",
    body: "The Action writes embeds. It does not patch README.",
  },
] as const;

function Cell({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}): ReactElement {
  const theme = useBitTheme();
  return createElement(
    "div",
    {
      tw: "flex",
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 16,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: theme.border,
        backgroundColor: theme.card,
        height: "100%",
      },
    },
    createElement(
      Stack,
      { gap: 8 },
      createElement(Chip, null, kicker),
      createElement(Text, { size: 16, weight: 700 }, title),
      createElement(Muted, { size: 12 }, body),
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
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 12,
        padding: 16,
      },
    },
    ...STEPS.map((step) => createElement(Cell, { key: step.title, ...step })),
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
