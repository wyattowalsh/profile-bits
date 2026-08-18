import {
  ACTION_CONFIG_PATH_DEFAULT,
  CODING_OPTION_DEFAULTS,
  ConfigParseError,
  GITHUB_PACK_DEFAULT_WIDGETS,
  LANGUAGES_OPTION_DEFAULTS,
  STATS_OPTION_DEFAULTS,
} from "@profile-bits/core";
import { describe, expect, it, vi } from "vitest";
import {
  type ConfigFs,
  LoadConfigError,
  loadConfig,
  MissingGithubTokenError,
} from "./load-config.ts";

const TOKEN = "ghs_test_token";
const CWD = "/repo";
const DEFAULT_CONFIG_PATH = `${CWD}/${ACTION_CONFIG_PATH_DEFAULT}`;

const DEMO_ONLY_YAML = `version: 1
plugins:
  github:
    widgets:
      demo:
        text: only-demo
`;

const EMPTY_PLUGINS_YAML = `version: 1
plugins: {}
`;

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

function load(
  inputs: Record<string, unknown>,
  files: Readonly<Record<string, string>> = {},
  options: { path?: string } = {},
) {
  return loadConfig(
    { github_token: TOKEN, ...inputs },
    { cwd: CWD, fs: createMemoryFs(files), ...options },
  );
}

