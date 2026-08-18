import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  type ActionInputs,
  ActionInputsSchema,
  type Config,
  isMissingToken,
  parseConfig,
} from "@profile-bits/core";

export { ConfigParseError } from "@profile-bits/core";

const BOOLEAN_INPUT_KEYS = new Set([
  "plugin_github",
  "output_pair",
  "animated",
  "dry_run",
  "allow_skipped",
]);

const NODE_FS: ConfigFs = {
  existsSync,
  readFileSync: (path, encoding) => readFileSync(path, encoding),
};

/** Injectable subset of `node:fs` used to read the yaml SSOT. */
export type ConfigFs = {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: "utf8"): string;
};

export type LoadConfigOptions = {
  /** Injectable filesystem. Defaults to `node:fs`. */
  fs?: ConfigFs;
  /** Directory used to resolve a relative config path. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Explicit yaml path. Overrides the `config` input when set. */
  path?: string;
};

export class LoadConfigError extends Error {
  override readonly name: string = "LoadConfigError";
}

export class MissingGithubTokenError extends LoadConfigError {
  override readonly name = "MissingGithubTokenError";

  constructor() {
    super(
      'github_token is missing: empty, "", or whitespace fails the job (unauthenticated GitHub is not allowed)',
    );
  }
}

export type LoadedActionInputs = Omit<ActionInputs, "github_token"> & {
  github_token: string;
};

export type LoadedActionConfig = {
  inputs: LoadedActionInputs;
  config: Config;
  configPath: string;
  configFileExists: boolean;
};

/**
 * Parse thin Action inputs and resolve yaml / `plugin_github` pack defaults.
 * Yaml on disk is SSOT; `plugin_github: true` applies stats+languages only when
 * that file is absent. Unknown keys fail.
 */
export function loadConfig(
  rawInputs: Record<string, unknown>,
  options: LoadConfigOptions = {},
): LoadedActionConfig {
  const inputs = parseThinInputs(rawInputs);
  const githubToken = inputs.github_token;
  requireGithubToken(githubToken);

  const cwd = options.cwd ?? process.cwd();
  const fs = options.fs ?? NODE_FS;
  const configPath = resolve(cwd, options.path ?? inputs.config);
  const yaml = readYamlIfExists(configPath, fs);

  const config = parseConfig({
    ...(yaml !== undefined ? { yaml } : {}),
    plugin_github: inputs.plugin_github,
    format: inputs.format,
    theme: inputs.theme,
    output_pair: inputs.output_pair,
    animated: inputs.animated,
    timezone: inputs.timezone,
  });

  return {
    inputs: {
      ...inputs,
      github_token: githubToken.trim(),
    },
    config,
    configPath,
    configFileExists: yaml !== undefined,
  };
}

function parseThinInputs(rawInputs: Record<string, unknown>): ActionInputs {
  const result = ActionInputsSchema.safeParse(coerceThinInputs(rawInputs));
  if (!result.success) {
    throw new LoadConfigError(result.error.message, { cause: result.error });
  }
  return result.data;
}

function requireGithubToken(
  token: string | undefined,
): asserts token is string {
  if (isMissingToken(token)) {
    throw new MissingGithubTokenError();
  }
}

function coerceThinInputs(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const coerced: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (BOOLEAN_INPUT_KEYS.has(key)) {
      coerced[key] = coerceOptionalBoolean(value);
      continue;
    }
    if (
      key !== "github_token" &&
      typeof value === "string" &&
      value.trim() === ""
    ) {
      coerced[key] = undefined;
      continue;
    }
    coerced[key] = value;
  }
  return coerced;
}

function coerceOptionalBoolean(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return undefined;
    }
    const lower = trimmed.toLowerCase();
    if (lower === "true") {
      return true;
    }
    if (lower === "false") {
      return false;
    }
  }
  return value;
}

function readYamlIfExists(
  configPath: string,
  fs: ConfigFs,
): string | undefined {
  try {
    if (!fs.existsSync(configPath)) {
      return undefined;
    }
    return fs.readFileSync(configPath, "utf8");
  } catch (error) {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    error != null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
