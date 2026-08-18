/**
 * Bundle the GitHub Action for the slim `release/v1` tree.
 *
 * ncc (`@vercel/ncc@0.45.0`, catalog-pinned on `@profile-bits/action`) compiles
 * `packages/action/src/main.ts` to `dist/index.js` (`action.yml` `main`).
 *
 * `--external @takumi-rs/core` and `--external @takumi-rs/wasm` leave those
 * loaders as runtime requires so ncc never inlines a `.node` addon. After the
 * compile, this script copies:
 *
 * - linux-x64-gnu `core.linux-x64-gnu.node` to the paths `@takumi-rs/core`'s
 *   loader tries (`../core.linux-x64-gnu.node` from `dist/export.cjs`, and
 *   `@takumi-rs/core-linux-x64-gnu/core.linux-x64-gnu.node`)
 * - `takumi_wasm_bg.wasm` to `@takumi-rs/wasm/pkg/` (bundler `node.cjs` reads
 *   `../pkg/takumi_wasm_bg.wasm`)
 *
 * WASM is a **shipped** fallback (other-OS / musl / ARM), not docs-only.
 * Install `@takumi-rs/core-linux-x64-gnu` on Linux CI; do not copy a macOS
 * `.node`. `dist/` is gitignored on `main` and committed only on orphan
 * `release/v1`. Never tag `v1` at `main`.
 *
 * Run from the repo root:
 *
 * ```
 * node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/package-action.mts
 * ```
 *
 * `--dry-run` prints the ncc command and copy plan without writing `dist/`.
 */
import { spawn } from "node:child_process";
import { type Dirent, existsSync, readFileSync } from "node:fs";
import {
  copyFile,
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const NCC_PIN = "0.45.0";
export const ACTION_ENTRY = join("packages", "action", "src", "main.ts");
export const DIST_DIRNAME = "dist";
export const GNU_PACKAGE = "@takumi-rs/core-linux-x64-gnu";
export const GNU_NODE_FILENAME = "core.linux-x64-gnu.node";
export const WASM_PACKAGE = "@takumi-rs/wasm";
export const WASM_FILENAME = "takumi_wasm_bg.wasm";
export const CORE_PACKAGE = "@takumi-rs/core";
export const HELPERS_PACKAGE = "@takumi-rs/helpers";
export const NCC_EXTERNALS = [CORE_PACKAGE, WASM_PACKAGE] as const;

const USAGE = `Usage: package-action [--dry-run]

Bundle packages/action/src/main.ts with ncc (@vercel/ncc@${NCC_PIN} from
@profile-bits/action) to dist/index.js.

  ncc build ${ACTION_ENTRY} -o ${DIST_DIRNAME} \\
    --external ${CORE_PACKAGE} --external ${WASM_PACKAGE}

Then copy ${GNU_NODE_FILENAME} and ${WASM_FILENAME} into dist/ at the
paths the Takumi loaders require. WASM is a shipped fallback. Never inline
.node. dist/ is gitignored on main.

  --dry-run   print the ncc command and copy plan; do not write dist/
  -h, --help  show this help

Run from the repo root:
  node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/package-action.mts
`;

type PackageName =
  | typeof CORE_PACKAGE
  | typeof WASM_PACKAGE
  | typeof HELPERS_PACKAGE
  | typeof GNU_PACKAGE;

export type CopyPlan = {
  from: string;
  to: string;
};

export type PackagePlan = {
  ncc: string;
  nccVersion: string;
  entry: string;
  distDir: string;
  nccArgs: readonly string[];
  packages: Readonly<Record<Exclude<PackageName, typeof GNU_PACKAGE>, string>>;
  gnuRoot: string | undefined;
  gnuNode: string | undefined;
  wasmFile: string;
  copies: readonly CopyPlan[];
};

export async function main(
  argv: readonly string[] = process.argv.slice(2),
  cwd: string = process.cwd(),
): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    return 0;
  }

  const dryRun = argv.includes("--dry-run");
  const unknown = argv.filter(
    (arg) =>
      arg !== "--" && arg !== "--dry-run" && arg !== "--help" && arg !== "-h",
  );
  if (unknown.length > 0) {
    process.stderr.write(`Unknown arguments: ${unknown.join(" ")}\n`);
    return 1;
  }

  let plan: PackagePlan;
  try {
    plan = resolvePlan(cwd);
  } catch (error) {
    process.stderr.write(`${formatError(error)}\n`);
    return 1;
  }

  printPlan(plan);

  if (dryRun) {
    if (plan.gnuRoot === undefined || plan.gnuNode === undefined) {
      process.stderr.write(
        `note: ${GNU_PACKAGE} is not installed; a real pack requires it on Linux CI (do not copy a macOS .node)\n`,
      );
    }
    return 0;
  }

  if (plan.gnuRoot === undefined || plan.gnuNode === undefined) {
    process.stderr.write(
      `${GNU_PACKAGE} is required to pack. Install the optional dependency on Linux CI; do not copy a macOS .node.\n`,
    );
    return 1;
  }

  try {
    await runNcc(plan);
    await copyLoaderGraph(plan);
    await assertPackedDist(plan);
  } catch (error) {
    process.stderr.write(`${formatError(error)}\n`);
    return 1;
  }

  process.stdout.write(
    `packed ${relative(planRoot(plan), join(plan.distDir, "index.js"))} with gnu .node + wasm fallback\n`,
  );
  return 0;
}

