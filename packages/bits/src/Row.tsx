import type { ReactNode } from "react";

export function Row({
  children,
  gap = 8,
}: {
  children?: ReactNode;
  gap?: number;
}) {
  return (
    <div
      tw="flex flex-row items-center"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap,
      }}
    >
      {children}
    </div>
  );
}
