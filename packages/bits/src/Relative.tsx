import { useBitTheme } from "./Theme.js";

export type RelativeProps = {
  readonly value: string;
  readonly now: string;
};

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function relativeBody(absSeconds: number): string {
  if (absSeconds < 45) {
    return "just now";
  }
  if (absSeconds < HOUR) {
    return `${String(Math.max(1, Math.floor(absSeconds / MINUTE)))}m`;
  }
  if (absSeconds < DAY) {
    return `${String(Math.floor(absSeconds / HOUR))}h`;
  }
  if (absSeconds < WEEK) {
    return `${String(Math.floor(absSeconds / DAY))}d`;
  }
  if (absSeconds < MONTH) {
    return `${String(Math.floor(absSeconds / WEEK))}w`;
  }
  if (absSeconds < YEAR) {
    return `${String(Math.max(1, Math.floor(absSeconds / MONTH)))}mo`;
  }
  return `${String(Math.floor(absSeconds / YEAR))}y`;
}

export function formatRelative(value: string, now: string): string {
  const then = Date.parse(value);
  const current = Date.parse(now);
  if (Number.isNaN(then) || Number.isNaN(current)) {
    return value;
  }
  const delta = Math.round((then - current) / 1000);
  const body = relativeBody(Math.abs(delta));
  if (body === "just now") {
    return body;
  }
  return delta > 0 ? `in ${body}` : body;
}

export function Relative({ value, now }: RelativeProps) {
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
      {formatRelative(value, now)}
    </span>
  );
}