export function resolvePlan(cwd: string): PackagePlan {
  const root = findRepoRoot(cwd);
  const actionReq = createRequire(
    join(root, "packages", "action", "package.json"),
  );
  const rendererReq = createRequire(
    join(root, "packages", "renderer", "package.json"),
  );

  const nccVersion = readNccVersion(actionReq);
  if (nccVersion !== NCC_PIN) {
    throw new Error(
      `expected @vercel/ncc@${NCC_PIN} (catalog pin on @profile-bits/action), got ${nccVersion}`,
    );
  }

  const ncc = actionReq.resolve("@vercel/ncc/dist/ncc/cli.js");
  const entry = join(root, ACTION_ENTRY);
  const distDir = join(root, DIST_DIRNAME);

  if (!existsSync(entry)) {
    throw new Error(`action entry not found: ${entry}`);
  }

  const packages = {
    [CORE_PACKAGE]: packageRootFromEntry(
      rendererReq.resolve(CORE_PACKAGE),
      CORE_PACKAGE,
    ),
    [WASM_PACKAGE]: packageRootFromEntry(
      rendererReq.resolve(WASM_PACKAGE),
      WASM_PACKAGE,
    ),
    [HELPERS_PACKAGE]: packageRootFromEntry(
      rendererReq.resolve(HELPERS_PACKAGE),
      HELPERS_PACKAGE,
    ),
  } as const;

  const wasmFile = join(packages[WASM_PACKAGE], "pkg", WASM_FILENAME);
  if (!existsSync(wasmFile)) {
    throw new Error(`WASM fallback missing: ${wasmFile}`);
  }

  const gnuRoot = resolveOptionalPackage(actionReq, GNU_PACKAGE, root);
  const gnuNode =
    gnuRoot === undefined ? undefined : join(gnuRoot, GNU_NODE_FILENAME);
  if (gnuNode !== undefined && !existsSync(gnuNode)) {
    throw new Error(`gnu native addon missing: ${gnuNode}`);
  }

  const copies = buildCopyPlan(distDir, packages, gnuRoot, gnuNode, wasmFile);

  return {
    ncc,
    nccVersion,
    entry,
    distDir,
    nccArgs: [
      "build",
      entry,
      "-o",
      distDir,
      "--external",
      CORE_PACKAGE,
      "--external",
      WASM_PACKAGE,
      "--transpile-only",
      "--no-cache",
    ],
    packages,
    gnuRoot,
    gnuNode,
    wasmFile,
    copies,
  };
}

