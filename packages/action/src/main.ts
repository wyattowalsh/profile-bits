import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { redactSecrets, THIN_ACTION_INPUT_NAMES } from "@profile-bits/core";
import {
  createHttpClient,
  createRssClient,
  type HttpFetch,
  type HttpLookup,
} from "@profile-bits/integrations";
import { type ActionClientFactories, createActionClients } from "./clients.js";
import { EngineError, runEngine } from "./engine.js";
import { createGistOutputPorts } from "./gist.js";
import { createGitOutputPorts } from "./git.js";
import {
  type ConfigFs,
  type LoadedActionConfig,
  loadConfig,
} from "./load-config.js";
import type { ActionRunOutputs, OutputPorts } from "./output.js";
import { publishProbeFromGithubToken } from "./publish-probe.js";
import { createRenderWidgetFromClients } from "./render.js";
import { createFeedRenderWidget } from "./render-feed.js";
import { createHttpRenderWidget } from "./render-http.js";
import { composeRenderWidgets } from "./render-widgets.js";
import { createWriteWidgetFiles } from "./write-files.js";

/** Action job outputs. Engine returns these; main writes `GITHUB_OUTPUT`. */
export type EngineResult = ActionRunOutputs;

export type ActionRunResult = EngineResult;

export type RunMainOptions = {
  /** Thin Action inputs. When set, `INPUT_*` env is not read. */
  inputs?: Record<string, unknown>;
  /** Env used for `INPUT_*`, `http_token_env` lookup, and `GITHUB_OUTPUT`. */
  env?: NodeJS.ProcessEnv;
  /** Directory used to resolve a relative config path. */
  cwd?: string;
  /** Injectable filesystem forwarded to `loadConfig`. */
  fs?: ConfigFs;
  /** Test-only GET. Production omits `fetch` so pinned HTTPS GET runs. */
  httpFetch?: HttpFetch;
  /** Test-only DNS lookup. Production uses the client default. */
  httpLookup?: HttpLookup;
  /** Test-only client constructors. Production uses package defaults. */
  clientFactories?: ActionClientFactories;
};

/**
 * GitHub Action entry: map `INPUT_*` (or an explicit inputs object) through
 * `loadConfig`, call `runEngine`, and set `files` / `did_commit` / `skipped`.
 * `output_action: none` and `dry_run` never report a commit.
 */
export async function runMain(
  options: RunMainOptions = {},
): Promise<ActionRunResult> {
  const env = options.env ?? process.env;
  const raw = options.inputs ?? readInputsFromEnv(env);
  const loaded = loadConfig(raw, { cwd: options.cwd, fs: options.fs });
  const token = httpTokenFromEnv(env, loaded.inputs.http_token_env);
  const client = createHttpClient({
    ...(token !== undefined ? { token } : {}),
    ...(options.httpFetch !== undefined ? { fetch: options.httpFetch } : {}),
    ...(options.httpLookup !== undefined ? { lookup: options.httpLookup } : {}),
  });
  const rssClient = createRssClient();
  const clients = createActionClients(loaded, options.clientFactories);
  const github = clients.github;
  const probe =
    github === undefined
      ? publishProbeFromGithubToken(loaded.inputs.github_token)
      : {
          tokenClass: github.tokenClass,
          capabilities: github.capabilities,
        };
  const writeCwd = options.cwd ?? env.GITHUB_WORKSPACE ?? process.cwd();
  const output = outputPortsFor(loaded, { cwd: options.cwd, env });
  const engine = await runEngine(loaded, {
    renderWidget: composeRenderWidgets({
      json: createHttpRenderWidget({ client }),
      feed: createFeedRenderWidget({ client: rssClient }),
      github: createRenderWidgetFromClients(clients),
    }),
    probeCapabilities: () => probe.capabilities,
    tokenClass: probe.tokenClass,
    writeFiles: createWriteWidgetFiles({ cwd: writeCwd }),
    ...(output === undefined ? {} : { output }),
  });
  const result = applyPublishGuards(loaded, engine);

  writeActionOutputs(env.GITHUB_OUTPUT, result);
  return result;
}

export const main = runMain;

function outputPortsFor(
  loaded: LoadedActionConfig,
  host: { cwd?: string; env: NodeJS.ProcessEnv },
): OutputPorts | undefined {
  const action = loaded.inputs.output_action;
  if (action === "gist") {
    return createGistOutputPorts({ env: host.env });
  }
  if (action === "commit" || action === "pull-request") {
    return createGitOutputPorts({
      ...(host.cwd === undefined ? {} : { cwd: host.cwd }),
      env: host.env,
    });
  }
  return undefined;
}

function httpTokenFromEnv(
  env: NodeJS.ProcessEnv,
  envName: string | undefined,
): string | undefined {
  if (envName == null || envName.trim() === "") {
    return undefined;
  }
  return env[envName] ?? "";
}

function readInputsFromEnv(env: NodeJS.ProcessEnv): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const name of THIN_ACTION_INPUT_NAMES) {
    const key = envInputKey(name);
    if (Object.hasOwn(env, key)) {
      raw[name] = env[key];
    }
  }
  return raw;
}

function envInputKey(name: string): string {
  return `INPUT_${name.replaceAll(" ", "_").toUpperCase()}`;
}

function applyPublishGuards(
  loaded: LoadedActionConfig,
  result: EngineResult,
): ActionRunResult {
  const suppressCommit =
    loaded.inputs.dry_run === true || loaded.inputs.output_action === "none";
  return {
    files: result.files,
    did_commit: suppressCommit ? false : result.did_commit,
    skipped: result.skipped,
  };
}

function writeActionOutputs(
  outputFile: string | undefined,
  result: ActionRunResult,
): void {
  if (outputFile == null || outputFile.trim() === "") {
    return;
  }
  const outputs: Readonly<Record<string, string>> = {
    files: formatList(result.files),
    did_commit: result.did_commit ? "true" : "false",
    skipped: formatList(result.skipped),
  };
  for (const [name, value] of Object.entries(outputs)) {
    appendActionOutput(outputFile, name, value);
  }
}

function formatList(values: readonly string[]): string {
  return values.join(",");
}

function appendActionOutput(file: string, name: string, value: string): void {
  if (value.includes("\n") || value.includes("\r")) {
    const delim = `ghadelim_${name}`;
    appendFileSync(file, `${name}<<${delim}\n${value}\n${delim}\n`);
    return;
  }
  appendFileSync(file, `${name}=${value}\n`);
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (entry == null) {
    return false;
  }
  try {
    return pathToFileURL(resolve(entry)).href === import.meta.url;
  } catch {
    return false;
  }
}

function workflowError(error: unknown): void {
  const raw = error instanceof Error ? error.message : String(error);
  const message = redactSecrets(raw);
  const line =
    error instanceof EngineError ? `${error.decision} ${message}` : message;
  const escaped = line
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
  process.stdout.write(`::error::${escaped}\n`);
}

if (isDirectRun()) {
  void runMain().catch((error: unknown) => {
    const message = redactSecrets(
      error instanceof Error ? error.message : String(error),
    );
    if (process.env.GITHUB_ACTIONS === "true") {
      workflowError(error);
    }
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
