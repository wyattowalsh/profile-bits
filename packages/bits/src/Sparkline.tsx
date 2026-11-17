import { useBitTheme } from "./Theme.js";

export type SparklineProps = {
  readonly values: readonly number[];
  readonly height?: number;
  readonly gap?: number;
  readonly barWidth?: number;
};

const SPARK_HEIGHT = 28;
const SPARK_GAP = 2;
const SPARK_BAR = 4;
const SPARK_MARK = "\u2588";

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function Sparkline({
  values,
  height = SPARK_HEIGHT,
  gap = SPARK_GAP,
  barWidth = SPARK_BAR,
}: SparklineProps) {
  const theme = useBitTheme();
  const plot = Math.max(1, height);
  const width = Math.max(1, barWidth);
  const peak = values.reduce(
    (max, value) => Math.max(max, finiteOrZero(value)),
    0,
  );

  return (
    <div
      tw="flex flex-row"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        gap,
        height: plot,
      }}
    >
      {values.length === 0 ? (
        <span
          style={{
            color: theme.border,
            fontFamily: theme.font,
            fontSize: 1,
            lineHeight: 1,
          }}
        >
          {SPARK_MARK}
        </span>
      ) : (
        values.map((value, index) => {
          const amount = finiteOrZero(value);
          const bar =
            peak <= 0 ? 1 : Math.max(1, Math.round((amount / peak) * plot));
          const fill = amount > 0 ? theme.accent : theme.border;
          return (
            <div
              key={String(index)}
              style={{
                display: "flex",
                width,
                height: bar,
                backgroundColor: fill,
                color: fill,
                borderRadius: 2,
                fontFamily: theme.font,
                fontSize: bar,
                fontWeight: 700,
                lineHeight: 1,
                overflow: "hidden",
              }}
            >
              {SPARK_MARK}
            </div>
          );
        })
      )}
    </div>
  );
}
