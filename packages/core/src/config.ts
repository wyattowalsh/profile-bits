import {
  type ActionInputs,
  CONFIG_DEFAULTS,
  CONFIG_VERSION_DEFAULT,
  CodingOptionsSchema,
  type Config,
  ConfigSchema,
  DEMO_OPTION_DEFAULTS,
  dedupePreserveOrder,
  GITHUB_PACK_DEFAULT_WIDGETS,
  type GithubWidgetsConfig,
  LANGUAGES_OPTION_DEFAULTS,
  LanguagesOptionsSchema,
  STATS_OPTION_DEFAULTS,
  StatsOptionsSchema,
  type WakatimeWidgetsConfig,
} from "./types.js";

export {
  CONFIG_DEFAULTS,
  DEMO_OPTION_DEFAULTS,
  GITHUB_PACK_DEFAULT_WIDGETS,
  LANGUAGES_OPTION_DEFAULTS,
  STATS_OPTION_DEFAULTS,
};

/** Thin Action keys that overlay yaml / pack defaults when provided. */
export type ConfigOverrides = Pick<
  ActionInputs,
  "format" | "theme" | "output_pair" | "animated" | "timezone"
>;

/** Default committed `.github/profile-bits.yml` (plan yaml shape). */
export const DEFAULT_YAML = `version: 1
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

/** JS object matching {@link DEFAULT_YAML}. */
export const DEFAULT_YAML_OBJECT = {
  ...CONFIG_DEFAULTS,
  plugins: {
    github: {
      widgets: {
        stats: { ...STATS_OPTION_DEFAULTS },
        languages: { ...LANGUAGES_OPTION_DEFAULTS },
      },
    },
  },
};

export function githubPackDefaultWidgets(): GithubWidgetsConfig {
  return {
    stats: StatsOptionsSchema.parse({}),
    languages: LanguagesOptionsSchema.parse({}),
  };
}

export function widgetListSpecified(
  widgets: GithubWidgetsConfig | undefined,
): boolean {
  return (
    widgets?.demo !== undefined ||
    widgets?.stats !== undefined ||
    widgets?.languages !== undefined
  );
}

/** Enable `stats` + `languages` when github is on and no widget list is set. */
export function applyGithubPackDefaults(config: Config): Config {
  const github = config.plugins.github;
  if (github === undefined || widgetListSpecified(github.widgets)) {
    return config;
  }
  return {
    ...config,
    plugins: {
      ...config.plugins,
      github: {
        ...github,
        widgets: githubPackDefaultWidgets(),
      },
    },
  };
}

/** Enable `coding` when wakatime is on and no widget list is set. */
export function wakatimePackDefaultWidgets(): WakatimeWidgetsConfig {
  return {
    coding: CodingOptionsSchema.parse({}),
  };
}

export function wakatimeWidgetListSpecified(
  widgets: WakatimeWidgetsConfig | undefined,
): boolean {
  return widgets?.coding !== undefined;
}

export function applyWakatimePackDefaults(config: Config): Config {
  const wakatime = config.plugins.wakatime;
  if (wakatime === undefined || wakatimeWidgetListSpecified(wakatime.widgets)) {
    return normalizeWakatimeIncludes(config);
  }
  return normalizeWakatimeIncludes({
    ...config,
    plugins: {
      ...config.plugins,
      wakatime: {
        ...wakatime,
        widgets: wakatimePackDefaultWidgets(),
      },
    },
  });
}

function normalizeWakatimeIncludes(config: Config): Config {
  const coding = config.plugins.wakatime?.widgets?.coding;
  if (coding === undefined) {
    return config;
  }
  const include = dedupePreserveOrder(coding.include);
  if (include.length === coding.include.length) {
    return config;
  }
  const wakatime = config.plugins.wakatime;
  if (wakatime === undefined) {
    return config;
  }
  return {
    ...config,
    plugins: {
      ...config.plugins,
      wakatime: {
        ...wakatime,
        widgets: {
          ...wakatime.widgets,
          coding: { ...coding, include },
        },
      },
    },
  };
}

export function applyActionOverrides(
  config: Config,
  overrides: ConfigOverrides = {},
): Config {
  return {
    ...config,
    ...(overrides.format !== undefined ? { format: overrides.format } : {}),
    ...(overrides.theme !== undefined ? { theme: overrides.theme } : {}),
    ...(overrides.output_pair !== undefined
      ? { output_pair: overrides.output_pair }
      : {}),
    ...(overrides.animated !== undefined
      ? { animated: overrides.animated }
      : {}),
    ...(overrides.timezone !== undefined
      ? { timezone: overrides.timezone }
      : {}),
  };
}

/** Pack defaults when `plugin_github` is true and the config file is absent. */
export function createGithubPackDefaultConfig(): Config {
  return applyGithubPackDefaults(
    ConfigSchema.parse({
      version: CONFIG_VERSION_DEFAULT,
      plugins: { github: {} },
    }),
  );
}

/** No github widgets (`plugin_github` false / omitted and no config file). */
export function createEmptyPluginsConfig(): Config {
  return ConfigSchema.parse({
    version: CONFIG_VERSION_DEFAULT,
    plugins: {},
  });
}

export const DEFAULT_CONFIG: Config = ConfigSchema.parse(DEFAULT_YAML_OBJECT);
