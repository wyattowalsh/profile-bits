import { DARK_FLAVOR, LIGHT_FLAVOR } from "../primer.js";
import { THEME_FONT, type ThemeFlavor } from "../types.js";

const PRIMER_LICENSE = "MIT";
const PRIMER_SOURCE_URL = "https://github.com/primer/primitives";

const DIMMED_FLAVOR: ThemeFlavor = {
  id: "github-dimmed",
  family: "github",
  label: "Dimmed",
  polarity: "dark",
  pair: "light",
  license: PRIMER_LICENSE,
  sourceUrl: PRIMER_SOURCE_URL,
  swatches: {
    "bgColor-default": "#212830",
    "bgColor-muted": "#262c36",
    "fgColor-default": "#d1d7e0",
    "fgColor-muted": "#9198a1",
    "fgColor-accent": "#478be6",
    "borderColor-default": "#3d444d",
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

export const GITHUB_FLAVORS: readonly ThemeFlavor[] = [
  LIGHT_FLAVOR,
  DARK_FLAVOR,
  DIMMED_FLAVOR,
];
