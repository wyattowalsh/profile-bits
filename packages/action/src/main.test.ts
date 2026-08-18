import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  GITHUB_PACK_DEFAULT_WIDGETS,
  LANGUAGES_OPTION_DEFAULTS,
  STATS_OPTION_DEFAULTS,
} from "@profile-bits/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineError } from "./engine.ts";
import {
  type ConfigFs,
  type LoadedActionConfig,
  MissingGithubTokenError,
} from "./load-config.ts";
import type { EngineResult } from "./main.ts";

const { runEngine } = vi.hoisted(() => ({
  runEngine:
    vi.fn<
      (
        loaded: LoadedActionConfig,
        deps?: Record<string, unknown>,
      ) => Promise<EngineResult>
    >(),
}));

vi.mock("./engine.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./engine.ts")>();
  return {
    ...actual,
    runEngine,
  };
});

const { runMain } = await import("./main.ts");

const TOKEN = "ghs_test_token";
const CWD = "/repo";
const DEFAULT_CONFIG_PATH = `${CWD}/.github/profile-bits.yml`;

const DEMO_ONLY_YAML = `version: 1
plugins:
  github:
    widgets:
      demo:
        text: only-demo
`;

const ENGINE_NONE: EngineResult = {
  files: ["profile-bits/stats.svg", "profile-bits/languages.svg"],
  did_commit: false,
  skipped: ["github/stats:contributions"],
};

function createMemoryFs(files: Readonly<Record<string, string>>): ConfigFs {
  return {
    existsSync(path) {
      return Object.hasOwn(files, path);
    },
    readFileSync(path) {
      if (!Object.hasOwn(files, path)) {
        const error = new Error(`ENOENT: ${path}`) as Error & { code: string };
        error.code = "ENOENT";
        throw error;
      }
      return files[path] ?? "";
    },
  };
}

