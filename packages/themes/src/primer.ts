import { THEME_FONT, type ThemeFlavor } from "./types.js";

const PRIMER_LICENSE = "MIT";
const PRIMER_SOURCE_URL = "https://github.com/primer/primitives";

export const LIGHT_FLAVOR: ThemeFlavor = {
  id: "light",
  family: "github",
  label: "Light",
  polarity: "light",
  pair: "dark",
  license: PRIMER_LICENSE,
  sourceUrl: PRIMER_SOURCE_URL,
  swatches: {
    "bgColor-default": "#ffffff",
    "bgColor-muted": "#f6f8fa",
    "fgColor-default": "#1f2328",
    "fgColor-muted": "#59636e",
    "fgColor-accent": "#0969da",
    "borderColor-default": "#d0d7de",
  },
  roles: {
    bg: "bgColor-default",
    card: "bgColor-muted",
    text: "fgColor-default",
    muted: "fgColor-muted",
    accent: "fgColor-accent",
    border: "borderColor-default",
    font: THEME_FONT,
  },
};

export const DARK_FLAVOR: ThemeFlavor = {
  id: "dark",
  family: "github",
  label: "Dark",
  polarity: "dark",
  pair: "light",
  license: PRIMER_LICENSE,
  sourceUrl: PRIMER_SOURCE_URL,
  swatches: {
    "bgColor-default": "#0d1117",
    "bgColor-muted": "#161b22",
    "fgColor-default": "#e6edf3",
    "fgColor-muted": "#8b949e",
    "fgColor-accent": "#58a6ff",
    "borderColor-default": "#30363d",
  },
  roles: {
    bg: "bgColor-default",
    card: "bgColor-muted",
    text: "fgColor-default",
    muted: "fgColor-muted",
    accent: "fgColor-accent",
    border: "borderColor-default",
    font: THEME_FONT,
  },
};
