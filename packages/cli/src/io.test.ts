import { spinner as createSpinner } from "@clack/prompts";
import { describe, expect, it, vi } from "vitest";
import {
  collectSecrets,
  formatHumanResult,
  formatJsonResult,
  redactOutput,
  startRenderSpinner,
} from "./io.ts";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    error: vi.fn(),
  })),
}));

describe("io", () => {
  it("formats json with files, skipped, and did_commit", () => {
    expect(
      JSON.parse(
        formatJsonResult({
          files: ["profile-bits/stats.svg"],
          skipped: ["github/stats:contributions"],
          did_commit: false,
        }),
      ),
    ).toEqual({
      files: ["profile-bits/stats.svg"],
      skipped: ["github/stats:contributions"],
      did_commit: false,
    });
  });

  it("formats a human file list", () => {
    expect(
      formatHumanResult({
        files: ["profile-bits/stats.svg", "profile-bits/languages.svg"],
        skipped: [],
        did_commit: false,
      }),
    ).toBe("profile-bits/stats.svg\nprofile-bits/languages.svg");
  });

  it("redacts token values from output", () => {
    const token = "ghs_super_secret_token";
    const secrets = collectSecrets(
      { github_token: token, http_token_env: "HTTP_TOKEN" },
      { HTTP_TOKEN: "http_secret_token", WAKATIME_TOKEN: "waka_secret" },
    );
    const redacted = redactOutput(
      `failed ${token} ${"http_secret_token"} ${"waka_secret"}`,
      secrets,
    );
    expect(redacted).not.toContain(token);
    expect(redacted).not.toContain("http_secret_token");
    expect(redacted).not.toContain("waka_secret");
    expect(redacted).toContain("[redacted]");
  });

  it("pins the Clack spinner to stderr", () => {
    startRenderSpinner(
      {
        json: false,
        quiet: false,
        verbose: false,
        noInput: true,
        noColor: true,
      },
      { stderrIsTTY: true },
    );
    expect(createSpinner).toHaveBeenCalledWith(
      expect.objectContaining({ output: process.stderr }),
    );
  });
});
