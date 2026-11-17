import { useBitTheme } from "./Theme.js";

export type DurationProps = {
  readonly seconds: number;
};

const SECOND = 1;
const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0s";
  }
  const total = Math.floor(seconds);
  const days = Math.floor(total / DAY);
  const hours = Math.floor((total % DAY) / HOUR);
  const minutes = Math.floor((total % HOUR) / MINUTE);
  const remain = total % MINUTE;
  if (days > 0) {
    return hours > 0
      ? `${String(days)}d ${String(hours)}h`
      : `${String(days)}d`;
  }
  if (hours > 0) {
    return minutes > 0
      ? `${String(hours)}h ${String(minutes)}m`
      : `${String(hours)}h`;
  }
  if (minutes > 0) {
    return remain > 0
      ? `${String(minutes)}m ${String(remain)}s`
      : `${String(minutes)}m`;
  }
  return `${String(remain * SECOND)}s`;
}

export function Duration({ seconds }: DurationProps) {
  const theme = useBitTheme();
  return (
    <span
      tw="flex"
      style={{
        color: theme.muted,
        fontFamily: theme.font,
        fontSize: 12,
        fontWeight: 400,
      }}
    >
      {formatDuration(seconds)}
    </span>
  );
}