describe("loadConfig", () => {
  describe("github_token", () => {
    it("fails the job when github_token is omitted", () => {
      expect(() =>
        loadConfig({}, { cwd: CWD, fs: createMemoryFs({}) }),
      ).toThrow(MissingGithubTokenError);
    });

    it("fails the job when github_token is empty", () => {
      expect(() =>
        loadConfig({ github_token: "" }, { cwd: CWD, fs: createMemoryFs({}) }),
      ).toThrow(MissingGithubTokenError);
    });

    it("fails the job when github_token is whitespace", () => {
      expect(() =>
        loadConfig(
          { github_token: "   " },
          { cwd: CWD, fs: createMemoryFs({}) },
        ),
      ).toThrow(MissingGithubTokenError);
      expect(() =>
        loadConfig(
          { github_token: "\t\n" },
          { cwd: CWD, fs: createMemoryFs({}) },
        ),
      ).toThrow(MissingGithubTokenError);
    });

    it("keeps a present token", () => {
      const loaded = load({});
      expect(loaded.inputs.github_token).toBe(TOKEN);
    });
  });

  describe("yaml SSOT vs plugin_github", () => {
    it("uses yaml and ignores plugin_github when the config file exists", () => {
      const withPluginOn = load(
        { plugin_github: true },
        { [DEFAULT_CONFIG_PATH]: DEMO_ONLY_YAML },
      );
      const withPluginOff = load(
        { plugin_github: false },
        { [DEFAULT_CONFIG_PATH]: DEMO_ONLY_YAML },
      );

      expect(withPluginOn.config.plugins.github?.widgets?.demo?.text).toBe(
        "only-demo",
      );
      expect(
        withPluginOn.config.plugins.github?.widgets?.stats,
      ).toBeUndefined();
      expect(
        withPluginOn.config.plugins.github?.widgets?.languages,
      ).toBeUndefined();
      expect(withPluginOn.configFileExists).toBe(true);
      expect(withPluginOff.config).toEqual(withPluginOn.config);
    });

    it("applies stats+languages defaults when plugin_github is true and the file is absent", () => {
      const loaded = load({ plugin_github: true });

      expect(loaded.configFileExists).toBe(false);
      expect(loaded.config.plugins.github?.widgets?.demo).toBeUndefined();
      expect(loaded.config.plugins.github?.widgets?.stats).toEqual({
        ...STATS_OPTION_DEFAULTS,
      });
      expect(loaded.config.plugins.github?.widgets?.languages).toEqual({
        ...LANGUAGES_OPTION_DEFAULTS,
      });
      expect(Object.keys(loaded.config.plugins.github?.widgets ?? {})).toEqual([
        ...GITHUB_PACK_DEFAULT_WIDGETS,
      ]);
    });

    it("coerces plugin_github string true when the file is absent", () => {
      const loaded = load({ plugin_github: "true" });
      expect(loaded.inputs.plugin_github).toBe(true);
      expect(loaded.config.plugins.github?.widgets?.stats).toBeDefined();
      expect(loaded.config.plugins.github?.widgets?.languages).toBeDefined();
    });

    it("enables no github widgets when plugin_github is false and the file is absent", () => {
      const loaded = load({ plugin_github: false });
      expect(loaded.config.plugins.github).toBeUndefined();
    });

    it("enables no github widgets when plugin_github is omitted and the file is absent", () => {
      const loaded = load({});
      expect(loaded.config.plugins.github).toBeUndefined();
    });

    it("does not fall through to plugin_github when an existing file is invalid", () => {
      expect(() =>
        load({ plugin_github: true }, { [DEFAULT_CONFIG_PATH]: "" }),
      ).toThrow(ConfigParseError);
    });
  });

  describe("unknown keys", () => {
    it("fails on an unknown yaml key", () => {
      expect(() =>
        load(
          {},
          {
            [DEFAULT_CONFIG_PATH]: `version: 1
plugins: {}
not_a_field: true
`,
          },
        ),
      ).toThrow(ConfigParseError);
    });

    it("fails on an unknown Action input key", () => {
      expect(() => load({ plugin_github_stats_include: "followers" })).toThrow(
        LoadConfigError,
      );
    });
  });

  describe("thin overrides and paths", () => {
    it("applies thin Action overrides on top of yaml", () => {
      const loaded = load(
        {
          format: "png",
          theme: "light",
          output_pair: "true",
          animated: true,
          timezone: "America/New_York",
        },
        { [DEFAULT_CONFIG_PATH]: EMPTY_PLUGINS_YAML },
      );

      expect(loaded.config.format).toBe("png");
      expect(loaded.config.theme).toBe("light");
      expect(loaded.config.output_pair).toBe(true);
      expect(loaded.config.animated).toBe(true);
      expect(loaded.config.timezone).toBe("America/New_York");
    });

    it("resolves the default config path against cwd", () => {
      const loaded = load({}, { [DEFAULT_CONFIG_PATH]: EMPTY_PLUGINS_YAML });
      expect(loaded.configPath).toBe(DEFAULT_CONFIG_PATH);
    });

    it("reads a custom config input path from the injected fs", () => {
      const customPath = `${CWD}/custom/bits.yml`;
      const loaded = load(
        { config: "custom/bits.yml" },
        { [customPath]: DEMO_ONLY_YAML },
      );
      expect(loaded.configPath).toBe(customPath);
      expect(loaded.config.plugins.github?.widgets?.demo?.text).toBe(
        "only-demo",
      );
    });

    it("reads an explicit path option from the injected fs", () => {
      const explicit = "/tmp/profile-bits.yml";
      const loaded = load(
        { plugin_github: true },
        { [explicit]: DEMO_ONLY_YAML },
        { path: explicit },
      );
      expect(loaded.configPath).toBe(explicit);
      expect(loaded.config.plugins.github?.widgets?.stats).toBeUndefined();
    });

    it("does not touch a real repo filesystem when fs is injected", () => {
      const fs = createMemoryFs({});
      const existsSync = vi.spyOn(fs, "existsSync");
      loadConfig(
        { github_token: TOKEN, plugin_github: true },
        { cwd: CWD, fs },
      );
      expect(existsSync).toHaveBeenCalledWith(DEFAULT_CONFIG_PATH);
      expect(existsSync).toHaveBeenCalledTimes(1);
    });
  });

  describe("wakatime_token is pack-gated at the engine", () => {
    it("treats an empty wakatime_token as undefined", () => {
      const loaded = load({ wakatime_token: "" });
      expect(loaded.inputs.wakatime_token).toBeUndefined();
    });

    it("does not require wakatime_token when the pack is off", () => {
      const loaded = load({ plugin_github: true });
      expect(loaded.inputs.wakatime_token).toBeUndefined();
      expect(loaded.config.plugins.wakatime).toBeUndefined();
    });

    it("applies coding defaults when plugins.wakatime is empty", () => {
      const loaded = load(
        {},
        {
          [DEFAULT_CONFIG_PATH]: `version: 1
plugins:
  wakatime: {}
`,
        },
      );
      expect(loaded.config.plugins.wakatime?.widgets?.coding).toEqual({
        ...CODING_OPTION_DEFAULTS,
      });
      expect(loaded.inputs.wakatime_token).toBeUndefined();
    });
  });
});
