import { useBitTheme } from "./Theme.js";

export const DOT_TONES = ["accent", "muted", "border", "text"] as const;
export type DotTone = (typeof DOT_TONES)[number];

export type DotProps = {
  readonly size?: number;
  readonly tone?: DotTone;
};

const DOT_MARK = "\u25CF";

export function Dot({ size = 8, tone = "accent" }: DotProps) {
  const theme = useBitTheme();
  const px = Math.max(1, size);
  return (
    <span
      tw="flex"
      style={{
        display: "flex",
        width: px,
        height: px,
        borderRadius: px / 2,
        overflow: "hidden",
        backgroundColor: theme[tone],
        color: theme[tone],
        fontFamily: theme.font,
        fontSize: px,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {DOT_MARK}
    </span>
  );
}
