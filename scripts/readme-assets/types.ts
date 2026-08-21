import type { ReactElement } from "../../packages/renderer/node_modules/react/index.js";

export type ThemeName = "dark" | "light";

export type CompositionExtras = {
  sampleSrcs?: {
    stats?: string;
    languages?: string;
    chips?: string;
  };
  markSrc?: string;
  grainSrc?: string;
};

export type Composition = (
  theme: ThemeName,
  extras?: CompositionExtras,
) => ReactElement;
