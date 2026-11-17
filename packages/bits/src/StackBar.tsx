import { percentShares, segmentFill } from "./mix.js";
import { useBitTheme } from "./Theme.js";

export type StackBarSegment = {
  readonly value: number;
  readonly label?: string;
};

export type StackBarProps = {
  readonly segments: readonly StackBarSegment[];
  readonly height?: number;
};

const STACK_HEIGHT = 8;
const STACK_MARK = "\u2588";

export function StackBar({ segments, height = STACK_HEIGHT }: StackBarProps) {
  const theme = useBitTheme();
  const track = Math.max(1, height);
  const shares = percentShares(segments.map((segment) => segment.value));
  const painted = shares.flatMap((share, index) =>
    share > 0 ? [{ index, share }] : [],
  );
  return (
    <div
      tw="flex flex-row"
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: track,
        borderRadius: 3,
        overflow: "hidden",
        backgroundColor: theme.border,
      }}
    >
      {painted.length === 0 ? (
        <span
          style={{
            color: theme.border,
            fontFamily: theme.font,
            fontSize: track,
            lineHeight: 1,
          }}
        >
          {STACK_MARK}
        </span>
      ) : (
        painted.map((segment, colorIndex) => {
          const fill = segmentFill(
            colorIndex,
            painted.length,
            theme.accent,
            theme.muted,
          );
          return (
            <div
              key={String(segment.index)}
              style={{
                display: "flex",
                width: `${segment.share}%`,
                height: track,
                overflow: "hidden",
                backgroundColor: fill,
                color: fill,
                fontFamily: theme.font,
                fontSize: track,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {STACK_MARK}
            </div>
          );
        })
      )}
    </div>
  );
}