function buildCopyPlan(
  distDir: string,
  packages: PackagePlan["packages"],
  gnuRoot: string | undefined,
  gnuNode: string | undefined,
  wasmFile: string,
): CopyPlan[] {
  const copies: CopyPlan[] = [
    {
      from: packages[CORE_PACKAGE],
      to: join(distDir, "node_modules", ...CORE_PACKAGE.split("/")),
    },
    {
      from: packages[WASM_PACKAGE],
      to: join(distDir, "node_modules", ...WASM_PACKAGE.split("/")),
    },
    {
      from: packages[HELPERS_PACKAGE],
      to: join(distDir, "node_modules", ...HELPERS_PACKAGE.split("/")),
    },
    {
      from: wasmFile,
      to: join(
        distDir,
        "node_modules",
        ...WASM_PACKAGE.split("/"),
        "pkg",
        WASM_FILENAME,
      ),
    },
  ];

  if (gnuRoot !== undefined && gnuNode !== undefined) {
    const gnuDest = join(distDir, "node_modules", ...GNU_PACKAGE.split("/"));
    copies.push(
      { from: gnuRoot, to: gnuDest },
      { from: gnuNode, to: join(gnuDest, GNU_NODE_FILENAME) },
      {
        from: gnuNode,
        to: join(
          distDir,
          "node_modules",
          ...CORE_PACKAGE.split("/"),
          GNU_NODE_FILENAME,
        ),
      },
    );
  }

  return copies;
}

function printPlan(plan: PackagePlan): void {
  const root = planRoot(plan);
  process.stdout.write(`ncc ${plan.nccVersion} ${rel(root, plan.ncc)}\n`);
  process.stdout.write(
    `  ${process.execPath} ${rel(root, plan.ncc)} ${plan.nccArgs
      .map((arg) => (arg.startsWith(root) ? rel(root, arg) : arg))
      .join(" ")}\n`,
  );
  process.stdout.write("copy (loader require graph):\n");
  for (const copy of plan.copies) {
    process.stdout.write(
      `  ${rel(root, copy.from)} -> ${rel(root, copy.to)}\n`,
    );
  }
}

async function runNcc(plan: PackagePlan): Promise<void> {
  await mkdir(plan.distDir, { recursive: true });
  const code = await new Promise<number | null>((resolveExit, reject) => {
    const child = spawn(process.execPath, [plan.ncc, ...plan.nccArgs], {
      cwd: planRoot(plan),
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", resolveExit);
  });
  if (code !== 0) {
    throw new Error(`ncc exited ${code ?? "null"}`);
  }
}

async function copyLoaderGraph(plan: PackagePlan): Promise<void> {
  await stripUnexpectedNodeAddons(plan.distDir, new Set());

  for (const name of [CORE_PACKAGE, WASM_PACKAGE, HELPERS_PACKAGE] as const) {
    await copyPackageTree(plan.packages[name], packageDest(plan.distDir, name));
  }

  if (plan.gnuRoot === undefined || plan.gnuNode === undefined) {
    throw new Error(`${GNU_PACKAGE} disappeared before copy`);
  }

  const gnuDest = packageDest(plan.distDir, GNU_PACKAGE);
  await copyPackageTree(plan.gnuRoot, gnuDest);
  await mkdir(
    dirname(join(packageDest(plan.distDir, CORE_PACKAGE), GNU_NODE_FILENAME)),
    {
      recursive: true,
    },
  );
  await copyFile(
    plan.gnuNode,
    join(packageDest(plan.distDir, CORE_PACKAGE), GNU_NODE_FILENAME),
  );
  await copyFile(plan.gnuNode, join(gnuDest, GNU_NODE_FILENAME));

  const wasmDest = join(
    packageDest(plan.distDir, WASM_PACKAGE),
    "pkg",
    WASM_FILENAME,
  );
  await mkdir(dirname(wasmDest), { recursive: true });
  await copyFile(plan.wasmFile, wasmDest);

  await stripUnexpectedNodeAddons(
    plan.distDir,
    allowedNodeAddons(plan.distDir),
  );
}

async function copyPackageTree(from: string, to: string): Promise<void> {
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, {
    recursive: true,
    filter: (source) => shouldCopyArtifact(source, from),
  });
}

function shouldCopyArtifact(source: string, packageRoot: string): boolean {
  const relPath = relative(packageRoot, source);
  if (relPath === "") {
    return true;
  }
  const parts = relPath.split(sep);
  if (parts.includes("node_modules")) {
    return false;
  }
  const file = basename(source);
  if (file.endsWith(".node") && file !== GNU_NODE_FILENAME) {
    return false;
  }
  return true;
}

async function stripUnexpectedNodeAddons(
  distDir: string,
  allowed: ReadonlySet<string>,
): Promise<void> {
  for (const file of await listNodeAddons(distDir)) {
    if (!allowed.has(file)) {
      await rm(file, { force: true });
    }
  }
}

function allowedNodeAddons(distDir: string): Set<string> {
  return new Set([
    join(packageDest(distDir, GNU_PACKAGE), GNU_NODE_FILENAME),
    join(packageDest(distDir, CORE_PACKAGE), GNU_NODE_FILENAME),
  ]);
}

async function listNodeAddons(dir: string): Promise<string[]> {
  if (!existsSync(dir)) {
    return [];
  }
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".node")) {
      continue;
    }
    files.push(join(direntDirectory(entry, dir), entry.name));
  }
  return files;
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

