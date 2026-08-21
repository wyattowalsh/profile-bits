import { spinner as createSpinner } from "@clack/prompts";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectSecrets,
  collectSecretsFromArgv,
  formatHumanResult,
  formatJsonResult,
  redactOutput,
  shouldShowSpinner,
  shouldStartPromptPath,
  startRenderSpinner,
  writeIgnoringEpipe,
} from "./io.ts";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    error: vi.fn(),
  })),
}));

afterEach(() => {
  vi.mocked(createSpinner).mockClear();
});

const PRESENTATION = {
  json: false,
  quiet: false,
  verbose: false,
  noInput: true,
  noColor: false,
} as const;

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

  it("collects argv token flags and http_token_env for unexpected-error redaction", () => {
    const token = "ghs_argv_secret_token";
    const waka = "waka_argv_secret";
    const committer = "ghs_committer_secret";
    const http = "http_argv_secret";
    const secrets = collectSecretsFromArgv(
      [
        "render",
        "--github-token",
        token,
        `--wakatime-token=${waka}`,
        "--committer-token",
        committer,
        "--http-token-env",
        "HTTP_TOKEN",
      ],
      { HTTP_TOKEN: http },
    );
    const redacted = redactOutput(
      `failed ${token} ${waka} ${committer} ${http}`,
      secrets,
    );
    expect(redacted).not.toContain(token);
    expect(redacted).not.toContain(waka);
    expect(redacted).not.toContain(committer);
    expect(redacted).not.toContain(http);
    expect(redacted).toContain("[redacted]");
  });

  it("pins the Clack spinner to stderr", () => {
    startRenderSpinner(PRESENTATION, { stderrIsTTY: true, env: {} });
    expect(createSpinner).toHaveBeenCalledWith(
      expect.objectContaining({ output: process.stderr }),
    );
  });

  it("passes an identity styleFrame when --no-color is set", () => {
    startRenderSpinner(
      { ...PRESENTATION, noColor: true },
      { stderrIsTTY: true, env: {} },
    );
    const spinnerOptions = vi.mocked(createSpinner).mock.calls[0]?.[0];
    expect(spinnerOptions?.styleFrame?.("◐")).toBe("◐");
  });

  it("passes an identity styleFrame when NO_COLOR is set", () => {
    startRenderSpinner(PRESENTATION, {
      stderrIsTTY: true,
      env: { NO_COLOR: "1" },
    });
    const spinnerOptions = vi.mocked(createSpinner).mock.calls[0]?.[0];
    expect(spinnerOptions?.styleFrame?.("x")).toBe("x");
  });

  it("does not pass styleFrame when color is allowed", () => {
    const previous = process.env.NO_COLOR;
    delete process.env.NO_COLOR;
    try {
      startRenderSpinner(PRESENTATION, { stderrIsTTY: true, env: {} });
      const spinnerOptions = vi.mocked(createSpinner).mock.calls[0]?.[0];
      expect(spinnerOptions).not.toHaveProperty("styleFrame");
    } finally {
      if (previous === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = previous;
      }
    }
  });

  it("swallows EPIPE from writeIgnoringEpipe", () => {
    const error = Object.assign(new Error("broken pipe"), { code: "EPIPE" });
    expect(() =>
      writeIgnoringEpipe(() => {
        throw error;
      }, "hello"),
    ).not.toThrow();
  });

  it("hides the spinner when json, quiet, or stderr is not a TTY", () => {
    expect(shouldShowSpinner({ ...PRESENTATION, json: true }, true)).toBe(
      false,
    );
    expect(shouldShowSpinner({ ...PRESENTATION, quiet: true }, true)).toBe(
      false,
    );
    expect(shouldShowSpinner(PRESENTATION, false)).toBe(false);
  });

  it("shows the spinner when stderr is a TTY and not json or quiet", () => {
    expect(shouldShowSpinner(PRESENTATION, true)).toBe(true);
  });

  it("does not start a prompt path when noInput is set", () => {
    expect(shouldStartPromptPath({ ...PRESENTATION, noInput: true })).toBe(
      false,
    );
    expect(shouldStartPromptPath({ ...PRESENTATION, noInput: false })).toBe(
      true,
    );
  });
});
