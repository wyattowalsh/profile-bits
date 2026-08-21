/**
 * Guard a packed GitHub Action tree before it is published.
 *
 * Allowed `node_modules` are only `<dir>/node_modules/@takumi-rs/**`.
 * `apps/docs`, lockfiles, other `node_modules`, and unpacked size over 12MB
 * fail the check.
 *
 * Run from the repo root:
 *
 * ```
 * node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/check-action-size.mts [--dir <path>]
 * ```
 */
import { type Dirent, existsSync } from "node:fs";
import { lstat, readdir, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_UNPACKED_BYTES = 12 * 1024 * 1024;
export const DEFAULT_DIR = "dist";
export const TAKUMI_SCOPE = "@takumi-rs";
export const LOCKFILE_NAME = "pnpm-lock.yaml";

const USAGE = `Usage: check-action-size [--dir <path>]

Check a packed Action tree (default: dist, repo-root relative).

  allow only <dir>/node_modules/@takumi-rs/**
  fail other node_modules, apps/docs, ${LOCKFILE_NAME}, unpacked size > 12MB

  --dir <path>  tree to check (default: ${DEFAULT_DIR})
  -h, --help    show this help

Run from the repo root:
  node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/check-action-size.mts
`;

export type ActionSizeReport = {
  ok: boolean;
  bytes: number;
  errors: string[];
};

type ParsedArgs =
  | { ok: true; help: true }
  | { ok: true; help: false; dir: string | undefined }
  | { ok: false; error: string };

export async function main(
  argv: readonly string[] = process.argv.slice(2),
  cwd: string = process.cwd(),
): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.error}\n`);
    return 1;
  }
  if (parsed.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  const dir = resolve(cwd, parsed.dir ?? DEFAULT_DIR);

  let report: ActionSizeReport;
  try {
    report = await checkActionSize(dir);
  } catch (error) {
    process.stderr.write(`${formatError(error)}\n`);
    return 1;
  }

  if (!report.ok) {
    for (const error of report.errors) {
      process.stderr.write(`${error}\n`);
    }
    return 1;
  }

  process.stdout.write(
    `ok: ${report.bytes} bytes (limit ${MAX_UNPACKED_BYTES})\n`,
  );
  return 0;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { ok: true, help: true };
  }

  let dir: string | undefined;
  const unknown: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined || arg === "--") {
      continue;
    }
    if (arg === "--dir") {
      const value = argv[i + 1];
      if (value === undefined || value.length === 0 || value.startsWith("-")) {
        return { ok: false, error: "--dir requires a path" };
      }
      dir = value;
      i++;
      continue;
    }
    if (arg.startsWith("--dir=")) {
      const value = arg.slice("--dir=".length);
      if (value.length === 0) {
        return { ok: false, error: "--dir requires a path" };
      }
      dir = value;
      continue;
    }
    unknown.push(arg);
  }

  if (unknown.length > 0) {
    return { ok: false, error: `Unknown arguments: ${unknown.join(" ")}` };
  }

  return { ok: true, help: false, dir };
}

export async function checkActionSize(dir: string): Promise<ActionSizeReport> {
  const root = resolve(dir);
  if (!existsSync(root)) {
    return {
      ok: false,
      bytes: 0,
      errors: [`directory not found: ${root}`],
    };
  }

  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) {
    return {
      ok: false,
      bytes: 0,
      errors: [`not a directory: ${root}`],
    };
  }

  const errors = new Set<string>();
  const nodeModules = new Set<string>();
  const appsDocs = new Set<string>();
  const lockfiles = new Set<string>();
  let bytes = 0;

  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    const full = join(direntDirectory(entry, root), entry.name);
    const rel = relative(root, full);
    if (rel === "" || rel.startsWith(`..${sep}`) || rel === "..") {
      continue;
    }

    const nodeModulesRel = disallowedNodeModules(rel);
    if (nodeModulesRel !== undefined) {
      nodeModules.add(nodeModulesRel);
    }

    const appsDocsRel = appsDocsInside(rel);
    if (appsDocsRel !== undefined) {
      appsDocs.add(appsDocsRel);
    }

    if (entry.name === LOCKFILE_NAME) {
      lockfiles.add(rel);
    }

    if (entry.isFile() || entry.isSymbolicLink()) {
      const info = await lstat(full);
      if (info.isFile()) {
        bytes += info.size;
      }
    }
  }

  for (const rel of [...nodeModules].sort()) {
    errors.add(`disallowed node_modules: ${rel}`);
  }
  for (const rel of [...appsDocs].sort()) {
    errors.add(`apps/docs must not be packed: ${rel}`);
  }
  for (const rel of [...lockfiles].sort()) {
    errors.add(`lockfile must not be packed: ${rel}`);
  }
  if (bytes > MAX_UNPACKED_BYTES) {
    errors.add(`unpacked size ${bytes} exceeds 12MB (${MAX_UNPACKED_BYTES})`);
  }

  return {
    ok: errors.size === 0,
    bytes,
    errors: [...errors],
  };
}

function disallowedNodeModules(rel: string): string | undefined {
  const parts = splitRel(rel);
  const index = parts.indexOf("node_modules");
  if (index === -1) {
    return undefined;
  }

  if (isAllowedTakumiPath(parts)) {
    return undefined;
  }

  const end = Math.min(index + 2, parts.length);
  return parts.slice(0, end).join(sep);
}

function isAllowedTakumiPath(parts: readonly string[]): boolean {
  if (parts[0] !== "node_modules") {
    return false;
  }
  if (parts.length === 1) {
    return true;
  }
  if (parts[1] !== TAKUMI_SCOPE) {
    return false;
  }
  return !parts.slice(2).includes("node_modules");
}

function appsDocsInside(rel: string): string | undefined {
  const parts = splitRel(rel);
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === "apps" && parts[i + 1] === "docs") {
      return parts.slice(0, i + 2).join(sep);
    }
  }
  return undefined;
}

function splitRel(rel: string): string[] {
  return rel.split(sep).filter((part) => part.length > 0);
}

function direntDirectory(entry: Dirent, root: string): string {
  if (typeof entry.parentPath === "string" && entry.parentPath.length > 0) {
    return entry.parentPath;
  }
  const legacy = (entry as Dirent & { path?: string }).path;
  if (typeof legacy === "string" && legacy.length > 0) {
    return legacy;
  }
  return root;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isMain()) {
  main().then(
    (code) => {
      process.exit(code);
    },
    (err: unknown) => {
      console.error(err);
      process.exit(1);
    },
  );
}
