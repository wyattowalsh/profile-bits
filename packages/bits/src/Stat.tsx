import { useBitTheme } from "./Theme.js";

export function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const theme = useBitTheme();
  return (
    <div
      tw="flex flex-col"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <span
        style={{
          color: theme.muted,
          fontFamily: theme.font,
          fontSize: 10,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: theme.text,
          fontFamily: theme.font,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {String(value)}
      </span>
    </div>
  );
}
