import type { ReactNode } from "react";
import { useBitTheme } from "./Theme.js";

export type EmptyProps = {
  readonly children?: ReactNode;
};

export function Empty({ children }: EmptyProps) {
  const theme = useBitTheme();
  return (
    <div
      tw="w-full h-full flex"
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          color: theme.muted,
          fontFamily: theme.font,
          fontSize: 14,
          fontWeight: 400,
        }}
      >
        {children}
      </span>
    </div>
  );
}