async function assertPackedDist(plan: PackagePlan): Promise<void> {
  const bundle = join(plan.distDir, "index.js");
  await stat(bundle);
  const bytes = await readFile(bundle);
  if (bytes.includes(0)) {
    throw new Error(
      "dist/index.js contains binary data; native .node must not be inlined",
    );
  }

  const wasmDest = join(
    packageDest(plan.distDir, WASM_PACKAGE),
    "pkg",
    WASM_FILENAME,
  );
  await stat(wasmDest);

  for (const addon of allowedNodeAddons(plan.distDir)) {
    await stat(addon);
  }

  const leftover = await listNodeAddons(plan.distDir);
  const allowed = allowedNodeAddons(plan.distDir);
  const extra = leftover.filter((file) => !allowed.has(file));
  if (extra.length > 0) {
    throw new Error(
      `unexpected .node in dist/ (never inline host addons): ${extra.join(", ")}`,
    );
  }
}

function packageDest(distDir: string, name: PackageName): string {
  return join(distDir, "node_modules", ...name.split("/"));
}

function findRepoRoot(cwd: string): string {
  const starts = [cwd, resolve(dirname(fileURLToPath(import.meta.url)), "..")];
  for (const start of starts) {
    let dir = resolve(start);
    for (;;) {
      if (
        existsSync(join(dir, "action.yml")) &&
        existsSync(join(dir, "packages", "action", "package.json"))
      ) {
        return dir;
      }
      const parent = dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  }
  throw new Error("run package-action from the profile-bits repo root");
}

function readNccVersion(actionReq: NodeRequire): string {
  const pkg = actionReq("@vercel/ncc/package.json") as { version?: unknown };
  if (typeof pkg.version !== "string") {
    throw new Error("could not read @vercel/ncc version");
  }
  return pkg.version;
}

function resolveOptionalPackage(
  req: NodeRequire,
  name: string,
  root: string,
): string | undefined {
  try {
    return packageRootFromEntry(req.resolve(name), name);
  } catch {
    const candidates = [
      join(root, "node_modules", ...name.split("/")),
      join(root, "packages", "action", "node_modules", ...name.split("/")),
    ];
    for (const candidate of candidates) {
      if (existsSync(join(candidate, "package.json"))) {
        return candidate;
      }
    }
    return undefined;
  }
}

function packageRootFromEntry(entry: string, expectedName: string): string {
  let dir = dirname(entry);
  for (let i = 0; i < 8; i++) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        name?: unknown;
      };
      if (pkg.name === expectedName) {
        return dir;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(
    `could not find package root for ${expectedName} from ${entry}`,
  );
}

function planRoot(plan: PackagePlan): string {
  return dirname(plan.distDir);
}

function rel(root: string, path: string): string {
  const value = relative(root, path);
  return value === "" ? "." : value;
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
