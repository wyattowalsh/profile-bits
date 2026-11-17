import type { ReactNode } from "react";
import { useBitTheme } from "./Theme.js";

export type CalloutProps = {
  readonly children?: ReactNode;
};

export function Callout({ children }: CalloutProps) {
  const theme = useBitTheme();
  return (
    <div
      tw="flex"
      style={{
        display: "flex",
        width: "100%",
        borderLeftWidth: 3,
        borderLeftColor: theme.accent,
        paddingLeft: 8,
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      <span
        style={{
          color: theme.text,
          fontFamily: theme.font,
          fontSize: 12,
          fontWeight: 400,
        }}
      >
        {children}
      </span>
    </div>
  );
}
