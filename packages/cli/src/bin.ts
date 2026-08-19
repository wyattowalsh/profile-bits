#!/usr/bin/env node
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  CliExitError,
  EXIT_OPERATIONAL,
  isCliExitError,
  throwCliExit,
} from "./errors.ts";
import { defaultStderr, defaultStdout, installStdoutEpipeGuard } from "./io.ts";
import { type ParseCliOptions, parseCli } from "./program.ts";

export type RunCliOptions = ParseCliOptions & {
  cwd?: string;
  stdinIsTTY?: boolean;
  stderrIsTTY?: boolean;
  installSignals?: boolean;
  runMain?: (options: {
    inputs: Record<string, unknown>;
    env: NodeJS.ProcessEnv;
    cwd: string;
  }) => Promise<{
    files: string[];
    skipped: string[];
    did_commit: boolean;
  }>;
};

export async function runCli(options: RunCliOptions = {}): Promise<number> {
  const uninstallEpipe = installStdoutEpipeGuard();
  const env = options.env ?? process.env;
  const stdout = options.stdout ?? defaultStdout;
  const stderr = options.stderr ?? defaultStderr;
  try {
    const parsed = await parseCli({
      env,
      args: options.args,
      stdout,
      stderr,
      colors: options.colors,
      programName: options.programName,
      onExit: options.onExit ?? throwCliExit,
    });
    const { handleRender } = await import("./commands/render.ts");
    return await handleRender({
      parsed,
      env,
      cwd: options.cwd ?? process.cwd(),
      io: { stdout, stderr },
      stdinIsTTY: options.stdinIsTTY ?? process.stdin.isTTY === true,
      stderrIsTTY: options.stderrIsTTY ?? process.stderr.isTTY === true,
      installSignals: options.installSignals ?? true,
      ...(options.runMain === undefined ? {} : { runMain: options.runMain }),
    });
  } catch (error) {
    if (isCliExitError(error)) {
      return error.exitCode;
    }
    stderr(error instanceof Error ? error.message : String(error));
    return EXIT_OPERATIONAL;
  } finally {
    uninstallEpipe();
  }
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isMain()) {
  void runCli().then(
    (code) => {
      if (code !== 0) {
        process.exit(code);
      }
    },
    (error: unknown) => {
      if (error instanceof CliExitError) {
        process.exit(error.exitCode);
      }
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exit(EXIT_OPERATIONAL);
    },
  );
}
