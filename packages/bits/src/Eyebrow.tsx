import type { ReactNode } from "react";
import { useBitTheme } from "./Theme.js";

export type EyebrowProps = {
  readonly children?: ReactNode;
};

export function Eyebrow({ children }: EyebrowProps) {
  const theme = useBitTheme();
  return (
    <span
      tw="flex"
      style={{
        color: theme.muted,
        fontFamily: theme.font,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 1.2,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}
