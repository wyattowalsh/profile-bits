import { useBitTheme } from "./Theme.js";

export type OrdinalProps = {
  readonly rank: number;
  readonly label?: string;
};

const EM_DASH = "\u2014";

export function formatOrdinal(rank: number): string {
  if (!Number.isFinite(rank) || !Number.isInteger(rank) || rank < 1) {
    return EM_DASH;
  }
  return `#${String(rank)}`;
}

export function Ordinal({ rank, label }: OrdinalProps) {
  const theme = useBitTheme();
  return (
    <div
      tw="flex flex-row items-center"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          color: theme.text,
          fontFamily: theme.font,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {formatOrdinal(rank)}
      </span>
      {label !== undefined && label !== "" ? (
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
      ) : null}
    </div>
  );
}
