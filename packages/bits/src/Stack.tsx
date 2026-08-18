import type { ReactNode } from "react";

export function Stack({
  children,
  gap = 6,
}: {
  children?: ReactNode;
  gap?: number;
}) {
  return (
    <div
      tw="flex flex-col"
      style={{ display: "flex", flexDirection: "column", gap }}
    >
      {children}
    </div>
  );
}
