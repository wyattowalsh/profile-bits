import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  DEFAULT_YAML,
  GITHUB_PACK_DEFAULT_WIDGETS,
} from "./config.js";
import { ConfigParseError, parseConfig } from "./parse-config.js";
import {
  CONFIG_ANIMATED_DEFAULT,
  CONFIG_FORMAT_DEFAULT,
  CONFIG_OUTPUT_DIR_DEFAULT,
  CONFIG_OUTPUT_PAIR_DEFAULT,
  CONFIG_THEME_DEFAULT,
  CONFIG_TIMEZONE_DEFAULT,
  CONFIG_VERSION_DEFAULT,
  LANGUAGES_OPTION_DEFAULTS,
  STATS_OPTION_DEFAULTS,
} from "./types.js";

const PLAN_DEFAULT_YAML = `version: 1
format: svg
theme: dark
output_pair: false
animated: false
timezone: UTC
output_dir: profile-bits
plugins:
  github:
    widgets:
      stats:
        filename: stats
        include: [followers, repos, stars]
        hide_rank: true
        avatar: true
        animate: false
        include_private: false
        include_forks: false
        include_archived: false
      languages:
        filename: languages
        limit: 8
        min_pct: 1
        exclude: []
        animate: false
        include_private: false
        include_forks: false
        include_archived: false
`;

describe("parseConfig", () => {
  it("parses the plan default yaml shape", () => {
    const config = parseConfig({ yaml: PLAN_DEFAULT_YAML });

    expect(config.version).toBe(CONFIG_VERSION_DEFAULT);
    expect(config.format).toBe(CONFIG_FORMAT_DEFAULT);
    expect(config.theme).toBe(CONFIG_THEME_DEFAULT);
    expect(config.output_pair).toBe(CONFIG_OUTPUT_PAIR_DEFAULT);
    expect(config.animated).toBe(CONFIG_ANIMATED_DEFAULT);
    expect(config.timezone).toBe(CONFIG_TIMEZONE_DEFAULT);
    expect(config.output_dir).toBe(CONFIG_OUTPUT_DIR_DEFAULT);
    expect(config.plugins.github?.widgets?.demo).toBeUndefined();
    expect(config.plugins.github?.widgets?.stats).toEqual({
      ...STATS_OPTION_DEFAULTS,
    });
    expect(config.plugins.github?.widgets?.languages).toEqual({
      ...LANGUAGES_OPTION_DEFAULTS,
    });
    expect(Object.keys(config.plugins.github?.widgets ?? {})).toEqual([
      ...GITHUB_PACK_DEFAULT_WIDGETS,
    ]);
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(parseConfig({ yaml: DEFAULT_YAML })).toEqual(config);
  });

  it("parses output_pair true from yaml", () => {
    const config = parseConfig({
      yaml: `version: 1
output_pair: true
plugins:
  github:
    widgets:
      stats: {}
`,
    });
    expect(config.output_pair).toBe(true);
  });

  it("fails on an unknown yaml key", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins: {}
not_a_field: true
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on an unknown stats include token", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  github:
    widgets:
      stats:
        include: [followers, not_a_token]
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("ignores plugin_github when yaml is present", () => {
    const yaml = `version: 1
plugins:
  github:
    widgets:
      demo:
        text: only-demo
`;
    const withPluginOn = parseConfig({ yaml, plugin_github: true });
    const withPluginOff = parseConfig({ yaml, plugin_github: false });

    expect(withPluginOn.plugins.github?.widgets?.demo?.text).toBe("only-demo");
    expect(withPluginOn.plugins.github?.widgets?.stats).toBeUndefined();
    expect(withPluginOn.plugins.github?.widgets?.languages).toBeUndefined();
    expect(withPluginOff).toEqual(withPluginOn);
  });

  it("applies stats+languages pack defaults when plugin_github is true and yaml is absent", () => {
    const config = parseConfig({ plugin_github: true });

    expect(config.plugins.github?.widgets?.demo).toBeUndefined();
    expect(config.plugins.github?.widgets?.stats).toEqual({
      ...STATS_OPTION_DEFAULTS,
    });
    expect(config.plugins.github?.widgets?.languages).toEqual({
      ...LANGUAGES_OPTION_DEFAULTS,
    });
    expect(Object.keys(config.plugins.github?.widgets ?? {})).toEqual([
      ...GITHUB_PACK_DEFAULT_WIDGETS,
    ]);
  });

  it("enables no github widgets when plugin_github is false and yaml is absent", () => {
    const config = parseConfig({ plugin_github: false });

    expect(config.plugins.github).toBeUndefined();
    expect(parseConfig({}).plugins.github).toBeUndefined();
  });

  it("fails when yaml contains flattened plugin_github_stats_include", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins: {}
plugin_github_stats_include: [followers]
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fills stats+languages when yaml enables github with no widget list", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  github: {}
`,
    });

    expect(config.plugins.github?.widgets?.demo).toBeUndefined();
    expect(config.plugins.github?.widgets?.stats).toBeDefined();
    expect(config.plugins.github?.widgets?.languages).toBeDefined();
  });

  it("applies thin Action overrides on top of yaml", () => {
    const config = parseConfig({
      yaml: PLAN_DEFAULT_YAML,
      format:      "png",
      theme:       "light",
      output_pair: true,
      animated:    true,
      timezone:    "America/New_York",
    });

    expect(config.format).toBe("png");
    expect(config.theme).toBe("light");
    expect(config.output_pair).toBe(true);
    expect(config.animated).toBe(true);
    expect(config.timezone).toBe("America/New_York");
    expect(config.plugins.github?.widgets?.stats).toEqual({
      ...STATS_OPTION_DEFAULTS,
    });
  });
});
