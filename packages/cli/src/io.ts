import type { Writable } from "node:stream";
import { spinner as createSpinner, type SpinnerResult } from "@clack/prompts";
import { redactSecrets } from "@profile-bits/core";
import { errorMessage, isEpipeError } from "./errors.ts";

export type JsonRenderResult = {
  files: string[];
  skipped: string[];
  did_commit: boolean;
};

export type IoStreams = {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
};

export type Presentation = {
  json: boolean;
  quiet: boolean;
  verbose: boolean;
  noInput: boolean;
  noColor: boolean;
};

export function installStdoutEpipeGuard(
  stream: NodeJS.WriteStream = process.stdout,
): () => void {
  const onError = (error: unknown): void => {
    if (isEpipeError(error)) {
      return;
    }
    throw error;
  };
  stream.on("error", onError);
  return () => {
    stream.off("error", onError);
  };
}

export function writeIgnoringEpipe(
  write: (text: string) => void,
  text: string,
): void {
  try {
    write(text);
  } catch (error) {
    if (isEpipeError(error)) {
      return;
    }
    throw error;
  }
}

export function defaultStdout(text: string): void {
  writeIgnoringEpipe((chunk) => {
    process.stdout.write(`${chunk}\n`);
  }, text);
}

export function defaultStderr(text: string): void {
  writeIgnoringEpipe((chunk) => {
    process.stderr.write(`${chunk}\n`);
  }, text);
}

export function formatHumanResult(result: JsonRenderResult): string {
  if (result.files.length === 0) {
    return "No widget files written.";
  }
  return result.files.join("\n");
}

export function formatJsonResult(result: JsonRenderResult): string {
  const payload: JsonRenderResult = {
    files: result.files,
    skipped: result.skipped,
    did_commit: result.did_commit,
  };
  return JSON.stringify(payload);
}

export function collectSecrets(
  values: Readonly<Record<string, unknown>>,
  env: NodeJS.ProcessEnv,
): string[] {
  const secrets: string[] = [];
  pushSecret(secrets, values.github_token);
  pushSecret(secrets, values.wakatime_token);
  pushSecret(secrets, values.committer_token);
  pushSecret(secrets, env.GITHUB_TOKEN);
  pushSecret(secrets, env.GH_TOKEN);
  pushSecret(secrets, env.WAKATIME_TOKEN);
  const httpTokenEnv = values.http_token_env;
  if (typeof httpTokenEnv === "string" && httpTokenEnv.trim() !== "") {
    pushSecret(secrets, env[httpTokenEnv]);
  }
  return secrets;
}

export function redactOutput(text: string, secrets: readonly string[]): string {
  return redactSecrets(text, secrets);
}

export function printResult(
  io: IoStreams,
  result: JsonRenderResult,
  presentation: Presentation,
  secrets: readonly string[],
): void {
  const body = presentation.json
    ? formatJsonResult(result)
    : formatHumanResult(result);
  writeIgnoringEpipe(io.stdout, redactOutput(body, secrets));
  if (presentation.verbose && !presentation.quiet && !presentation.json) {
    writeIgnoringEpipe(
      io.stderr,
      redactOutput(
        `skipped: ${result.skipped.join(", ") || "(none)"}`,
        secrets,
      ),
    );
    writeIgnoringEpipe(
      io.stderr,
      redactOutput(`did_commit: ${String(result.did_commit)}`, secrets),
    );
  }
}

export function printError(
  io: IoStreams,
  error: unknown,
  secrets: readonly string[],
): void {
  writeIgnoringEpipe(io.stderr, redactOutput(errorMessage(error), secrets));
}

export function shouldShowSpinner(
  presentation: Presentation,
  stderrIsTTY: boolean,
): boolean {
  return !presentation.json && !presentation.quiet && stderrIsTTY;
}

export function startRenderSpinner(
  presentation: Presentation,
  options: {
    output?: Writable;
    signal?: AbortSignal;
    stderrIsTTY?: boolean;
  } = {},
): SpinnerResult | undefined {
  if (!shouldShowSpinner(presentation, options.stderrIsTTY ?? false)) {
    return undefined;
  }
  const spinner = createSpinner({
    ...(options.output === undefined ? {} : { output: options.output }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  spinner.start("Rendering widgets");
  return spinner;
}

export function stopRenderSpinner(
  spinner: SpinnerResult | undefined,
  outcome: "ok" | "error" | "cancel",
): void {
  if (spinner === undefined) {
    return;
  }
  if (outcome === "ok") {
    spinner.stop("Rendered widgets");
    return;
  }
  if (outcome === "cancel") {
    spinner.cancel("Cancelled");
    return;
  }
  spinner.error("Render failed");
}

function pushSecret(secrets: string[], value: unknown): void {
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return;
  }
  secrets.push(trimmed);
}
