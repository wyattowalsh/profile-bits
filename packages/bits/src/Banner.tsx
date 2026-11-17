import { readableInk } from "@profile-bits/themes";
import type { ReactNode } from "react";
import { useBitTheme } from "./Theme.js";

export type BannerProps = {
  readonly children?: ReactNode;
};

export function Banner({ children }: BannerProps) {
  const theme = useBitTheme();
  return (
    <div
      tw="flex"
      style={{
        display: "flex",
        width: "100%",
        backgroundColor: theme.accent,
        color: readableInk(theme.accent),
        fontFamily: theme.font,
        fontSize: 12,
        fontWeight: 600,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      {children}
    </div>
  );
}
