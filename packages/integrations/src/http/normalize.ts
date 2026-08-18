export type NormalizedBadge = {
  label: string;
  message: string;
  color?: string;
};

export class BadgeNormalizeError extends Error {
  override readonly name = "BadgeNormalizeError";
}

export function normalizeBadgeJson(input: unknown): NormalizedBadge {
  if (!isPlainObject(input)) {
    throw new BadgeNormalizeError("badge json must be an object");
  }

  const label = readLabel(input.label);
  const message = readMessage(input.message ?? input.value);
  const badge: NormalizedBadge = { label, message };
  const color = readColor(input.color);
  if (color !== undefined) {
    badge.color = color;
  }
  return badge;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return input != null && typeof input === "object" && !Array.isArray(input);
}

function readLabel(value: unknown): string {
  if (value === undefined) {
    return "";
  }
  if (typeof value !== "string") {
    throw new BadgeNormalizeError("badge label must be a string");
  }
  return value.trim();
}

function readMessage(value: unknown): string {
  if (value == null) {
    throw new BadgeNormalizeError("badge message is required");
  }
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    throw new BadgeNormalizeError("badge message must be a string");
  }
  const message = String(value).trim();
  if (message === "") {
    throw new BadgeNormalizeError("badge message is required");
  }
  return message;
}

function readColor(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new BadgeNormalizeError("badge color must be a string");
  }
  return value;
}
