/** Type-only stub so `tsc --noEmit` does not follow the Action graph. Runtime uses workspace `@profile-bits/action` via `tsconfig.runtime.json`. */
export type EngineResult = {
  files: string[];
  did_commit: boolean;
  skipped: string[];
};

export type ActionRunResult = EngineResult;

export type RunMainOptions = {
  inputs?: Record<string, unknown>;
  env?: Record<string, string | undefined>;
  cwd?: string;
};

export function runMain(options?: RunMainOptions): Promise<ActionRunResult>;
export const main: typeof runMain;
