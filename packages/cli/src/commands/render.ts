import type { Writable } from "node:stream";
import type { ActionRunResult } from "@profile-bits/action";
import { runMain } from "@profile-bits/action";
import { EXIT_OPERATIONAL, EXIT_SUCCESS } from "../errors.ts";
import {
  collectSecrets,
  type IoStreams,
  type Presentation,
  printError,
  printResult,
  startRenderSpinner,
  stopRenderSpinner,
} from "../io.ts";
import { mapInputs, type RenderParserValue } from "../map-inputs.ts";

export type RenderCommandOptions = {
  parsed: RenderParserValue;
  env: NodeJS.ProcessEnv;
  cwd: string;
  io: IoStreams;
  stdinIsTTY: boolean;
  stderrStream?: Writable;
  stderrIsTTY?: boolean;
  installSignals?: boolean;
  runMain?: (options: {
    inputs: Record<string, unknown>;
    env: NodeJS.ProcessEnv;
    cwd: string;
  }) => Promise<ActionRunResult>;
};

export async function handleRender(
  options: RenderCommandOptions,
): Promise<number> {
  const presentation = resolvePresentation(options.parsed, options.stdinIsTTY);
  const inputs = mapInputs(options.parsed);
  const secrets = collectSecrets(inputs, options.env);
  const controller = new AbortController();
  const spinner = startRenderSpinner(presentation, {
    ...(options.stderrStream === undefined
      ? {}
      : { output: options.stderrStream }),
    signal: controller.signal,
    stderrIsTTY: options.stderrIsTTY ?? process.stderr.isTTY === true,
  });
  const uninstallSignals =
    options.installSignals === true
      ? installSignalAbort(controller, () => {
          stopRenderSpinner(spinner, "cancel");
        })
      : () => {};
  const engine = options.runMain ?? runMain;

  try {
    if (presentation.verbose && !presentation.quiet) {
      options.io.stderr("Rendering widgets");
    }
    const result = await engine({
      inputs,
      env: options.env,
      cwd: options.cwd,
    });
    stopRenderSpinner(spinner, "ok");
    printResult(options.io, result, presentation, secrets);
    return EXIT_SUCCESS;
  } catch (error) {
    stopRenderSpinner(spinner, "error");
    printError(options.io, error, secrets);
    return EXIT_OPERATIONAL;
  } finally {
    uninstallSignals();
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }
}

export function resolvePresentation(
  parsed: RenderParserValue,
  stdinIsTTY: boolean,
): Presentation {
  return {
    json: parsed.json,
    quiet: parsed.quiet,
    verbose: parsed.verbose,
    noInput: parsed.noInput || !stdinIsTTY,
    noColor: parsed.noColor,
  };
}

function installSignalAbort(
  controller: AbortController,
  onCancel: () => void,
): () => void {
  const onSigint = (): void => {
    onCancel();
    controller.abort();
    process.exit(130);
  };
  const onSigterm = (): void => {
    onCancel();
    controller.abort();
    process.exit(1);
  };
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);
  return () => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  };
}
