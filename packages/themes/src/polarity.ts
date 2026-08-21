import { contrastRatio } from "./contrast.ts";
import type { ThemePolarity } from "./types.ts";

export function polarityFromHex(bg: string): ThemePolarity {
  const vsWhite = contrastRatio(bg, "#ffffff");
  const vsBlack = contrastRatio(bg, "#000000");
  if (vsWhite === vsBlack) {
    throw new Error("Unable to determine theme polarity from background");
  }
  return vsWhite > vsBlack ? "dark" : "light";
}
