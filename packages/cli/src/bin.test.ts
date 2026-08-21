import type { ActionRunResult } from "@profile-bits/action";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "./bin.ts";
import { throwCliExit } from "./errors.ts";

const { runMain } = vi.hoisted(() => ({
  runMain:
    vi.fn<
      (options: {
        inputs: Record<string, unknown>;
        env: NodeJS.ProcessEnv;
        cwd: string;
      }) => Promise<ActionRunResult>
    >(),
}));

vi.mock("@profile-bits/action", () => ({
  runMain,
}));

const TOKEN = "ghs_cli_test_token_value";

const RESULT: ActionRunResult = {
  files: ["profile-bits/stats.svg"],
  skipped: ["github/stats:contributions"],
  did_commit: false,
};

afterEach(() => {
  runMain.mockReset();
  runMain.mockResolvedValue(RESULT);
});

async function invoke(
  args: readonly string[],
  env: NodeJS.ProcessEnv = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await runCli({
    args,
    env,
    cwd: "/repo",
    stdout: (text) => stdout.push(text),
    stderr: (text) => stderr.push(text),
    colors: false,
    stdinIsTTY: false,
    stderrIsTTY: false,
    installSignals: false,
    onExit: throwCliExit,
  });
  return { code, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
}

describe("runCli", () => {
  it("passes output_action none by default", async () => {
    runMain.mockResolvedValue(RESULT);
    const result = await invoke(["render"], { GITHUB_TOKEN: TOKEN });
    expect(result.code).toBe(0);
    expect(runMain).toHaveBeenCalledTimes(1);
    const call = runMain.mock.calls[0]?.[0];
    expect(call?.inputs.output_action).toBe("none");
    expect(call?.cwd).toBe("/repo");
  });

  it("writes json stdout with files, skipped, and did_commit", async () => {
    runMain.mockResolvedValue(RESULT);
    const result = await invoke(["render", "--json"], { GITHUB_TOKEN: TOKEN });
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      files: ["profile-bits/stats.svg"],
      skipped: ["github/stats:contributions"],
      did_commit: false,
    });
    expect(result.stdout).not.toMatch(/spinner|Rendering widgets/i);
  });

  it("keeps token values out of stdout and stderr", async () => {
    runMain.mockResolvedValue(RESULT);
    const result = await invoke(
      ["render", "--json", "--github-token", TOKEN, "--verbose"],
      { WAKATIME_TOKEN: "waka_cli_secret" },
    );
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain(TOKEN);
    expect(result.stderr).not.toContain(TOKEN);
    expect(result.stdout).not.toContain("waka_cli_secret");
    expect(result.stderr).not.toContain("waka_cli_secret");
  });

  it("redacts tokens when runMain throws", async () => {
    runMain.mockRejectedValue(new Error(`engine failed for ${TOKEN}`));
    const result = await invoke(["render", "--github-token", TOKEN]);
    expect(result.code).toBe(1);
    expect(result.stdout).not.toContain(TOKEN);
    expect(result.stderr).not.toContain(TOKEN);
    expect(result.stderr).toContain("[redacted]");
  });

  it("exits 2 for unknown flags without calling runMain", async () => {
    const result = await invoke(["render", "--unknown-flag"]);
    expect(result.code).toBe(2);
    expect(runMain).not.toHaveBeenCalled();
  });

  it("prints --help without rendering", async () => {
    const result = await invoke(["--help"]);
    expect(result.code).toBe(0);
    expect(runMain).not.toHaveBeenCalled();
    expect(`${result.stdout}\n${result.stderr}`.toLowerCase()).toContain(
      "usage",
    );
  });

  it("writes a human file list to stdout", async () => {
    runMain.mockResolvedValue(RESULT);
    const result = await invoke(["render"], { GITHUB_TOKEN: TOKEN });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("profile-bits/stats.svg");
  });

  it("writes skipped and did_commit to stderr when verbose", async () => {
    runMain.mockResolvedValue(RESULT);
    const result = await invoke(["render", "--verbose"], {
      GITHUB_TOKEN: TOKEN,
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("profile-bits/stats.svg");
    expect(result.stderr).toContain("skipped: github/stats:contributions");
    expect(result.stderr).toContain("did_commit: false");
  });

  it("exits 1 for a missing github token without prompting", async () => {
    runMain.mockRejectedValue(
      new Error(
        'github_token is missing: empty, "", or whitespace fails the job (unauthenticated GitHub is not allowed)',
      ),
    );
    const result = await invoke(["render", "--no-input"]);
    expect(result.code).toBe(1);
    expect(runMain).toHaveBeenCalledTimes(1);
    expect(result.stdout).not.toContain("?");
    expect(result.stderr).toMatch(/github_token is missing/i);
  });

  it("redacts unexpected errors in the outer catch", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const code = await runCli({
      args: ["render", "--not-a-real-flag"],
      env: { GITHUB_TOKEN: TOKEN },
      cwd: "/repo",
      stdout: (text) => stdout.push(text),
      stderr: (text) => stderr.push(text),
      colors: false,
      stdinIsTTY: false,
      stderrIsTTY: false,
      installSignals: false,
      onExit: (): never => {
        throw new Error(`unexpected ${TOKEN}`);
      },
    });
    expect(code).toBe(1);
    expect(stderr.join("\n")).not.toContain(TOKEN);
    expect(stderr.join("\n")).toContain("[redacted]");
  });
});
