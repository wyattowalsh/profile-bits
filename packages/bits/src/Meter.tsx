import { useBitTheme } from "./Theme.js";

export type MeterProps = {
  readonly value: number;
  readonly max?: number;
  readonly label?: string;
};

const METER_MAX = 100;
const METER_TRACK = 10;

export function formatMeter(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return (Math.round(value * 10) / 10).toString();
}

export function meterPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (value / max) * 100));
}

export function Meter({ value, max = METER_MAX, label }: MeterProps) {
  const theme = useBitTheme();
  const width = meterPercent(value, max);
  return (
    <div
      tw="flex flex-row items-center"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        width: "100%",
      }}
    >
      {label !== undefined && label !== "" ? (
        <span
          style={{
            color: theme.muted,
            fontFamily: theme.font,
            fontSize: 10,
          }}
        >
          {label}
        </span>
      ) : null}
      <div
        style={{
          flexGrow: 1,
          height: METER_TRACK,
          backgroundColor: theme.border,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: METER_TRACK,
            backgroundColor: theme.accent,
          }}
        />
      </div>
      <span
        style={{
          color: theme.text,
          fontFamily: theme.font,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {formatMeter(value)}
      </span>
    </div>
  );
}
