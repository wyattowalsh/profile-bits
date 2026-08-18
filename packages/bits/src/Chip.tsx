import type { ReactNode } from "react";
import { useBitTheme } from "./Theme.js";

export function Chip({
  children,
  label,
  message,
  messageColor,
}: {
  children?: ReactNode;
  label?: string;
  message?: string;
  messageColor?: string;
}) {
  const theme = useBitTheme();

  if (typeof label === "string" && typeof message === "string") {
    return (
      <span
        tw="flex"
        style={{
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 999,
          fontFamily: theme.font,
          fontSize: 11,
        }}
      >
        <span
          style={{
            color: theme.muted,
            backgroundColor: theme.card,
            fontFamily: theme.font,
            fontSize: 11,
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 2,
            paddingBottom: 2,
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: "#ffffff",
            backgroundColor: messageColor ?? theme.accent,
            fontFamily: theme.font,
            fontSize: 11,
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 2,
            paddingBottom: 2,
          }}
        >
          {message}
        </span>
      </span>
    );
  }

  return (
    <span
      tw="flex"
      style={{
        color: theme.text,
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: 999,
        fontFamily: theme.font,
        fontSize: 11,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 2,
        paddingBottom: 2,
      }}
    >
      {children}
    </span>
  );
}
