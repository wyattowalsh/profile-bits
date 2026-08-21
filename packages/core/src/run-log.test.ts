import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultRunLogSink,
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

function captureStdio(): { stdout: () => string; stderr: () => string } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  return {
    stdout: () => stdout.join(""),
    stderr: () => stderr.join(""),
  };
}

function parseStderrEvent(stderr: string): RunLogEvent {
  expect(stderr).toContain("profile-bits {");
  const trimmed = stderr.replace(/\n$/, "");
  expect(trimmed.startsWith("profile-bits ")).toBe(true);
  return JSON.parse(trimmed.slice("profile-bits ".length)) as RunLogEvent;
}

describe("createDefaultRunLogSink", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("writes a profile-bits JSON line to stderr with src profile-bits", () => {
    vi.stubEnv("GITHUB_ACTIONS", "");
    delete process.env.GITHUB_ACTIONS;
    const stdio = captureStdio();
    const event: RunLogEvent = {
      ...BASE_EVENT,
      pkg: "integrations",
      integration: "http",
      outcome: "ok",
    };
    createDefaultRunLogSink()(event);
    const parsed = parseStderrEvent(stdio.stderr());
    expect(parsed).toEqual(JSON.parse(formatLogEvent(event)));
    expect(parsed.src).toBe("profile-bits");
  });

  it("does not emit ::warning:: or ::error:: on stdout when GITHUB_ACTIONS is unset", () => {
    vi.stubEnv("GITHUB_ACTIONS", "");
    delete process.env.GITHUB_ACTIONS;
    const stdio = captureStdio();
    createDefaultRunLogSink()({
      ...BASE_EVENT,
      outcome: "fail_widget",
      message: "widget failed",
    });
    expect(stdio.stdout()).not.toContain("::warning::");
    expect(stdio.stdout()).not.toContain("::error::");
    expect(stdio.stderr()).toContain("profile-bits {");
  });

  it("emits ::warning:: not ::error:: for fail_widget when GITHUB_ACTIONS is true", () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    const stdio = captureStdio();
    createDefaultRunLogSink()({
      ...BASE_EVENT,
      outcome: "fail_widget",
      message: "http 401",
    });
    expect(stdio.stdout()).toContain("::warning::http 401\n");
    expect(stdio.stdout()).not.toContain("::error::");
    expect(stdio.stderr()).toContain("profile-bits {");
  });

  it("emits ::error:: for fail_run when GITHUB_ACTIONS is true", () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    const stdio = captureStdio();
    createDefaultRunLogSink()({
      ...BASE_EVENT,
      outcome: "fail_run",
      message: "wakatime 401",
    });
    expect(stdio.stdout()).toContain("::error::wakatime 401\n");
    expect(stdio.stdout()).not.toContain("::warning::");
    expect(stdio.stderr()).toContain("profile-bits {");
  });

  it("does not log Bearer or token when the message is redacted", () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    const stdio = captureStdio();
    createDefaultRunLogSink()({
      ...BASE_EVENT,
      outcome: "fail_run",
      message: redactLogMessage(
        "Authorization: Bearer ghp_leaked_token request failed",
      ),
    });
    const haystack = `${stdio.stdout()}${stdio.stderr()}`;
    expect(haystack).not.toContain("Bearer");
    expect(haystack).not.toContain("token");
    expect(haystack).not.toContain("ghp_leaked_token");
    expect(parseStderrEvent(stdio.stderr()).src).toBe("profile-bits");
  });
});
