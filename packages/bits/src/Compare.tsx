import { percentShares } from "./mix.js";
import { useBitTheme } from "./Theme.js";

export type CompareSide = {
  readonly label: string;
  readonly value: number;
};

export type CompareProps = {
  readonly left: CompareSide;
  readonly right: CompareSide;
};

export function Compare({ left, right }: CompareProps) {
  const theme = useBitTheme();
  const [leftPct, rightPct] = percentShares([left.value, right.value]);
  const leftWidth = leftPct === 0 && rightPct === 0 ? 50 : (leftPct ?? 0);
  const rightWidth = leftPct === 0 && rightPct === 0 ? 50 : (rightPct ?? 0);
  return (
    <div
      tw="flex flex-col"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: "100%",
      }}
    >
      <div
        tw="flex flex-row"
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <span
          style={{
            color: theme.muted,
            fontFamily: theme.font,
            fontSize: 10,
          }}
        >
          {`${left.label} ${String(left.value)}`}
        </span>
        <span
          style={{
            color: theme.muted,
            fontFamily: theme.font,
            fontSize: 10,
          }}
        >
          {`${right.label} ${String(right.value)}`}
        </span>
      </div>
      <div
        tw="flex flex-row"
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: 8,
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.border,
        }}
      >
        <div
          style={{
            width: `${leftWidth}%`,
            height: 8,
            backgroundColor: theme.accent,
          }}
        />
        <div
          style={{
            width: `${rightWidth}%`,
            height: 8,
            backgroundColor: theme.muted,
          }}
        />
      </div>
    </div>
  );
}
