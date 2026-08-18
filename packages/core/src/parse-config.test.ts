import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  DEFAULT_YAML,
  GITHUB_PACK_DEFAULT_WIDGETS,
} from "./config.js";
import { ConfigParseError, parseConfig } from "./parse-config.js";
import {
  CHIPS_OPTION_DEFAULTS,
  CHIPS_TYPES_MAX,
  CODING_OPTION_DEFAULTS,
  CONFIG_ANIMATED_DEFAULT,
  CONFIG_FORMAT_DEFAULT,
  CONFIG_OUTPUT_DIR_DEFAULT,
  CONFIG_OUTPUT_PAIR_DEFAULT,
  CONFIG_THEME_DEFAULT,
  CONFIG_TIMEZONE_DEFAULT,
  CONFIG_VERSION_DEFAULT,
  FEED_ANIMATE_DEFAULT,
  FEED_FILENAME_DEFAULT,
  FEED_LIMIT_DEFAULT,
  HTTP_CHIP_TYPES,
  JSON_ANIMATE_DEFAULT,
  JSON_FILENAME_DEFAULT,
  JSON_JMESPATH_DEFAULT,
  JSON_METHOD,
  JSON_OPTION_DEFAULTS,
  JSON_TIMEOUT_MS_DEFAULT,
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
      format: "png",
      theme: "light",
      output_pair: true,
      animated: true,
      timezone: "America/New_York",
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

  it("parses rss yaml round-trip with feed defaults", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  rss:
    widgets:
      feed:
        filename: feed
        url: https://example.com/feed.xml
        limit: 5
        animate: false
`,
    });

    expect(config.plugins.rss?.widgets?.feed).toEqual({
      filename: FEED_FILENAME_DEFAULT,
      url: "https://example.com/feed.xml",
      limit: FEED_LIMIT_DEFAULT,
      animate: FEED_ANIMATE_DEFAULT,
    });
  });

  it("fills feed filename, limit, and animate when only url is set", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  rss:
    widgets:
      feed:
        url: https://example.com/feed.xml
`,
    });

    expect(config.plugins.rss?.widgets?.feed).toEqual({
      filename: FEED_FILENAME_DEFAULT,
      url: "https://example.com/feed.xml",
      limit: FEED_LIMIT_DEFAULT,
      animate: FEED_ANIMATE_DEFAULT,
    });
  });

  it("fails when plugins.rss is present without feed url", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  rss: {}
`,
      }),
    ).toThrow(ConfigParseError);
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  rss:
    widgets:
      feed:
        filename: feed
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on an http feed url", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  rss:
    widgets:
      feed:
        url: http://example.com/feed.xml
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on an https feed url with userinfo", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  rss:
    widgets:
      feed:
        url: https://user:pass@example.com/feed.xml
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on an unknown rss widget key", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  rss:
    widgets:
      feed:
        url: https://example.com/feed.xml
        title: not-a-field
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("keeps DEFAULT_YAML equal to DEFAULT_CONFIG without rss", () => {
    expect(parseConfig({ yaml: DEFAULT_YAML })).toEqual(DEFAULT_CONFIG);
    expect(DEFAULT_CONFIG.plugins.rss).toBeUndefined();
    expect(parseConfig({ yaml: PLAN_DEFAULT_YAML })).toEqual(DEFAULT_CONFIG);
  });

  it("parses rss and github together", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  github:
    widgets:
      stats: {}
      languages: {}
  rss:
    widgets:
      feed:
        url: https://example.com/feed.xml
`,
    });

    expect(config.plugins.github?.widgets?.stats).toEqual({
      ...STATS_OPTION_DEFAULTS,
    });
    expect(config.plugins.github?.widgets?.languages).toEqual({
      ...LANGUAGES_OPTION_DEFAULTS,
    });
    expect(config.plugins.rss?.widgets?.feed?.url).toBe(
      "https://example.com/feed.xml",
    );
    expect(config.plugins.rss?.widgets?.feed?.limit).toBe(FEED_LIMIT_DEFAULT);
  });

  it("ignores plugin_github when yaml with rss is present", () => {
    const yaml = `version: 1
plugins:
  rss:
    widgets:
      feed:
        url: https://example.com/feed.xml
`;
    const withPluginOn = parseConfig({ yaml, plugin_github: true });
    const withPluginOff = parseConfig({ yaml, plugin_github: false });

    expect(withPluginOn.plugins.github).toBeUndefined();
    expect(withPluginOn.plugins.rss?.widgets?.feed?.url).toBe(
      "https://example.com/feed.xml",
    );
    expect(withPluginOff).toEqual(withPluginOn);
  });
});

