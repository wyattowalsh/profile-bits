import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { object } from "@optique/core/constructs";
import { message } from "@optique/core/message";
import { optional, withDefault } from "@optique/core/modifiers";
import type { InferValue } from "@optique/core/parser";
import { command, constant, option } from "@optique/core/primitives";
import { string } from "@optique/core/valueparser";
import { bindEnv, createEnvContext, type EnvContext } from "@optique/env";
import { runAsync } from "@optique/run";
import { zod } from "@optique/zod";
import {
  ACTION_CONFIG_PATH_DEFAULT,
  OutputActionSchema,
  OutputConditionSchema,
  OutputFormatSchema,
  THIN_ACTION_INPUT_NAMES,
  ThemeSchema,
} from "@profile-bits/core";
/** CLI-layer default; do not change Action `ACTION_OUTPUT_ACTION_DEFAULT`. */
export const CLI_OUTPUT_ACTION_DEFAULT = "none" as const;

const PACKAGE_JSON = join(
  dirname(fileURLToPath(import.meta.url)),
  "../package.json",
);

export function readCliVersion(): string {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
    version: string;
  };
  return pkg.version;
}

export function kebabFlag(name: string): `--${string}` {
  return `--${name.replaceAll("_", "-")}`;
}

export function createCliEnvContext(
  env: NodeJS.ProcessEnv = process.env,
): EnvContext {
  return createEnvContext({
    prefix: "",
    source: (key) => readTokenEnv(env, key),
  });
}

export function createRenderParser(envContext: EnvContext) {
  const githubToken = optional(
    bindEnv(
      option("--github-token", string({ metavar: "TOKEN" }), {
        description: message`GitHub token for API requests. Falls back to GITHUB_TOKEN then GH_TOKEN. Never printed.`,
      }),
      {
        context: envContext,
        key: "GITHUB_TOKEN",
        parser: string(),
      },
    ),
  );
  const wakatimeToken = optional(
    bindEnv(
      option("--wakatime-token", string({ metavar: "TOKEN" }), {
        description: message`WakaTime API key. Falls back to WAKATIME_TOKEN. Never printed.`,
      }),
      {
        context: envContext,
        key: "WAKATIME_TOKEN",
        parser: string(),
      },
    ),
  );

  return command(
    "render",
    object({
      command: constant("render" as const),
      user: optional(
        option("--user", string({ metavar: "LOGIN" }), {
          description: message`GitHub login to render widgets for.`,
        }),
      ),
      github_token: githubToken,
      committer_token: optional(
        option("--committer-token", string({ metavar: "TOKEN" }), {
          description: message`GitHub token for git commit, pull-request, and gist output.`,
        }),
      ),
      config: optional(
        option("--config", string({ metavar: "PATH" }), {
          description: message`Path to the profile-bits yaml config (SSOT). Default: ${ACTION_CONFIG_PATH_DEFAULT}.`,
        }),
      ),
      plugin_github: option("--plugin-github", {
        description: message`Enable the github pack only when the config file is absent.`,
      }),
      wakatime_token: wakatimeToken,
      http_token_env: optional(
        option("--http-token-env", string({ metavar: "ENV_NAME" }), {
          description: message`Name of the environment variable holding an optional HTTP Bearer token.`,
        }),
      ),
      format: optional(
        option(
          "--format",
          zod(OutputFormatSchema, { placeholder: "svg", metavar: "FORMAT" }),
          { description: message`Optional output format override.` },
        ),
      ),
      theme: optional(
        option(
          "--theme",
          zod(ThemeSchema, { placeholder: "dark", metavar: "THEME" }),
          { description: message`Optional named theme id override.` },
        ),
      ),
      output_pair: option("--output-pair", {
        description: message`Optional override to write both filename and filename-dark.`,
      }),
      animated: option("--animated", {
        description: message`Optional override for animated output.`,
      }),
      output_action: withDefault(
        option(
          "--output-action",
          zod(OutputActionSchema, {
            placeholder: CLI_OUTPUT_ACTION_DEFAULT,
            metavar: "ACTION",
          }),
          {
            description: message`How to publish widget files. CLI default is none (Action Marketplace default remains commit).`,
          },
        ),
        CLI_OUTPUT_ACTION_DEFAULT,
      ),
      committer_branch: optional(
        option("--committer-branch", string({ metavar: "BRANCH" }), {
          description: message`Branch to commit widget files to.`,
        }),
      ),
      committer_gist: optional(
        option("--committer-gist", string({ metavar: "GIST_ID" }), {
          description: message`Gist id to update when output_action is gist.`,
        }),
      ),
      output_condition: optional(
        option(
          "--output-condition",
          zod(OutputConditionSchema, {
            placeholder: "always",
            metavar: "WHEN",
          }),
          {
            description: message`When to publish output (always or data-changed).`,
          },
        ),
      ),
      timezone: optional(
        option("--timezone", string({ metavar: "IANA" }), {
          description: message`Optional timezone override (IANA name).`,
        }),
      ),
      dry_run: option("--dry-run", {
        description: message`Render widgets without committing, opening a pull request, or updating a gist.`,
      }),
      allow_skipped: option("--allow-skipped", {
        description: message`When set, the job may succeed if every github widget is skipped.`,
      }),
      json: option("--json", {
        description: message`Write machine-readable JSON to stdout.`,
      }),
      quiet: option("--quiet", {
        description: message`Suppress spinner and progress on stderr.`,
      }),
      verbose: option("--verbose", {
        description: message`Write extra diagnostics to stderr. Never prints token values.`,
      }),
      noInput: option("--no-input", {
        description: message`Never prompt. Default when stdin is not a TTY.`,
      }),
      noColor: option("--no-color", {
        description: message`Disable ANSI color. Also suppressed by NO_COLOR and non-TTY stdout.`,
      }),
    }),
    {
      brief: message`Render widgets from committed yaml.`,
      description: message`Load .github/profile-bits.yml (or --config) and write widget files via the Action engine. CLI default output_action is none.`,
    },
  );
}

