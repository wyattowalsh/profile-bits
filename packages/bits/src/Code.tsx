import type { ReactNode } from "react";
import { useBitTheme } from "./Theme.js";

export type CodeProps = {
  readonly children?: ReactNode;
};

export function Code({ children }: CodeProps) {
  const theme = useBitTheme();
  return (
    <div
      tw="flex"
      style={{
        display: "flex",
        width: "100%",
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: 3,
        padding: 8,
      }}
    >
      <span
        style={{
          color: theme.text,
          fontFamily: theme.font,
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        {children}
      </span>
    </div>
  );
}
