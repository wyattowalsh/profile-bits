import { useBitTheme } from "./Theme.js";

export type KeyValueProps = {
  readonly label: string;
  readonly value: string | number;
};

export function KeyValue({ label, value }: KeyValueProps) {
  const theme = useBitTheme();
  return (
    <div
      tw="flex flex-row"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        width: "100%",
      }}
    >
      <span
        style={{
          color: theme.muted,
          fontFamily: theme.font,
          fontSize: 12,
          fontWeight: 400,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: theme.text,
          fontFamily: theme.font,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {String(value)}
      </span>
    </div>
  );
}