export type RenderParser = ReturnType<typeof createRenderParser>;
export type RenderParserValue = InferValue<RenderParser>;

export const THIN_KEBAB_FLAGS: readonly string[] = THIN_ACTION_INPUT_NAMES.map(
  (name) => kebabFlag(name),
);

export type ParseCliOptions = {
  args?: readonly string[];
  env?: NodeJS.ProcessEnv;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
  onExit?: (exitCode: number) => never;
  colors?: boolean;
  programName?: string;
};

export async function parseCli(
  options: ParseCliOptions = {},
): Promise<RenderParserValue> {
  const env = options.env ?? process.env;
  const envContext = createCliEnvContext(env);
  const parser = createRenderParser(envContext);
  const args = options.args ?? process.argv.slice(2);
  const colors = options.colors ?? detectColors(args, env);
  return await runAsync(parser, {
    programName: options.programName ?? "profile-bits",
    args,
    help: "both",
    version: readCliVersion(),
    completion: "both",
    errorExitCode: 2,
    colors,
    showDefault: true,
    showChoices: true,
    aboveError: "usage",
    brief: message`Local runner around the Action engine. README delivery is the Action; this CLI writes widget files.`,
    contexts: [envContext],
    ...(options.stdout === undefined ? {} : { stdout: options.stdout }),
    ...(options.stderr === undefined ? {} : { stderr: options.stderr }),
    ...(options.onExit === undefined ? {} : { onExit: options.onExit }),
  });
}

export function detectColors(
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): boolean {
  if (args.includes("--no-color")) {
    return false;
  }
  if (env.NO_COLOR != null && env.NO_COLOR !== "") {
    return false;
  }
  return process.stdout.isTTY === true;
}

function readTokenEnv(env: NodeJS.ProcessEnv, key: string): string | undefined {
  if (key === "GITHUB_TOKEN") {
    const githubToken = env.GITHUB_TOKEN;
    if (githubToken != null && githubToken.trim() !== "") {
      return githubToken;
    }
    return env.GH_TOKEN;
  }
  return env[key];
}
