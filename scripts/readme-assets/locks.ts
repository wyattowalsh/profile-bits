import {
  Chip,
  Frame,
  Muted,
  Row,
  Stack,
  Text,
  Theme,
} from "../../packages/bits/src/index.ts";
import {
  createElement,
  type ReactElement,
} from "../../packages/renderer/node_modules/react/index.js";
import type { CompositionExtras, ThemeName } from "./types.ts";

const LOCKS = [
  "no embed API",
  "yaml SSOT",
  "never unauth GitHub",
  "Action commits files",
  "gist is not CDN",
] as const;

function Body(): ReactElement {
  return createElement(
    "div",
    {
      tw: "w-full h-full flex",
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        paddingLeft: 24,
        paddingRight: 24,
      },
    },
    createElement(
      Stack,
      { gap: 10 },
      createElement(Text, { size: 16, weight: 700 }, "Locks"),
      createElement(Muted, { size: 12 }, "Honest limits. Not a marketplace."),
      createElement(
        Row,
        { gap: 8 },
        ...LOCKS.map((lock) => createElement(Chip, { key: lock }, lock)),
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
