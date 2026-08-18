import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  CommitWidgetsInput,
  CommitWidgetsResult,
  GistWidgetsResult,
  OutputPorts,
  WidgetBlob,
} from "./output.ts";

const BOT_NAME = "github-actions[bot]";
const BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com";
const DEFAULT_PR_HEAD = "profile-bits/widgets";
const DEFAULT_PR_BASE = "main";
const DEFAULT_API_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GIST_STUB_MESSAGE = "use T301 gist.ts";

export const PULL_REQUEST_PERMISSION_ERROR =
  "output_action: pull-request requires workflow permissions: pull-requests: write (and contents: write)";

export class GitOutputError extends Error {
  override readonly name = "GitOutputError";
}

/**
 * Thrown when `output_action: pull-request` is used without
 * `permissions: pull-requests: write` (GitHub typically returns HTTP 403
 * "Resource not accessible by integration").
 */
export class PullRequestPermissionError extends GitOutputError {
  override readonly name = "PullRequestPermissionError";

  constructor(message = PULL_REQUEST_PERMISSION_ERROR) {
    super(message);
  }
}

export type GitRunResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type GitHost = {
  run(argv: readonly string[], opts?: { cwd?: string }): Promise<GitRunResult>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, contents: Uint8Array): Promise<void>;
  mkdir(path: string): Promise<void>;
  fetch(input: string | URL, init?: RequestInit): Promise<Response>;
  env: NodeJS.ProcessEnv;
  cwd: string;
};

type LocatedBlob = {
  relative: string;
  absolute: string;
  bytes: Uint8Array;
};

/**
 * Git commit/PR implementation of {@link OutputPorts.commitWidgets}.
 *
 * Gist publishing is T301 (`gist.ts`); this factory stubs `gistWidgets`.
 * Inject a {@link GitHost} so tests never touch a real git repo or network.
 */
export function createGitOutputPorts(
  options: Partial<GitHost> = {},
): OutputPorts {
  const host = resolveHost(options);
  return {
    gistWidgets: async (): Promise<GistWidgetsResult> => {
      throw new GitOutputError(GIST_STUB_MESSAGE);
    },
    commitWidgets: (input) => commitWidgets(input, host),
  };
}

async function commitWidgets(
  input: CommitWidgetsInput,
  host: GitHost,
): Promise<CommitWidgetsResult> {
  if (input.dryRun) {
    return { didCommit: false };
  }
  if (input.outputCondition === "data-changed" && !input.dataChanged) {
    return { didCommit: false };
  }
  if (input.files.length === 0) {
    return { didCommit: false };
  }

  const located = input.files.map((file) =>
    locateBlob(host.cwd, input.outputDir, file),
  );
  const changed = await skipIdenticalBlobs(host, located);
  if (changed.length === 0) {
    return { didCommit: false };
  }

  for (const file of changed) {
    await host.mkdir(dirname(file.absolute));
    await host.writeFile(file.absolute, file.bytes);
  }

  const gitOpts = { cwd: host.cwd };
  const headBranch = resolveHeadBranch(input);
  if (headBranch !== undefined) {
    const checkout = await host.run(["checkout", "-B", headBranch], gitOpts);
    if (checkout.code !== 0) {
      throw gitFailure("git checkout", checkout);
    }
  }

  const add = await host.run(
    ["add", "--", ...changed.map((file) => file.relative)],
    gitOpts,
  );
  if (add.code !== 0) {
    throw gitFailure("git add", add);
  }

  const committed = await host.run(
    [
      "-c",
      `user.name=${BOT_NAME}`,
      "-c",
      `user.email=${BOT_EMAIL}`,
      "commit",
      "-m",
      input.message,
    ],
    gitOpts,
  );
  if (isNothingToCommit(committed)) {
    return { didCommit: false };
  }
  if (committed.code !== 0) {
    throw gitFailure("git commit", committed);
  }

  const push = await host.run(["push", "origin", "HEAD"], gitOpts);
  if (push.code !== 0) {
    throw gitFailure("git push", push);
  }

  if (input.mode === "pull-request") {
    await openPullRequest(input, host, headBranch);
  }

  return { didCommit: true };
}

async function openPullRequest(
  input: CommitWidgetsInput,
  host: GitHost,
  headBranch: string | undefined,
): Promise<void> {
  const token = firstNonEmpty(
    host.env.INPUT_COMMITTER_TOKEN,
    host.env.GITHUB_TOKEN,
  );
  if (token === undefined) {
    throw new PullRequestPermissionError(
      `${PULL_REQUEST_PERMISSION_ERROR}: missing GitHub token`,
    );
  }
  const repository = host.env.GITHUB_REPOSITORY?.trim();
  if (repository === undefined || !repository.includes("/")) {
    throw new GitOutputError(
      "output_action: pull-request requires GITHUB_REPOSITORY",
    );
  }
  const [owner, repo] = repository.split("/");
  if (owner === undefined || repo === undefined || repo === "") {
    throw new GitOutputError(
      "output_action: pull-request requires GITHUB_REPOSITORY as owner/repo",
    );
  }

  const api = (host.env.GITHUB_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
  const url = `${api}/repos/${owner}/${repo}/pulls`;
  const head = headBranch ?? resolvePrHead(input);
  const base = host.env.GITHUB_REF_NAME?.trim() || DEFAULT_PR_BASE;

  const response = await host.fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "User-Agent": "profile-bits",
    },
    body: JSON.stringify({
      title: input.message,
      head,
      base,
      body: input.message,
    }),
  });
  const body = await response.text();
  interpretPullRequestResponse(response.status, body);
}

