import { useBitTheme } from "./Theme.js";

export type TimeProps = {
  readonly value: string;
  readonly timezone?: string;
};

const TIME_TIMEZONE_DEFAULT = "UTC";

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

function part(
  parts: readonly Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((entry) => entry.type === type)?.value ?? "";
}

function timestampFormatter(timeZone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat("en-US", { ...TIME_FORMAT, timeZone });
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      ...TIME_FORMAT,
      timeZone: TIME_TIMEZONE_DEFAULT,
    });
  }
}

function formatTimestamp(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const parts = timestampFormatter(timeZone).formatToParts(date);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")} ${part(parts, "hour")}:${part(parts, "minute")}`;
}

export function Time({ value, timezone = TIME_TIMEZONE_DEFAULT }: TimeProps) {
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
      {formatTimestamp(value, timezone)}
    </span>
  );
}
