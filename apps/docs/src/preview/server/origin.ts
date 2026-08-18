import { PREVIEW_RESPONSE_HEADERS } from "../types";

/** Local docs-dev origins. Production hosts come from `PREVIEW_ALLOWED_ORIGINS`. */
export const DEFAULT_PREVIEW_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

export const PREVIEW_ALLOWED_ORIGINS_ENV = "PREVIEW_ALLOWED_ORIGINS";

const FORBIDDEN_ORIGIN_MESSAGE = "Forbidden origin";

/**
 * Drop userinfo (tokens/passwords), path, and query so allowlist entries
 * never become credentialed URLs.
 */
function canonicalizeOrigin(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  try {
    const url = new URL(trimmed);
    if (url.username !== "" || url.password !== "") {
      return undefined;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

/** Parse `PREVIEW_ALLOWED_ORIGINS` (comma-separated). Invalid / credentialed entries are dropped. */
export function parsePreviewAllowedOrigins(
  value: string | undefined | null,
): string[] {
  if (value == null || value.trim() === "") {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(",")) {
    const origin = canonicalizeOrigin(part);
    if (origin === undefined || seen.has(origin)) {
      continue;
    }
    seen.add(origin);
    out.push(origin);
  }
  return out;
}

/** Defaults plus optional comma-separated `PREVIEW_ALLOWED_ORIGINS`. */
export function getPreviewAllowedOrigins(
  envValue: string | undefined = process.env.PREVIEW_ALLOWED_ORIGINS,
): readonly string[] {
  const extra = parsePreviewAllowedOrigins(envValue);
  const seen = new Set<string>(DEFAULT_PREVIEW_ALLOWED_ORIGINS);
  const out: string[] = [...DEFAULT_PREVIEW_ALLOWED_ORIGINS];
  for (const origin of extra) {
    if (seen.has(origin)) {
      continue;
    }
    seen.add(origin);
    out.push(origin);
  }
  return out;
}

/**
 * Origin is required (CSRF gate for live preview). Missing Origin must not
 * allow live private GitHub data. A present Origin must match the allowlist
 * exactly (canonical origin).
 */
export function isAllowedPreviewOrigin(
  origin: string | null,
  allowlist: readonly string[],
): boolean {
  if (origin == null || origin.trim() === "") {
    return false;
  }
  const canonical = canonicalizeOrigin(origin);
  if (canonical === undefined) {
    return false;
  }
  const allowed = new Set<string>();
  for (const entry of allowlist) {
    const next = canonicalizeOrigin(entry);
    if (next !== undefined) {
      allowed.add(next);
    }
  }
  return allowed.has(canonical);
}

/** Thrown when Origin is missing or not on the allowlist. Use `toResponse()`. */
export class PreviewOriginError extends Error {
  readonly status = 403 as const;

  constructor(message = FORBIDDEN_ORIGIN_MESSAGE) {
    super(message);
    this.name = "PreviewOriginError";
  }

  toResponse(): Response {
    return Response.json(
      { error: this.message },
      {
        status: this.status,
        headers: PREVIEW_RESPONSE_HEADERS,
      },
    );
  }
}

export function isPreviewOriginError(
  error: unknown,
): error is PreviewOriginError {
  return error instanceof PreviewOriginError;
}

/**
 * CSRF gate for `POST /api/preview`. Requires Origin and rejects a
 * disallowed Origin by throwing a Response-ready `PreviewOriginError`.
 */
export function assertPreviewOrigin(request: Request): void {
  const origin = request.headers.get("Origin");
  if (isAllowedPreviewOrigin(origin, getPreviewAllowedOrigins())) {
    return;
  }
  throw new PreviewOriginError();
}
