import type { ReactNode } from "react";
import { useBitTheme } from "./Theme.js";

export type RingProps = {
  readonly value: ReactNode;
  readonly size?: number;
};

export function Ring({ value, size = 40 }: RingProps) {
  const theme = useBitTheme();
  const px = Math.max(16, size);
  return (
    <div
      tw="flex"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: px,
        height: px,
        borderRadius: px / 2,
        borderWidth: 2,
        borderColor: theme.accent,
        color: theme.text,
        fontFamily: theme.font,
        fontSize: Math.min(14, Math.floor(px / 3)),
        fontWeight: 700,
      }}
    >
      {value}
    </div>
  );
}
