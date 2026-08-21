import { describe, expect, it } from "vitest";
import { THIN_ACTION_INPUT_NAMES } from "./core-symbols.ts";
import { isCliExitError, throwCliExit } from "./errors.ts";
import { CLI_OUTPUT_ACTION_DEFAULT, mapInputs } from "./map-inputs.ts";
import {
  detectColors,
  kebabFlag,
  parseCli,
  type RenderParserValue,
  THIN_KEBAB_FLAGS,
} from "./program.ts";

async function parse(
  args: readonly string[],
  env: NodeJS.ProcessEnv = {},
): Promise<{
  value?: RenderParserValue;
  code: number;
  stdout: string;
  stderr: string;
}> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  try {
    const value = await parseCli({
      args,
      env,
      stdout: (text) => stdout.push(text),
      stderr: (text) => stderr.push(text),
      onExit: throwCliExit,
      colors: false,
    });
    return {
      value,
      code: 0,
      stdout: stdout.join("\n"),
      stderr: stderr.join("\n"),
    };
  } catch (error) {
    if (isCliExitError(error)) {
      return {
        code: error.exitCode,
        stdout: stdout.join("\n"),
        stderr: stderr.join("\n"),
      };
    }
    throw error;
  }
}

describe("program", () => {
  it("exposes a kebab flag for every thin Action input", () => {
    expect(THIN_KEBAB_FLAGS).toEqual(
      THIN_ACTION_INPUT_NAMES.map((name) => kebabFlag(name)),
    );
  });

  it("defaults output_action to none at the CLI layer", async () => {
    const result = await parse(["render"]);
    expect(result.code).toBe(0);
    expect(result.value?.output_action).toBe(CLI_OUTPUT_ACTION_DEFAULT);
    expect(mapInputs(result.value as RenderParserValue).output_action).toBe(
      "none",
    );
  });

  it("maps kebab flags onto thin Action inputs", async () => {
    const result = await parse([
      "render",
      "--config",
      ".github/profile-bits.yml",
      "--dry-run",
      "--user",
      "octocat",
    ]);
    expect(result.code).toBe(0);
    expect(mapInputs(result.value as RenderParserValue)).toMatchObject({
      config: ".github/profile-bits.yml",
      dry_run: true,
      user: "octocat",
      output_action: "none",
    });
  });

  it("reads github_token from GITHUB_TOKEN then GH_TOKEN", async () => {
    const fromGithub = await parse(["render"], { GITHUB_TOKEN: "from_github" });
    expect(fromGithub.value?.github_token).toBe("from_github");
    const fromGh = await parse(["render"], { GH_TOKEN: "from_gh" });
    expect(fromGh.value?.github_token).toBe("from_gh");
    const fromFlag = await parse(["render", "--github-token", "from_flag"], {
      GITHUB_TOKEN: "from_github",
      GH_TOKEN: "from_gh",
    });
    expect(fromFlag.value?.github_token).toBe("from_flag");
  });

  it("reads wakatime_token from WAKATIME_TOKEN", async () => {
    const result = await parse(["render"], { WAKATIME_TOKEN: "waka_from_env" });
    expect(result.value?.wakatime_token).toBe("waka_from_env");
  });

  it("exits 2 for unknown flags", async () => {
    const result = await parse(["render", "--not-a-real-flag"]);
    expect(result.code).toBe(2);
    expect(result.stderr.length + result.stdout.length).toBeGreaterThan(0);
  });

  it("rejects flattened plugin_*_*_* flags as unknown", async () => {
    const result = await parse(["render", "--plugin-github-stats-include"]);
    expect(result.code).toBe(2);
  });

  it("prints usage for --help and does not require render", async () => {
    const result = await parse(["--help"]);
    expect(result.code).toBe(0);
    expect(`${result.stdout}\n${result.stderr}`.toLowerCase()).toContain(
      "usage",
    );
  });

  it("prints usage for a missing subcommand", async () => {
    const result = await parse([]);
    expect(result.code).toBe(2);
    expect(`${result.stdout}\n${result.stderr}`.toLowerCase()).toMatch(
      /usage|render/,
    );
  });

  it("exits 2 for an unknown subcommand", async () => {
    const result = await parse(["build"]);
    expect(result.code).toBe(2);
  });

  it("exits 2 for an invalid --output-action", async () => {
    const result = await parse(["render", "--output-action", "nope"]);
    expect(result.code).toBe(2);
  });

  it("exits 2 for an invalid --format", async () => {
    const result = await parse(["render", "--format", "nope"]);
    expect(result.code).toBe(2);
  });

  it("parses --no-input", async () => {
    const result = await parse(["render", "--no-input"]);
    expect(result.code).toBe(0);
    expect(result.value?.noInput).toBe(true);
  });

  it("detectColors is false for --no-color, NO_COLOR, and non-TTY stdout", () => {
    const stdout = process.stdout as { isTTY?: boolean };
    const original = stdout.isTTY;
    try {
      stdout.isTTY = true;
      expect(detectColors(["--no-color"], {})).toBe(false);
      expect(detectColors([], { NO_COLOR: "1" })).toBe(false);
      stdout.isTTY = false;
      expect(detectColors([], {})).toBe(false);
    } finally {
      stdout.isTTY = original;
    }
  });
});
