import { useBitTheme } from "./Theme.js";

export function Bar({ pct, label }: { pct: number; label?: string }) {
  const theme = useBitTheme();
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div
      tw="flex flex-col"
      style={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      {label !== undefined ? (
        <span
          style={{ color: theme.muted, fontFamily: theme.font, fontSize: 10 }}
        >
          {label}
        </span>
      ) : null}
      <div
        style={{
          width: "100%",
          height: 6,
          backgroundColor: theme.border,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: 6,
            backgroundColor: theme.accent,
          }}
        />
      </div>
    </div>
  );
}
