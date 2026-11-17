import type { ReactNode } from "react";

export type WrapProps = {
  readonly children?: ReactNode;
  readonly gap?: number;
};

export function Wrap({ children, gap = 8 }: WrapProps) {
  return (
    <div
      tw="flex flex-row"
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap,
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}
