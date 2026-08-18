import type { ReactNode } from "react";

export function Frame({ children }: { children?: ReactNode }) {
  return (
    <div
      tw="w-full h-full flex flex-col"
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </div>
  );
}
