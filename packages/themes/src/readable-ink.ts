import { contrastRatio } from "./contrast.ts";

export function readableInk(fill: string): "#ffffff" | "#000000" {
  const vsWhite = contrastRatio("#ffffff", fill);
  const vsBlack = contrastRatio("#000000", fill);
  return vsWhite > vsBlack ? "#ffffff" : "#000000";
}