export function interpretPullRequestResponse(
  status: number,
  body: string,
): void {
  if (status === 403) {
    throw new PullRequestPermissionError();
  }
  if (status === 422 && /already exists/i.test(body)) {
    return;
  }
  if (status < 200 || status >= 300) {
    throw new GitOutputError(
      `failed to open pull request (HTTP ${status}): ${body}`,
    );
  }
}

function locateBlob(
  cwd: string,
  outputDir: string,
  file: WidgetBlob,
): LocatedBlob {
  const relative = locateUnderOutputDir(outputDir, file.path);
  return {
    relative,
    absolute: join(cwd, relative),
    bytes: blobBytes(file.contents),
  };
}

function locateUnderOutputDir(outputDir: string, relativePath: string): string {
  const trimmed = relativePath.replaceAll("\\", "/").replace(/^\.?\//, "");
  if (isReadmePath(trimmed)) {
    throw new GitOutputError("Action must not patch README.md");
  }
  const segments = trimmed
    .split("/")
    .filter((part) => part !== "" && part !== ".");
  if (segments.includes("..") || outputDirHasEscape(outputDir)) {
    throw new GitOutputError("widget file path escapes output_dir");
  }
  if (segments.includes("README.md")) {
    throw new GitOutputError("Action must not patch README.md");
  }
  const root = outputDir.replaceAll("\\", "/").replace(/\/$/, "");
  if (root === "" || root === ".") {
    return segments.join("/");
  }
  const relative = segments.join("/");
  if (relative === root || relative.startsWith(`${root}/`)) {
    return relative;
  }
  return `${root}/${relative}`;
}

function outputDirHasEscape(outputDir: string): boolean {
  return outputDir.replaceAll("\\", "/").split("/").includes("..");
}

function isReadmePath(path: string): boolean {
  return path === "README.md" || path.endsWith("/README.md");
}

async function skipIdenticalBlobs(
  host: GitHost,
  files: readonly LocatedBlob[],
): Promise<LocatedBlob[]> {
  const changed: LocatedBlob[] = [];
  for (const file of files) {
    if (await isIdenticalBlob(host, file)) {
      continue;
    }
    changed.push(file);
  }
  return changed;
}

async function isIdenticalBlob(
  host: GitHost,
  file: LocatedBlob,
): Promise<boolean> {
  try {
    const existing = await host.readFile(file.absolute);
    return sameBytes(existing, file.bytes);
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

function blobBytes(contents: string | Uint8Array): Uint8Array {
  return typeof contents === "string"
    ? new TextEncoder().encode(contents)
    : contents;
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  return left.every((byte, index) => byte === right[index]);
}

function resolveHeadBranch(input: CommitWidgetsInput): string | undefined {
  if (input.mode === "pull-request") {
    return resolvePrHead(input);
  }
  const branch = input.branch?.trim();
  return branch === undefined || branch === ""
    ? undefined
    : assertSafeRef(branch);
}

function resolvePrHead(input: CommitWidgetsInput): string {
  return assertSafeRef(input.branch?.trim() || DEFAULT_PR_HEAD);
}

function assertSafeRef(ref: string): string {
  if (
    ref.startsWith("-") ||
    ref.includes("..") ||
    !/^[A-Za-z0-9._/-]+$/.test(ref)
  ) {
    throw new GitOutputError(`unsafe git ref: ${ref}`);
  }
  return ref;
}

function isNothingToCommit(result: GitRunResult): boolean {
  return /nothing to commit/i.test(`${result.stdout}\n${result.stderr}`);
}

function gitFailure(step: string, result: GitRunResult): GitOutputError {
  const detail =
    result.stderr.trim() || result.stdout.trim() || `exit ${result.code}`;
  return new GitOutputError(`${step} failed: ${detail}`);
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "ENOENT"
  );
}

function firstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  for (const value of values) {
    if (value !== undefined && value.trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function resolveHost(options: Partial<GitHost>): GitHost {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? env.GITHUB_WORKSPACE ?? process.cwd();
  return {
    cwd,
    env,
    run: options.run ?? defaultGitRun,
    readFile: options.readFile ?? ((path) => readFile(path)),
    writeFile:
      options.writeFile ?? ((path, contents) => writeFile(path, contents)),
    mkdir:
      options.mkdir ??
      ((path) => mkdir(path, { recursive: true }).then(() => undefined)),
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
  };
}

function defaultGitRun(
  argv: readonly string[],
  opts: { cwd?: string } = {},
): Promise<GitRunResult> {
  return new Promise((resolve) => {
    const child = spawn("git", [...argv], {
      cwd: opts.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const done = (result: GitRunResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      done({ code: 1, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      done({ code: code ?? 1, stdout, stderr });
    });
  });
}
