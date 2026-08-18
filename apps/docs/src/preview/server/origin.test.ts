import { afterEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_CACHE_CONTROL, PREVIEW_ROBOTS_TAG } from "../types";
import {
  assertPreviewOrigin,
  DEFAULT_PREVIEW_ALLOWED_ORIGINS,
  getPreviewAllowedOrigins,
  isAllowedPreviewOrigin,
  PREVIEW_ALLOWED_ORIGINS_ENV,
  PreviewOriginError,
  parsePreviewAllowedOrigins,
} from "./origin";

const LOCALHOST = "http://localhost:3000";
const LOOPBACK = "http://127.0.0.1:3000";
const UNKNOWN = "https://evil.example";
const DOCS = "https://docs.example";
const PREVIEW_PATH = "http://localhost:3000/api/preview";

function previewRequest(origin: string | null): Request {
  const headers = new Headers();
  if (origin !== null) {
    headers.set("Origin", origin);
  }
  return new Request(PREVIEW_PATH, {
    method: "POST",
    headers,
  });
}

describe("isAllowedPreviewOrigin", () => {
  const allowlist = [LOCALHOST, LOOPBACK] as const;

  it("allows a listed origin", () => {
    expect(isAllowedPreviewOrigin(LOCALHOST, allowlist)).toBe(true);
    expect(isAllowedPreviewOrigin(LOOPBACK, allowlist)).toBe(true);
  });

  it("rejects an unknown origin", () => {
    expect(isAllowedPreviewOrigin(UNKNOWN, allowlist)).toBe(false);
    expect(isAllowedPreviewOrigin("https://localhost:3000", allowlist)).toBe(
      false,
    );
  });

  it("rejects missing Origin so live private data cannot skip the CSRF gate", () => {
    expect(isAllowedPreviewOrigin(null, allowlist)).toBe(false);
    expect(isAllowedPreviewOrigin("", allowlist)).toBe(false);
  });

  it("rejects the sandboxed Origin string null", () => {
    expect(isAllowedPreviewOrigin("null", allowlist)).toBe(false);
  });
});

describe("parsePreviewAllowedOrigins / env allowlist", () => {
  it("parses a comma-separated env allowlist", () => {
    expect(
      parsePreviewAllowedOrigins("https://docs.example, https://play.example"),
    ).toEqual(["https://docs.example", "https://play.example"]);
  });

  it("returns defaults plus env origins", () => {
    expect(
      getPreviewAllowedOrigins("https://docs.example,https://play.example"),
    ).toEqual([
      LOCALHOST,
      LOOPBACK,
      "https://docs.example",
      "https://play.example",
    ]);
  });

  it("drops empty, duplicate, and credentialed env entries", () => {
    expect(
      parsePreviewAllowedOrigins(
        ` ${DOCS} , ${DOCS}/preview?token=secret, https://user:ghp_secret@leak.example, `,
      ),
    ).toEqual([DOCS]);
  });

  it("uses DEFAULT localhost origins when env is absent", () => {
    expect(getPreviewAllowedOrigins(undefined)).toEqual([
      ...DEFAULT_PREVIEW_ALLOWED_ORIGINS,
    ]);
    expect(DEFAULT_PREVIEW_ALLOWED_ORIGINS).toEqual([LOCALHOST, LOOPBACK]);
  });
});

describe("assertPreviewOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows a listed localhost origin", () => {
    expect(() => assertPreviewOrigin(previewRequest(LOCALHOST))).not.toThrow();
    expect(() => assertPreviewOrigin(previewRequest(LOOPBACK))).not.toThrow();
  });

  it("rejects an unknown origin with a Response-ready 403", () => {
    expect(() => assertPreviewOrigin(previewRequest(UNKNOWN))).toThrow(
      PreviewOriginError,
    );
    try {
      assertPreviewOrigin(previewRequest(UNKNOWN));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PreviewOriginError);
      const response = (error as PreviewOriginError).toResponse();
      expect(response.status).toBe(403);
      expect(response.headers.get("Cache-Control")).toBe(PREVIEW_CACHE_CONTROL);
      expect(response.headers.get("X-Robots-Tag")).toBe(PREVIEW_ROBOTS_TAG);
    }
  });

  it("rejects a missing Origin header with a Response-ready 403", () => {
    expect(() => assertPreviewOrigin(previewRequest(null))).toThrow(
      PreviewOriginError,
    );
    try {
      assertPreviewOrigin(previewRequest(null));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PreviewOriginError);
      const response = (error as PreviewOriginError).toResponse();
      expect(response.status).toBe(403);
      expect(response.headers.get("Cache-Control")).toBe(PREVIEW_CACHE_CONTROL);
      expect(response.headers.get("X-Robots-Tag")).toBe(PREVIEW_ROBOTS_TAG);
    }
  });

  it("parses PREVIEW_ALLOWED_ORIGINS and allows those hosts", () => {
    vi.stubEnv(PREVIEW_ALLOWED_ORIGINS_ENV, `${DOCS}, https://play.example`);
    expect(() => assertPreviewOrigin(previewRequest(DOCS))).not.toThrow();
    expect(() =>
      assertPreviewOrigin(previewRequest("https://play.example")),
    ).not.toThrow();
    expect(() => assertPreviewOrigin(previewRequest(UNKNOWN))).toThrow(
      PreviewOriginError,
    );
  });

  it("does not put tokens in the request URL or error payload", async () => {
    try {
      assertPreviewOrigin(previewRequest(UNKNOWN));
      expect.unreachable();
    } catch (error) {
      const response = (error as PreviewOriginError).toResponse();
      const body = await response.json();
      const blob = JSON.stringify(body);
      expect(previewRequest(UNKNOWN).url).not.toMatch(
        /token|pat|authorization/i,
      );
      expect(blob).not.toMatch(/token|pat|authorization|ghp_/i);
      expect(blob).not.toContain(UNKNOWN);
    }
  });
});
