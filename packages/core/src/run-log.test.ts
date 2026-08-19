import { describe, expect, it } from "vitest";
import {
  formatLogEvent,
  publicUrlParts,
  type RunLogEvent,
  redactLogMessage,
} from "./run-log.js";

const BASE_EVENT = {
  v: 1,
  src: "profile-bits",
  kind: "call",
} as const satisfies RunLogEvent;

describe("publicUrlParts", () => {
  it("returns hostname and pathname only", () => {
    expect(publicUrlParts("https://api.github.com/graphql")).toEqual({
      host: "api.github.com",
      path: "/graphql",
    });
  });

  it("strips query strings", () => {
    expect(
      publicUrlParts(
        "https://wakatime.com/api/v1/users/current/stats?range=last_7_days&api_key=secret",
      ),
    ).toEqual({
      host: "wakatime.com",
      path: "/api/v1/users/current/stats",
    });
  });

  it("strips userinfo", () => {
    expect(
      publicUrlParts("https://alice:s3cret@example.com/v1/bits?token=leak"),
    ).toEqual({
      host: "example.com",
      path: "/v1/bits",
    });
  });

  it("does not include port, hash, or header-like query keys", () => {
    const parts = publicUrlParts(
      "https://127.0.0.1:8443/v1/items?Authorization=Bearer%20abc#frag",
    );
    expect(parts).toEqual({ host: "127.0.0.1", path: "/v1/items" });
    expect(JSON.stringify(parts)).not.toContain("8443");
    expect(JSON.stringify(parts)).not.toContain("Bearer");
    expect(JSON.stringify(parts)).not.toMatch(/[?&#]/);
  });
});

describe("redactLogMessage", () => {
  it("strips Authorization, Bearer, token, and Basic values", () => {
    expect(redactLogMessage("Authorization: Bearer super-secret failed")).toBe(
      "Authorization: [redacted] failed",
    );
    expect(redactLogMessage("Authorization: token ghp_secret failed")).toBe(
      "Authorization: [redacted] failed",
    );
    expect(redactLogMessage("proxy Basic dXNlcjpwYXNz")).toBe(
      "proxy [redacted]",
    );
  });

  it("strips extra secrets", () => {
    expect(
      redactLogMessage("leaked super-secret from env", ["super-secret"]),
    ).toBe("leaked [redacted] from env");
  });
});

describe("formatLogEvent", () => {
  it("is one JSON line with src profile-bits and round-trips", () => {
    const event: RunLogEvent = {
      ...BASE_EVENT,
      pkg: "integrations",
      integration: "http",
      op: "GET",
      outcome: "ok",
      status: 200,
      duration_ms: 12,
      cache: "miss",
      host: "example.com",
      path: "/v1/bits",
    };
    const line = formatLogEvent(event);
    expect(line.includes("\n")).toBe(false);
    expect(line).toContain('"src":"profile-bits"');
    expect(JSON.parse(line)).toEqual(event);
  });

  it("omits Bearer from the formatted line when the message is redacted", () => {
    const line = formatLogEvent({
      ...BASE_EVENT,
      message: redactLogMessage(
        "Authorization: Bearer ghp_leaked_token request failed",
      ),
    });
    expect(line).not.toContain("Bearer");
    expect(line).not.toContain("ghp_leaked_token");
    expect(JSON.parse(line)).toMatchObject({
      src: "profile-bits",
      message: "Authorization: [redacted] request failed",
    });
  });
});
