import type { ActionRunResult } from "@profile-bits/action";
import { describe, expect, it, vi } from "vitest";
import { throwCliExit } from "../errors.ts";
import { shouldStartPromptPath } from "../io.ts";
import { parseCli } from "../program.ts";
import { handleRender, resolvePresentation } from "./render.ts";

vi.mock("@profile-bits/action", () => ({
  runMain: vi.fn(),
}));

async function parseRender(args: readonly string[] = ["render"]) {
  return parseCli({
    args,
    env: {},
    stdout: () => {},
    stderr: () => {},
    onExit: throwCliExit,
    colors: false,
  });
}

describe("resolvePresentation", () => {
  it("sets noInput when stdin is not a TTY even without the flag", async () => {
    const parsed = await parseRender(["render"]);
    expect(parsed.noInput).toBe(false);
    const presentation = resolvePresentation(parsed, false);
    expect(presentation.noInput).toBe(true);
    expect(shouldStartPromptPath(presentation)).toBe(false);
  });

  it("sets noInput when --no-input is passed on a TTY", async () => {
    const parsed = await parseRender(["render", "--no-input"]);
    expect(resolvePresentation(parsed, true).noInput).toBe(true);
  });
});

describe("handleRender", () => {
  it("still runs the engine when noInput is set", async () => {
    const parsed = await parseRender(["render", "--no-input"]);
    const runMain = vi.fn(async (): Promise<ActionRunResult> => {
      return {
        files: ["profile-bits/stats.svg"],
        skipped: [],
        did_commit: false,
      };
    });
    const stdout: string[] = [];
    const code = await handleRender({
      parsed,
      env: {},
      cwd: "/repo",
      io: {
        stdout: (text) => stdout.push(text),
        stderr: () => {},
      },
      stdinIsTTY: true,
      stderrIsTTY: false,
      installSignals: false,
      runMain,
    });
    expect(code).toBe(0);
    expect(runMain).toHaveBeenCalledTimes(1);
    expect(stdout.join("\n")).toBe("profile-bits/stats.svg");
    expect(stdout.join("\n")).not.toContain("?");
  });

  it("exits 1 for a MissingGithubToken-style error without prompting", async () => {
    const parsed = await parseRender(["render", "--no-input"]);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const code = await handleRender({
      parsed,
      env: {},
      cwd: "/repo",
      io: {
        stdout: (text) => stdout.push(text),
        stderr: (text) => stderr.push(text),
      },
      stdinIsTTY: false,
      stderrIsTTY: false,
      installSignals: false,
      runMain: async () => {
        throw new Error(
          'github_token is missing: empty, "", or whitespace fails the job (unauthenticated GitHub is not allowed)',
        );
      },
    });
    expect(code).toBe(1);
    expect(stdout.join("\n")).not.toContain("?");
    expect(stderr.join("\n")).toMatch(/github_token is missing/i);
  });
});
