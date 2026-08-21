import { contrastRatio } from "./contrast.ts";
import type { ThemePalette } from "./types.ts";

export type PaletteContrastRow = {
  fg: string;
  bg: string;
  ratio: number;
  aa: boolean;
};

const AA_MIN_RATIO = 4.5;

function row(fg: string, bg: string): PaletteContrastRow {
  const ratio = contrastRatio(fg, bg);
  return {
    fg,
    bg,
    ratio,
    aa: ratio >= AA_MIN_RATIO,
  };
}

export function paletteContrastReport(
  palette: ThemePalette,
): PaletteContrastRow[] {
  return [
    row(palette.text, palette.bg),
    row(palette.muted, palette.bg),
    row(palette.accent, palette.bg),
    row(palette.text, palette.card),
    row(palette.muted, palette.card),
    row(palette.accent, palette.card),
    row("#ffffff", palette.accent),
    row("#000000", palette.accent),
  ];
}