function parseGithubOutput(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    if (line === "") {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) {
      continue;
    }
    result[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return result;
}

describe("runMain", () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    runEngine.mockReset();
    runEngine.mockResolvedValue(ENGINE_NONE);
  });

  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  async function githubOutputPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "profile-bits-action-"));
    tempDirs.push(dir);
    return join(dir, "github_output");
  }

  describe("empty github_token fails the job", () => {
    it("fails when github_token is omitted and does not call the engine", async () => {
      await expect(
        runMain({
          inputs: {},
          cwd: CWD,
          fs: createMemoryFs({}),
        }),
      ).rejects.toBeInstanceOf(MissingGithubTokenError);
      expect(runEngine).not.toHaveBeenCalled();
    });

    it("fails when github_token is empty", async () => {
      await expect(
        runMain({
          inputs: { github_token: "" },
          cwd: CWD,
          fs: createMemoryFs({}),
        }),
      ).rejects.toBeInstanceOf(MissingGithubTokenError);
      expect(runEngine).not.toHaveBeenCalled();
    });

    it("fails when github_token is whitespace", async () => {
      await expect(
        runMain({
          inputs: { github_token: "   " },
          cwd: CWD,
          fs: createMemoryFs({}),
        }),
      ).rejects.toBeInstanceOf(MissingGithubTokenError);
      await expect(
        runMain({
          inputs: { github_token: "\t\n" },
          cwd: CWD,
          fs: createMemoryFs({}),
        }),
      ).rejects.toBeInstanceOf(MissingGithubTokenError);
      expect(runEngine).not.toHaveBeenCalled();
    });

    it("fails when INPUT_GITHUB_TOKEN is empty rather than omitted", async () => {
      await expect(
        runMain({
          env: {
            INPUT_GITHUB_TOKEN: "",
            INPUT_OUTPUT_ACTION: "none",
          },
          cwd: CWD,
          fs: createMemoryFs({}),
        }),
      ).rejects.toBeInstanceOf(MissingGithubTokenError);
      expect(runEngine).not.toHaveBeenCalled();
    });
  });

  describe("output_action none and dry_run", () => {
    it("renders without git when output_action is none", async () => {
      const result = await runMain({
        inputs: {
          github_token: TOKEN,
          output_action: "none",
          plugin_github: true,
        },
        cwd: CWD,
        fs: createMemoryFs({}),
      });

      expect(runEngine).toHaveBeenCalledOnce();
      const loaded = runEngine.mock.calls[0]?.[0];
      expect(loaded?.inputs.output_action).toBe("none");
      expect(result.files).toEqual(ENGINE_NONE.files);
      expect(result.did_commit).toBe(false);
      expect(result.skipped).toEqual(ENGINE_NONE.skipped);
    });

    it("forces did_commit false for output_action none even if the engine reports a commit", async () => {
      runEngine.mockResolvedValue({
        ...ENGINE_NONE,
        did_commit: true,
      });

      const result = await runMain({
        inputs: {
          github_token: TOKEN,
          output_action: "none",
          plugin_github: true,
        },
        cwd: CWD,
        fs: createMemoryFs({}),
      });

      expect(result.did_commit).toBe(false);
    });

    it("forces did_commit false on dry_run and does not publish", async () => {
      runEngine.mockResolvedValue({
        files: ["profile-bits/stats.svg"],
        did_commit: true,
        skipped: [],
      });

      const result = await runMain({
        inputs: {
          github_token: TOKEN,
          output_action: "commit",
          dry_run: true,
          plugin_github: true,
        },
        cwd: CWD,
        fs: createMemoryFs({}),
      });

      expect(runEngine).toHaveBeenCalledOnce();
      expect(runEngine.mock.calls[0]?.[0]?.inputs.dry_run).toBe(true);
      expect(result.did_commit).toBe(false);
    });
  });

  describe("yaml SSOT vs plugin_github", () => {
    it("uses yaml and ignores plugin_github when the config file exists", async () => {
      await runMain({
        inputs: {
          github_token: TOKEN,
          output_action: "none",
          plugin_github: true,
        },
        cwd: CWD,
        fs: createMemoryFs({ [DEFAULT_CONFIG_PATH]: DEMO_ONLY_YAML }),
      });

      const loaded = runEngine.mock.calls[0]?.[0];
      expect(loaded?.configFileExists).toBe(true);
      expect(loaded?.inputs.plugin_github).toBe(true);
      expect(loaded?.config.plugins.github?.widgets?.demo?.text).toBe(
        "only-demo",
      );
      expect(loaded?.config.plugins.github?.widgets?.stats).toBeUndefined();
      expect(loaded?.config.plugins.github?.widgets?.languages).toBeUndefined();
    });

    it("applies stats+languages defaults when plugin_github is true and the file is absent", async () => {
      await runMain({
        inputs: {
          github_token: TOKEN,
          output_action: "none",
          plugin_github: true,
        },
        cwd: CWD,
        fs: createMemoryFs({}),
      });

      const loaded = runEngine.mock.calls[0]?.[0];
      expect(loaded?.configFileExists).toBe(false);
      expect(loaded?.config.plugins.github?.widgets?.demo).toBeUndefined();
      expect(loaded?.config.plugins.github?.widgets?.stats).toEqual({
        ...STATS_OPTION_DEFAULTS,
      });
      expect(loaded?.config.plugins.github?.widgets?.languages).toEqual({
        ...LANGUAGES_OPTION_DEFAULTS,
      });
      expect(Object.keys(loaded?.config.plugins.github?.widgets ?? {})).toEqual(
        [...GITHUB_PACK_DEFAULT_WIDGETS],
      );
    });
  });

  describe("Action outputs", () => {
    it("sets files, did_commit, and skipped on GITHUB_OUTPUT", async () => {
      const outputFile = await githubOutputPath();

      const result = await runMain({
        inputs: {
          github_token: TOKEN,
          output_action: "none",
          plugin_github: true,
        },
        env: { GITHUB_OUTPUT: outputFile },
        cwd: CWD,
        fs: createMemoryFs({}),
      });

      const written = parseGithubOutput(await readFile(outputFile, "utf8"));
      expect(result.files).toEqual(ENGINE_NONE.files);
      expect(result.did_commit).toBe(false);
      expect(result.skipped).toEqual(ENGINE_NONE.skipped);
      expect(written.files).toBe(
        "profile-bits/stats.svg,profile-bits/languages.svg",
      );
      expect(written.did_commit).toBe("false");
      expect(written.skipped).toBe("github/stats:contributions");
    });

    it("reads @actions/core-style INPUT_* env when no inputs argument is passed", async () => {
      await runMain({
        env: {
          INPUT_GITHUB_TOKEN: TOKEN,
          INPUT_OUTPUT_ACTION: "none",
          INPUT_PLUGIN_GITHUB: "true",
          INPUT_DRY_RUN: "true",
        },
        cwd: CWD,
        fs: createMemoryFs({}),
      });

      const loaded = runEngine.mock.calls[0]?.[0];
      expect(loaded?.inputs.github_token).toBe(TOKEN);
      expect(loaded?.inputs.output_action).toBe("none");
      expect(loaded?.inputs.plugin_github).toBe(true);
      expect(loaded?.inputs.dry_run).toBe(true);
    });

    it("passes through did_commit from the engine for a real commit run", async () => {
      runEngine.mockResolvedValue({
        files: ["profile-bits/stats.svg"],
        did_commit: true,
        skipped: [],
      });

      const outputFile = await githubOutputPath();
      const result = await runMain({
        inputs: {
          github_token: TOKEN,
          output_action: "commit",
          plugin_github: true,
        },
        env: { GITHUB_OUTPUT: outputFile },
        cwd: CWD,
        fs: createMemoryFs({}),
      });

      const written = parseGithubOutput(await readFile(outputFile, "utf8"));
      expect(result.did_commit).toBe(true);
      expect(written.did_commit).toBe("true");
      expect(written.files).toBe("profile-bits/stats.svg");
      expect(written.skipped).toBe("");
    });
  });

  describe("wakatime token", () => {
    const wakatimeYaml = `version: 1
format: svg
plugins:
  wakatime: {}
`;

    it("passes INPUT_WAKATIME_TOKEN through to the engine", async () => {
      await runMain({
        env: {
          INPUT_GITHUB_TOKEN: TOKEN,
          INPUT_OUTPUT_ACTION: "none",
          INPUT_WAKATIME_TOKEN: "waka_from_env",
        },
        cwd: CWD,
        fs: createMemoryFs({ [DEFAULT_CONFIG_PATH]: wakatimeYaml }),
      });

      const loaded = runEngine.mock.calls[0]?.[0];
      const deps = runEngine.mock.calls[0]?.[1];
      expect(loaded?.inputs.wakatime_token).toBe("waka_from_env");
      expect(deps?.renderWidget).toEqual(expect.any(Function));
      expect(deps?.writeFiles).toEqual(expect.any(Function));
      expect(deps?.probeCapabilities).toBeUndefined();
    });

    it("fails when the wakatime pack is on and the token is empty", async () => {
      const { runEngine: actualRunEngine } =
        await vi.importActual<typeof import("./engine.ts")>("./engine.ts");
      runEngine.mockImplementation(actualRunEngine);

      await expect(
        runMain({
          inputs: {
            github_token: TOKEN,
            output_action: "none",
            wakatime_token: "",
          },
          cwd: CWD,
          fs: createMemoryFs({ [DEFAULT_CONFIG_PATH]: wakatimeYaml }),
        }),
      ).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof EngineError &&
          error.decision === "fail_job" &&
          error.message.includes("wakatime_token") &&
          !error.message.includes("waka_from_env"),
      );
    });

    it("forces did_commit false on dry_run when coding files exist", async () => {
      runEngine.mockResolvedValue({
        files: ["profile-bits/wakatime.svg"],
        did_commit: true,
        skipped: [],
      });

      const result = await runMain({
        inputs: {
          github_token: TOKEN,
          output_action: "commit",
          dry_run: true,
          wakatime_token: "waka_from_env",
        },
        cwd: CWD,
        fs: createMemoryFs({ [DEFAULT_CONFIG_PATH]: wakatimeYaml }),
      });

      expect(runEngine).toHaveBeenCalledOnce();
      expect(runEngine.mock.calls[0]?.[0]?.inputs.dry_run).toBe(true);
      expect(runEngine.mock.calls[0]?.[0]?.inputs.wakatime_token).toBe(
        "waka_from_env",
      );
      expect(result.files).toEqual(["profile-bits/wakatime.svg"]);
      expect(result.did_commit).toBe(false);
    });
  });
});
