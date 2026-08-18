import { search } from "@jmespath-community/jmespath";

export class JsonJmesError extends Error {
  override readonly name = "JsonJmesError";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

export function searchJson(data: unknown, expression: string): unknown {
  try {
    return search(data as never, expression);
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : "invalid jmespath";
    throw new JsonJmesError(message, { cause });
  }
}

export function isEmptyJsonResult(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (value === "") {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  ) {
    return true;
  }
  return false;
}

export const JSON_KEY_MAX_CHARS = 16;
export const JSON_VALUE_MAX_CHARS = 48;
export const JSON_MAX_OBJECT_ROWS = 3;

export function truncateLabel(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

export function formatJsonRows(value: unknown): readonly string[] {
  if (typeof value === "object" && value != null && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      JSON_MAX_OBJECT_ROWS,
    );
    return entries.map(
      ([key, entry]) =>
        `${truncateLabel(key, JSON_KEY_MAX_CHARS)}  ${truncateLabel(stringifyJsonValue(entry), JSON_VALUE_MAX_CHARS)}`,
    );
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, JSON_MAX_OBJECT_ROWS)
      .map((entry) =>
        truncateLabel(stringifyJsonValue(entry), JSON_VALUE_MAX_CHARS),
      );
  }
  return [truncateLabel(stringifyJsonValue(value), JSON_VALUE_MAX_CHARS)];
}

function stringifyJsonValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null) {
    return "null";
  }
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}
