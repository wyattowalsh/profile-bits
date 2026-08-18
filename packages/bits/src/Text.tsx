import type { ReactNode } from "react";
import { useBitTheme } from "./Theme.js";

export function Text({
  children,
  size = 14,
  weight = 600,
}: {
  children?: ReactNode;
  size?: number;
  weight?: number;
}) {
  const theme = useBitTheme();
  return (
    <span
      tw="flex"
      style={{
        color: theme.text,
        fontFamily: theme.font,
        fontSize: size,
        fontWeight: weight,
      }}
    >
      {children}
    </span>
  );
}
