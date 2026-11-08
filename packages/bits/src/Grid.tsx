import type { ReactNode } from "react";

export type GridProps = {
  readonly children?: ReactNode;
  readonly columns?: number;
  readonly gap?: number;
};

function resolveColumns(columns: number): number {
  if (!Number.isFinite(columns) || columns < 1) {
    return 1;
  }
  return Math.floor(columns);
}

export function Grid({ children, columns = 2, gap = 8 }: GridProps) {
  const cols = resolveColumns(columns);
  return (
    <div
      tw="w-full"
      style={{
        display: "grid",
        width: "100%",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap,
      }}
    >
      {children}
    </div>
  );
}
