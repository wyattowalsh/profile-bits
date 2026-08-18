import type { ReactNode } from "react";
import { useBitTheme } from "./Theme.js";

export function Muted({
  children,
  size = 12,
}: {
  children?: ReactNode;
  size?: number;
}) {
  const theme = useBitTheme();
  return (
    <span
      tw="flex"
      style={{
        color: theme.muted,
        fontFamily: theme.font,
        fontSize: size,
        fontWeight: 400,
      }}
    >
      {children}
    </span>
  );
}