describe("parseConfig wakatime pack", () => {
  it("keeps default yaml github-only with no wakatime pack", () => {
    const config = parseConfig({ yaml: DEFAULT_YAML });
    expect(config.plugins.wakatime).toBeUndefined();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("enables coding defaults when plugins.wakatime is empty", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  wakatime: {}
`,
    });
    expect(config.plugins.wakatime?.widgets?.coding).toEqual({
      ...CODING_OPTION_DEFAULTS,
    });
    expect(config.plugins.github).toBeUndefined();
  });

  it("parses an explicit wakatime coding block", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  wakatime:
    widgets:
      coding:
        filename: wakatime
        range: last_30_days
        include: [languages, os]
        limit: 4
        api_domain: wakapi.dev
        animate: true
`,
    });
    expect(config.plugins.wakatime?.widgets?.coding).toEqual({
      filename: "wakatime",
      range: "last_30_days",
      include: ["languages", "os"],
      limit: 4,
      api_domain: "wakapi.dev",
      animate: true,
    });
  });

  it("parses github and wakatime together", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  github: {}
  wakatime: {}
`,
    });
    expect(config.plugins.github?.widgets?.stats).toBeDefined();
    expect(config.plugins.github?.widgets?.languages).toBeDefined();
    expect(config.plugins.wakatime?.widgets?.coding).toEqual({
      ...CODING_OPTION_DEFAULTS,
    });
  });

  it("fails on empty coding include", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  wakatime:
    widgets:
      coding:
        include: []
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on an unknown coding include token", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  wakatime:
    widgets:
      coding:
        include: [languages, not_a_token]
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it.each([
    "localhost",
    "http://wakatime.com",
    "wakatime.com/api",
    "user@wakatime.com",
    "wakatime.com:443",
    "127.0.0.1",
    "metadata.google.internal",
  ])("fails parse for api_domain %s", (apiDomain) => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  wakatime:
    widgets:
      coding:
        api_domain: ${apiDomain}
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("dedupes coding include tokens while preserving order", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  wakatime:
    widgets:
      coding:
        include: [languages, editors, languages]
`,
    });
    expect(config.plugins.wakatime?.widgets?.coding?.include).toEqual([
      "languages",
      "editors",
    ]);
  });
});

