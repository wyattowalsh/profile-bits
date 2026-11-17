import { useBitTheme } from "./Theme.js";

export type DeltaProps = {
  readonly value: number;
};

const MINUS = "\u2212";
const UP = "\u25B2";
const DOWN = "\u25BC";
const FLAT = "\u2022";

function trimNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return (Math.round(value * 10) / 10).toString();
}

export function formatDelta(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }
  if (value > 0) {
    return `+${trimNumber(value)}`;
  }
  return `${MINUS}${trimNumber(Math.abs(value))}`;
}

export function Delta({ value }: DeltaProps) {
  const theme = useBitTheme();
  const finite = Number.isFinite(value) ? value : 0;
  const color =
    finite > 0 ? theme.accent : finite < 0 ? theme.text : theme.muted;
  const mark = finite > 0 ? UP : finite < 0 ? DOWN : FLAT;
  return (
    <span
      tw="flex"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        color,
        fontFamily: theme.font,
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {`${mark} ${formatDelta(finite)}`}
    </span>
  );
}
