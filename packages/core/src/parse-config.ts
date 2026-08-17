import { parse as parseYaml } from "yaml";
import * as z from "zod";
import {
  applyActionOverrides,
  applyGithubPackDefaults,
  createEmptyPluginsConfig,
  createGithubPackDefaultConfig,
  type ConfigOverrides,
} from "./config.js";
import { ConfigSchema, type ActionInputs, type Config } from "./types.js";

export class ConfigParseError extends Error {
  override readonly name = "ConfigParseError";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

export type ParseConfigInput = ConfigOverrides &
  Pick<ActionInputs, "plugin_github"> & {
    /** YAML file contents. Presence (including `""`) means the config file exists. */
    yaml?: string;
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
  return applyGithubPackDefaults(result.data);
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

  return applyActionOverrides(config, {
    format:      input.format,
    theme:       input.theme,
    output_pair: input.output_pair,
    animated:    input.animated,
    timezone:    input.timezone,
  });
}
