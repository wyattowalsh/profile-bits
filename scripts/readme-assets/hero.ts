import {
  Chip,
  Divider,
  Frame,
  Muted,
  Row,
  Stack,
  Stat,
  Text,
  Theme,
  useBitTheme,
} from "../../packages/bits/src/index.ts";
import {
  createElement,
  type ReactElement,
} from "../../packages/renderer/node_modules/react/index.js";
import type { CompositionExtras, ThemeName } from "./types.ts";

const SAMPLE_W = 320;
const SAMPLE_H = 107;

function Hairline(): ReactElement {
  const theme = useBitTheme();
  return createElement("div", {
    tw: "flex",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      backgroundImage: `linear-gradient(${theme.border}17 1px, transparent 1px), linear-gradient(90deg, ${theme.border}17 1px, transparent 1px)`,
      backgroundSize: "40px 40px",
      maskImage:
        "radial-gradient(ellipse 75% 70% at 50% 50%, #000 55%, transparent 100%)",
    },
  });
}

function SampleCard({
  src,
  left,
  top,
  zIndex,
}: {
  src: string;
  left: number;
  top: number;
  zIndex: number;
}): ReactElement {
  const theme = useBitTheme();
  return createElement("img", {
    src,
    width: SAMPLE_W,
    height: SAMPLE_H,
    alt: "",
    style: {
      position: "absolute",
      left,
      top,
      zIndex,
      width: SAMPLE_W,
      height: SAMPLE_H,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
    },
  });
}

function HeroBody({ extras }: { extras?: CompositionExtras }): ReactElement {
  const stats = extras?.sampleSrcs?.stats;
  const languages = extras?.sampleSrcs?.languages;
  const chips = extras?.sampleSrcs?.chips;
  const markSrc = extras?.markSrc;
  const grainSrc = extras?.grainSrc;

  return createElement(
    "div",
    {
      tw: "w-full h-full flex",
      style: {
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      },
    },
    grainSrc
      ? createElement("img", {
          src: grainSrc,
          width: 1200,
          height: 400,
          alt: "",
          style: {
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.06,
            mixBlendMode: "overlay",
          },
        })
      : null,
    createElement(Hairline),
    createElement(
      "div",
      {
        tw: "w-full h-full flex",
        style: {
          position: "relative",
          zIndex: 4,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 48,
          paddingRight: 48,
          gap: 40,
        },
      },
      createElement(
        Stack,
        { gap: 14 },
        markSrc
          ? createElement(
              Row,
              { gap: 10 },
              createElement("img", {
                src: markSrc,
                width: 48,
                height: 48,
                alt: "",
                style: { width: 48, height: 48 },
              }),
              createElement(
                Row,
                { gap: 8 },
                createElement(Chip, null, "JSX to PNG"),
                createElement(Chip, null, "480×160"),
                createElement(Chip, null, "Geist"),
              ),
            )
          : createElement(
              Row,
              { gap: 8 },
              createElement(Chip, null, "JSX to PNG"),
              createElement(Chip, null, "480×160"),
              createElement(Chip, null, "Geist"),
            ),
        createElement(Text, { size: 40, weight: 700 }, "profile-bits"),
        createElement(
          Muted,
          { size: 16 },
          "GitHub profile widgets, rendered from JSX by Takumi.",
        ),
        createElement(
          Row,
          { gap: 8 },
          createElement(Chip, { label: "pack", message: "github" }),
          createElement(Chip, { label: "pack", message: "wakatime" }),
          createElement(Chip, { label: "pack", message: "rss" }),
          createElement(Chip, { label: "pack", message: "http" }),
        ),
        createElement(Divider),
        createElement(
          Row,
          { gap: 24 },
          createElement(Stat, { label: "canvas", value: "480×160" }),
          createElement(Stat, { label: "ratio", value: "3:1" }),
          createElement(Stat, { label: "engine", value: "Takumi" }),
        ),
      ),
      createElement(
        "div",
        {
          tw: "flex",
          style: {
            position: "relative",
            width: 392,
            height: 171,
            overflow: "hidden",
            flexShrink: 0,
          },
        },
        stats
          ? createElement(SampleCard, {
              src: stats,
              left: 0,
              top: 0,
              zIndex: 3,
            })
          : null,
        languages
          ? createElement(SampleCard, {
              src: languages,
              left: 36,
              top: 32,
              zIndex: 2,
            })
          : null,
        chips
          ? createElement(SampleCard, {
              src: chips,
              left: 72,
              top: 64,
              zIndex: 1,
            })
          : null,
      ),
    ),
  );
}

export function element(
  theme: ThemeName,
  extras?: CompositionExtras,
): ReactElement {
  return createElement(
    Theme,
    { theme },
    createElement(Frame, null, createElement(HeroBody, { extras })),
  );
}
