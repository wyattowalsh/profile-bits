import { resolveColorRef, THEME_REGISTRY } from "@profile-bits/themes";
import { parse as parseYaml } from "yaml";
import * as z from "zod";
import {
  applyActionOverrides,
  applyGithubPackDefaults,
  applyWakatimePackDefaults,
  type ConfigOverrides,
  createEmptyPluginsConfig,
  createGithubPackDefaultConfig,
} from "./config.js";
import { themeMembersFor } from "./themes-for.js";
import {
  type ActionInputs,
  type Config,
  ConfigSchema,
  type CustomRoleMap,
  customThemeMissingPair,
  isCustomThemeConfig,
  ThemeSchema,
} from "./types.js";

const CUSTOM_COLOR_ROLES = [
  "bg",
  "card",
  "text",
  "muted",
  "accent",
  "border",
] as const satisfies readonly (keyof CustomRoleMap)[];

export class ConfigParseError extends Error {
  override readonly name = "ConfigParseError";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

export type ParseConfigInput = Omit<ConfigOverrides, "theme"> &
  Pick<ActionInputs, "plugin_github"> & {
    /** YAML file contents. Presence (including `""`) means the config file exists. */
    yaml?: string;
    /** Thin Action theme override. Named catalog id only; `custom` fails. */
    theme?: string;
  };

export function parseYamlConfig(yaml: string): Config {
  let raw: unknown;
  try {
    raw = parseYaml(yaml);
  } catch (cause) {
    throw new ConfigParseError("Failed to parse config YAML", { cause });
  }

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigParseError(z.prettifyError(result.error), {
      cause: result.error,
    });
  }
  return applyWakatimePackDefaults(
    applyGithubPackDefaults(assertCustomThemePair(result.data)),
  );
}

/**
 * Resolve config from yaml (SSOT when present) or `plugin_github` pack defaults.
 * Thin Action overrides apply last when provided.
 */
export function parseConfig(input: ParseConfigInput = {}): Config {
  let config: Config;
  if (input.yaml !== undefined) {
    config = parseYamlConfig(input.yaml);
  } else if (input.plugin_github === true) {
    config = createGithubPackDefaultConfig();
  } else {
    config = createEmptyPluginsConfig();
  }

  let themeOverride: ConfigOverrides["theme"];
  if (input.theme !== undefined) {
    const theme = ThemeSchema.safeParse(input.theme);
    if (!theme.success) {
      throw new ConfigParseError(z.prettifyError(theme.error), {
        cause: theme.error,
      });
    }
    themeOverride = theme.data;
  }

  return assertCustomThemePair(
    applyActionOverrides(config, {
      format: input.format,
      theme: themeOverride,
      output_pair: input.output_pair,
      animated: input.animated,
      timezone: input.timezone,
    }),
  );
}

function resolveCustomRoleMap(roles: CustomRoleMap): void {
  for (const role of CUSTOM_COLOR_ROLES) {
    try {
      resolveColorRef(roles[role], THEME_REGISTRY);
    } catch (cause) {
      throw new ConfigParseError(
        cause instanceof Error ? cause.message : "Invalid color ref",
        { cause },
      );
    }
  }
}

function assertThemeRefs(config: Config): Config {
  if (!isCustomThemeConfig(config.theme)) {
    return config;
  }
  resolveCustomRoleMap(config.theme.custom);
  const pair = config.theme.custom.pair;
  if (pair !== undefined && typeof pair !== "string") {
    resolveCustomRoleMap(pair);
  }
  try {
    themeMembersFor({ theme: config.theme, output_pair: false });
  } catch (cause) {
    throw new ConfigParseError(
      cause instanceof Error ? cause.message : "Invalid custom theme",
      { cause },
    );
  }
  return config;
}

function assertCustomThemePair(config: Config): Config {
  if (config.output_pair && customThemeMissingPair(config.theme)) {
    throw new ConfigParseError(
      "Custom theme requires pair when output_pair is true",
    );
  }
  return assertThemeRefs(config);
}