describe("parseConfig http pack", () => {
  it("parses valid json yaml with defaults", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
`,
    });
    expect(config.plugins.http?.widgets?.json).toEqual({
      filename: JSON_FILENAME_DEFAULT,
      url: "https://example.com/api.json",
      jmespath: JSON_JMESPATH_DEFAULT,
      timeout_ms: JSON_TIMEOUT_MS_DEFAULT,
      method: JSON_METHOD,
      animate: JSON_ANIMATE_DEFAULT,
    });
    expect(config.plugins.http?.widgets?.json).toMatchObject(
      JSON_OPTION_DEFAULTS,
    );
    expect(config.plugins.http?.widgets?.chips).toBeUndefined();
  });

  it("parses plugins.http: {} as widget-less", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  http: {}
`,
    });
    expect(config.plugins.http?.widgets?.json).toBeUndefined();
    expect(config.plugins.http?.widgets?.chips).toBeUndefined();
  });

  it("fails when json is present without url", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  http:
    widgets:
      json:
        filename: json
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on an http:// json url", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  http:
    widgets:
      json:
        url: http://example.com/api.json
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on an unknown json option key", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
        title: not-a-field
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on plugin_http yaml key", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  plugin_http: true
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on Authorization header", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
        headers:
          Authorization: Bearer secret
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("keeps PLAN_DEFAULT_YAML equal to DEFAULT_CONFIG without http", () => {
    expect(parseConfig({ yaml: DEFAULT_YAML })).toEqual(DEFAULT_CONFIG);
    expect(DEFAULT_CONFIG.plugins.http).toBeUndefined();
    expect(parseConfig({ yaml: PLAN_DEFAULT_YAML })).toEqual(DEFAULT_CONFIG);
  });

  it("ignores plugin_github when yaml with http is present", () => {
    const yaml = `version: 1
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
`;
    const withPluginOn = parseConfig({ yaml, plugin_github: true });
    const withPluginOff = parseConfig({ yaml, plugin_github: false });
    expect(withPluginOn.plugins.github).toBeUndefined();
    expect(withPluginOff).toEqual(withPluginOn);
  });

  it("parses chips yaml with preset, types, package, and repo defaults", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  http:
    widgets:
      chips:
        preset: shieldcn
        types: [npm, stars, ci]
        package: react
        repo: vercel/next.js
`,
    });
    expect(config.plugins.http?.widgets?.chips).toEqual({
      ...CHIPS_OPTION_DEFAULTS,
      preset: "shieldcn",
      types: ["npm", "stars", "ci"],
      package: "react",
      repo: "vercel/next.js",
    });
    expect(config.plugins.http?.widgets?.chips?.filename).toBe("chips");
    expect(config.plugins.http?.widgets?.chips?.workflow).toBe("ci.yml");
    expect(config.plugins.http?.widgets?.chips?.timeout_ms).toBe(
      JSON_TIMEOUT_MS_DEFAULT,
    );
    expect(config.plugins.http?.widgets?.chips?.animate).toBe(false);
    expect(config.plugins.http?.widgets?.chips?.types).toEqual([
      "npm",
      "stars",
      "ci",
    ]);
    expect(config.plugins.http?.widgets?.json).toBeUndefined();
  });

  it("parses chips and json together", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
      chips:
        preset: shieldcn
        types: [npm, stars, ci]
        package: react
        repo: vercel/next.js
`,
    });
    expect(config.plugins.http?.widgets?.json).toEqual({
      filename: JSON_FILENAME_DEFAULT,
      url: "https://example.com/api.json",
      jmespath: JSON_JMESPATH_DEFAULT,
      timeout_ms: JSON_TIMEOUT_MS_DEFAULT,
      method: JSON_METHOD,
      animate: JSON_ANIMATE_DEFAULT,
    });
    expect(config.plugins.http?.widgets?.chips).toEqual({
      ...CHIPS_OPTION_DEFAULTS,
      preset: "shieldcn",
      types: ["npm", "stars", "ci"],
      package: "react",
      repo: "vercel/next.js",
    });
  });

  it("fails on empty chips types", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  http:
    widgets:
      chips:
        preset: shieldcn
        types: []
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on an unknown chips preset", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  http:
    widgets:
      chips:
        preset: not-a-preset
        types: [npm]
        package: react
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on an unknown chips type", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  http:
    widgets:
      chips:
        preset: shieldcn
        types: [npm, not_a_type]
        package: react
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it.each([
    ["url", "url: https://example.com/badge.json"],
    ["headers", "headers:\n          Accept: application/json"],
    ["bits", "bits: Chip"],
    ["method", "method: GET"],
  ] as const)("fails on extra chips key %s", (_key, extra) => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  http:
    widgets:
      chips:
        preset: shieldcn
        types: [npm]
        package: react
        ${extra}
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("parses chips when package and repo are omitted", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  http:
    widgets:
      chips:
        preset: shields
        types: [stars]
`,
    });
    expect(config.plugins.http?.widgets?.chips).toEqual({
      ...CHIPS_OPTION_DEFAULTS,
      preset: "shields",
      types: ["stars"],
    });
    expect(config.plugins.http?.widgets?.chips?.package).toBeUndefined();
    expect(config.plugins.http?.widgets?.chips?.repo).toBeUndefined();
  });

  it("dedupes chips types while preserving order", () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  http:
    widgets:
      chips:
        preset: shieldcn
        types: [npm, stars, npm]
        package: react
`,
    });
    expect(config.plugins.http?.widgets?.chips?.types).toEqual([
      "npm",
      "stars",
    ]);
  });

  it("fails when chips preset is missing", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  http:
    widgets:
      chips:
        types: [npm]
        package: react
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails when chips types exceed CHIPS_TYPES_MAX unique values", () => {
    const ninth = "downloads";
    const types = [...HTTP_CHIP_TYPES.slice(0, CHIPS_TYPES_MAX), ninth];
    expect(types).toHaveLength(CHIPS_TYPES_MAX + 1);
    expect(new Set(types).size).toBe(CHIPS_TYPES_MAX + 1);
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins:
  http:
    widgets:
      chips:
        preset: shieldcn
        types: [${types.join(", ")}]
        package: react
`,
      }),
    ).toThrow(ConfigParseError);
  });
});

describe("theme catalog parse", () => {
  it("keeps THEMES in lockstep with the host catalog", async () => {
    const { NAMED_THEME_IDS } = await import("@profile-bits/themes");
    const { THEMES } = await import("./types.js");
    expect([...THEMES]).toEqual([...NAMED_THEME_IDS]);
  });

  it("parses a named catalog id", () => {
    const config = parseConfig({
      yaml: `version: 1
theme: catppuccin-mocha
plugins: {}
`,
    });
    expect(config.theme).toBe("catppuccin-mocha");
  });

  it("parses a custom role map with refs and hex", () => {
    const config = parseConfig({
      yaml: `version: 1
theme:
  custom:
    bg: catppuccin-mocha.base
    card: dark.card
    text: "#e6edf3"
    muted: nord.muted
    accent: catppuccin-mocha.mauve
    border: "#30363d"
plugins: {}
`,
    });
    expect(config.theme).toEqual({
      custom: {
        bg: "catppuccin-mocha.base",
        card: "dark.card",
        text: "#e6edf3",
        muted: "nord.muted",
        accent: "catppuccin-mocha.mauve",
        border: "#30363d",
      },
    });
  });

  it("lets Action named id win over yaml custom", () => {
    const config = parseConfig({
      yaml: `version: 1
theme:
  custom:
    bg: "#000000"
    card: "#111111"
    text: "#eeeeee"
    muted: "#888888"
    accent: "#0000ff"
    border: "#222222"
    pair: light
plugins: {}
`,
      theme: "nord",
    });
    expect(config.theme).toBe("nord");
  });

  it("fails on an unknown named id", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
theme: radical
plugins: {}
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails on an unknown custom swatch", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
theme:
  custom:
    bg: catppuccin-mocha.not-a-swatch
    card: dark.card
    text: dark.text
    muted: dark.muted
    accent: dark.accent
    border: dark.border
plugins: {}
`,
      }),
    ).toThrow(/Unknown swatch or role "not-a-swatch"/);
  });

  it("fails on an unknown custom flavor", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
theme:
  custom:
    bg: merko.bg
    card: dark.card
    text: dark.text
    muted: dark.muted
    accent: dark.accent
    border: dark.border
plugins: {}
`,
      }),
    ).toThrow(/Unknown theme flavor "merko"/);
  });

  it("fails on malformed custom hex", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
theme:
  custom:
    bg: "#ggg"
    card: dark.card
    text: dark.text
    muted: dark.muted
    accent: dark.accent
    border: dark.border
plugins: {}
`,
      }),
    ).toThrow(/Malformed hex color/);
  });

  it("fails when a custom role is missing", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
theme:
  custom:
    bg: dark.bg
    card: dark.card
    text: dark.text
    muted: dark.muted
    accent: dark.accent
plugins: {}
`,
      }),
    ).toThrow(ConfigParseError);
  });

  it("fails when output_pair is true and custom has no pair", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
output_pair: true
theme:
  custom:
    bg: dark.bg
    card: dark.card
    text: dark.text
    muted: dark.muted
    accent: dark.accent
    border: dark.border
plugins: {}
`,
      }),
    ).toThrow(/Custom theme requires pair when output_pair is true/);
  });

  it("fails when Action output_pair is true and yaml custom has no pair", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
theme:
  custom:
    bg: dark.bg
    card: dark.card
    text: dark.text
    muted: dark.muted
    accent: dark.accent
    border: dark.border
plugins: {}
`,
        output_pair: true,
      }),
    ).toThrow(/Custom theme requires pair when output_pair is true/);
  });

  it("fails when Action theme is custom", () => {
    expect(() =>
      parseConfig({
        yaml: `version: 1
plugins: {}
`,
        theme: "custom",
      }),
    ).toThrow(ConfigParseError);
  });

  it("accepts custom with a named pair when output_pair is true", () => {
    const config = parseConfig({
      yaml: `version: 1
output_pair: true
theme:
  custom:
    bg: dark.bg
    card: dark.card
    text: dark.text
    muted: dark.muted
    accent: dark.accent
    border: dark.border
    pair: light
plugins: {}
`,
    });
    expect(config.output_pair).toBe(true);
    expect(config.theme).toMatchObject({ custom: { pair: "light" } });
  });
});
