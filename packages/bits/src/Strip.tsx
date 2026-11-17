import { intensityFill } from "./mix.js";
import { useBitTheme } from "./Theme.js";

export type StripCell = {
  readonly count: number;
  readonly label?: string;
};

export type StripProps = {
  readonly cells: readonly StripCell[];
  readonly cellSize?: number;
  readonly gap?: number;
  readonly maxCount?: number;
};

const STRIP_MARK = "\u2588";

function finiteCount(count: number): number {
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

export function Strip({ cells, cellSize = 10, gap = 2, maxCount }: StripProps) {
  const theme = useBitTheme();
  const size = Math.max(1, cellSize);
  const peak =
    typeof maxCount === "number" && Number.isFinite(maxCount) && maxCount > 0
      ? maxCount
      : cells.reduce((max, cell) => Math.max(max, finiteCount(cell.count)), 0);
  return (
    <div
      tw="flex flex-row"
      style={{ display: "flex", flexDirection: "row", gap }}
    >
      {cells.length === 0 ? (
        <span
          style={{
            color: theme.border,
            fontFamily: theme.font,
            fontSize: size,
            lineHeight: 1,
          }}
        >
          {STRIP_MARK}
        </span>
      ) : (
        cells.map((cell, index) => {
          const fill = intensityFill(
            cell.count,
            peak,
            theme.border,
            theme.accent,
          );
          return (
            <div
              key={cell.label ?? String(index)}
              style={{
                display: "flex",
                width: size,
                height: size,
                borderRadius: 2,
                overflow: "hidden",
                backgroundColor: fill,
                color: fill,
                fontFamily: theme.font,
                fontSize: size,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {STRIP_MARK}
            </div>
          );
        })
      )}
    </div>
  );
}
