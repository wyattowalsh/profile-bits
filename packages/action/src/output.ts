import type {
  OutputAction,
  OutputCondition,
  OutputFormat,
  TokenClass,
} from "@profile-bits/core";

/** Marketplace Action outputs set by the engine. */
export type ActionRunOutputs = {
  files: string[];
  did_commit: boolean;
  skipped: string[];
};

export type WidgetBlob = {
  /** Path relative to `output_dir` (never `README.md`). */
  path: string;
  contents: string | Uint8Array;
};

export const INSTALLATION_COMMIT_MESSAGE =
  "chore: update profile-bits widgets [skip ci]" as const;
export const USER_PAT_COMMIT_MESSAGE =
  "chore: update profile-bits widgets" as const;

/**
 * Installation-token commits include `[skip ci]`. A `user_pat` committer
 * that should retrigger downstream workflows omits it.
 */
export function widgetCommitMessage(tokenClass: TokenClass): string {
  return tokenClass === "user_pat"
    ? USER_PAT_COMMIT_MESSAGE
    : INSTALLATION_COMMIT_MESSAGE;
}

export function shouldIncludeSkipCi(tokenClass: TokenClass): boolean {
  return tokenClass !== "user_pat";
}

export type CommitWidgetsInput = {
  mode: "commit" | "pull-request";
  files: readonly WidgetBlob[];
  outputDir: string;
  branch?: string;
  dryRun: boolean;
  tokenClass: TokenClass;
  /** Precomputed via {@link widgetCommitMessage}. */
  message: string;
  dataChanged: boolean;
  outputCondition?: OutputCondition;
};

export type CommitWidgetsResult = {
  /** True only when a git commit was created. */
  didCommit: boolean;
};

export type GistWidgetsInput = {
  files: readonly WidgetBlob[];
  gistId?: string;
  format: OutputFormat;
  canGist: boolean;
  dryRun: boolean;
};

export type GistWidgetsResult = {
  gistId?: string;
  files: readonly string[];
};

/**
 * Commit / gist ports. T300 (`git.ts`) and T301 (`gist.ts`) implement these.
 * Engine owns the interface; implementations must not edit `engine.ts`.
 *
 * - `commitWidgets`: write under `output_dir` only; skip identical blobs;
 *   use `message` (`[skip ci]` unless `user_pat`).
 * - `gistWidgets`: SVG only and require `canGist` (engine fails the run first).
 */
export type OutputPorts = {
  commitWidgets(input: CommitWidgetsInput): Promise<CommitWidgetsResult>;
  gistWidgets(input: GistWidgetsInput): Promise<GistWidgetsResult>;
};

export type PublishMode = Extract<OutputAction, "commit" | "pull-request">;

/** No-op ports for `output_action: none`, tests, and until T300/T301 land. */
export function createNoopOutputPorts(): OutputPorts {
  return {
    async commitWidgets() {
      return { didCommit: false };
    },
    async gistWidgets(input) {
      return { files: input.files.map((file) => file.path) };
    },
  };
}
