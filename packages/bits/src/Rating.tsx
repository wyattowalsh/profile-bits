import { useBitTheme } from "./Theme.js";

export type RatingProps = {
  readonly value: number;
  readonly outOf?: number;
};

const STAR = "\u2605";
const RATING_DEFAULT = 5;

export function ratingFilled(value: number, outOf = RATING_DEFAULT): number {
  if (!Number.isFinite(value) || !Number.isFinite(outOf) || outOf < 1) {
    return 0;
  }
  const marks = Math.floor(outOf);
  return Math.max(0, Math.min(marks, Math.round(value)));
}

export function Rating({ value, outOf = RATING_DEFAULT }: RatingProps) {
  const theme = useBitTheme();
  const marks = Math.max(1, Math.floor(outOf));
  const filled = ratingFilled(value, marks);
  return (
    <div
      tw="flex flex-row"
      style={{ display: "flex", flexDirection: "row", gap: 2 }}
    >
      {Array.from({ length: marks }, (_, index) => (
        <span
          key={String(index)}
          style={{
            color: index < filled ? theme.accent : theme.border,
            fontFamily: theme.font,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {STAR}
        </span>
      ))}
    </div>
  );
}
