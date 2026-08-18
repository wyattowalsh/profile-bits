import { describe, expect, it } from "vitest";
import {
  assertSafeApiDomain,
  resolveStatsUrl,
  UnsafeApiDomainError,
} from "./api-domain.js";

const REJECT = [
  "localhost",
  "127.0.0.1",
  "::1",
  "http://x",
  "https://x",
  "x/path",
  "x:443",
  "user@x",
  "169.254.169.254",
  "metadata.google.internal",
] as const;

describe("assertSafeApiDomain", () => {
  it.each(REJECT)("rejects %s", (input) => {
    expect(() => assertSafeApiDomain(input)).toThrow(UnsafeApiDomainError);
  });

  it("normalizes wakatime.com to lowercase hostname", () => {
    expect(assertSafeApiDomain("WakaTime.COM")).toBe("wakatime.com");
  });
});

describe("resolveStatsUrl", () => {
  it("uses the official Cloud path for wakatime.com", () => {
    expect(resolveStatsUrl("wakatime.com", "last_7_days").href).toBe(
      "https://wakatime.com/api/v1/users/current/stats/last_7_days",
    );
  });

  it("uses the Wakapi compat path for wakapi.dev", () => {
    expect(resolveStatsUrl("wakapi.dev", "last_30_days").href).toBe(
      "https://wakapi.dev/api/compat/wakatime/v1/users/current/stats/last_30_days",
    );
  });

  it("uses the Wakapi compat path for api.wakatime.com (not special-cased)", () => {
    expect(resolveStatsUrl("api.wakatime.com", "last_year").href).toBe(
      "https://api.wakatime.com/api/compat/wakatime/v1/users/current/stats/last_year",
    );
  });

  it("never interpolates a user path into the URL", () => {
    expect(() => resolveStatsUrl("evil.example/api", "last_7_days")).toThrow(
      UnsafeApiDomainError,
    );
  });
});
