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

const FORMATS = ["svg", "png", "jpeg", "webp", "ico", "gif", "apng"] as const;

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
      Row,
      { gap: 16 },
      createElement(
        Stack,
        { gap: 4 },
        createElement(Text, { size: 14, weight: 700 }, "formats"),
        createElement(Muted, { size: 11 }, "default svg still"),
      ),
      createElement(
        Row,
        { gap: 8 },
        ...FORMATS.map((format) =>
          createElement(Chip, { key: format }, format),
        ),
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
