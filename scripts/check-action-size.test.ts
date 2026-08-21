import { mkdir, mkdtemp, open, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkActionSize,
  MAX_UNPACKED_BYTES,
  main,
  parseArgs,
} from "./check-action-size.mts";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function fixture(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "check-action-size-"));
  tempDirs.push(dir);
  return dir;
}

async function writeRel(
  root: string,
  rel: string,
  contents: string = "ok\n",
): Promise<void> {
  const path = join(root, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

function captureStdio(): { stdout: () => string; stderr: () => string } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  return {
    stdout: () => stdout.join(""),
    stderr: () => stderr.join(""),
  };
}

describe("check-action-size CLI", () => {
  it("prints help for -h and --help", async () => {
    const stdio = captureStdio();

    await expect(main(["-h"])).resolves.toBe(0);
    await expect(main(["--help"])).resolves.toBe(0);
    expect(stdio.stdout()).toMatch(/--dir <path>/);
    expect(stdio.stdout()).toMatch(/-h, --help/);
  });

  it("fails on unknown arguments", async () => {
    const stdio = captureStdio();

    await expect(main(["--wat"])).resolves.toBe(1);
    expect(stdio.stderr()).toMatch(/Unknown arguments: --wat/);
  });

  it("fails when --dir is missing a path", async () => {
    expect(parseArgs(["--dir"])).toEqual({
      ok: false,
      error: "--dir requires a path",
    });
    expect(parseArgs(["--dir="])).toEqual({
      ok: false,
      error: "--dir requires a path",
    });
    expect(parseArgs(["--dir", ""])).toEqual({
      ok: false,
      error: "--dir requires a path",
    });

    const stdio = captureStdio();
    await expect(main(["--dir"])).resolves.toBe(1);
    await expect(main(["--dir="])).resolves.toBe(1);
    expect(stdio.stderr()).toMatch(/--dir requires a path/);
  });

  it("fails when the directory is missing", async () => {
    const dir = await fixture();
    const missing = join(dir, "missing");
    const stdio = captureStdio();

    await expect(main(["--dir", missing])).resolves.toBe(1);
    expect(stdio.stderr()).toMatch(/directory not found/);
  });

  it("fails when --dir is not a directory", async () => {
    const dir = await fixture();
    await writeRel(dir, "file.txt");
    const stdio = captureStdio();

    await expect(main(["--dir", join(dir, "file.txt")])).resolves.toBe(1);
    expect(stdio.stderr()).toMatch(/not a directory/);
  });

  it("defaults --dir to dist under cwd", async () => {
    const cwd = await fixture();
    await writeRel(cwd, "dist/index.js");
    const stdio = captureStdio();

    await expect(main([], cwd)).resolves.toBe(0);
    expect(stdio.stdout()).toMatch(/^ok: \d+ bytes \(limit /);
  });

  it("accepts --dir=path", async () => {
    const dir = await fixture();
    await writeRel(dir, "index.js");
    const stdio = captureStdio();

    await expect(main([`--dir=${dir}`])).resolves.toBe(0);
    expect(stdio.stdout()).toMatch(/^ok: \d+ bytes \(limit /);
  });
});

describe("checkActionSize fixtures", () => {
  it("allows nested @takumi-rs files including .node addons", async () => {
    const dir = await fixture();
    await writeRel(dir, "index.js");
    await writeRel(dir, "node_modules/@takumi-rs/core/index.js");
    await writeRel(
      dir,
      "node_modules/@takumi-rs/core-linux-x64-gnu/core.linux-x64-gnu.node",
    );

    const report = await checkActionSize(dir);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    const stdio = captureStdio();
    await expect(main(["--dir", dir])).resolves.toBe(0);
    expect(stdio.stdout()).toMatch(/^ok: \d+ bytes \(limit /);
  });

  it("fails on extra node_modules/foo", async () => {
    const dir = await fixture();
    await writeRel(dir, "index.js");
    await writeRel(dir, "node_modules/@takumi-rs/core/index.js");
    await writeRel(dir, "node_modules/foo/index.js");

    const report = await checkActionSize(dir);
    expect(report.ok).toBe(false);
    expect(report.errors.join("\n")).toMatch(
      /disallowed node_modules:.*node_modules[\\/]foo/,
    );
    const stdio = captureStdio();
    await expect(main(["--dir", dir])).resolves.toBe(1);
    expect(stdio.stderr()).toMatch(/disallowed node_modules/);
  });

  it("fails when apps/docs is nested in the tree", async () => {
    const dir = await fixture();
    await writeRel(dir, "index.js");
    await writeRel(dir, "apps/docs/page.tsx");

    const report = await checkActionSize(dir);
    expect(report.ok).toBe(false);
    expect(report.errors.join("\n")).toMatch(
      /apps\/docs must not be packed: apps[\\/]docs/,
    );
    const stdio = captureStdio();
    await expect(main(["--dir", dir])).resolves.toBe(1);
    expect(stdio.stderr()).toMatch(/apps\/docs must not be packed/);
  });

  it("fails when a file named pnpm-lock.yaml is inside the tree", async () => {
    const dir = await fixture();
    await writeRel(dir, "index.js");
    await writeRel(dir, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");

    const report = await checkActionSize(dir);
    expect(report.ok).toBe(false);
    expect(report.errors.join("\n")).toMatch(
      /lockfile must not be packed: pnpm-lock\.yaml/,
    );
    const stdio = captureStdio();
    await expect(main(["--dir", dir])).resolves.toBe(1);
    expect(stdio.stderr()).toMatch(/lockfile must not be packed/);
  });

  it("fails when unpacked size is over 12MB", async () => {
    const dir = await fixture();
    const blob = join(dir, "blob.bin");
    const file = await open(blob, "w");
    try {
      await file.truncate(MAX_UNPACKED_BYTES + 1);
    } finally {
      await file.close();
    }

    const report = await checkActionSize(dir);
    expect(report.ok).toBe(false);
    expect(report.bytes).toBe(MAX_UNPACKED_BYTES + 1);
    expect(report.errors.join("\n")).toMatch(/unpacked size .* exceeds 12MB/);
    const stdio = captureStdio();
    await expect(main(["--dir", dir])).resolves.toBe(1);
    expect(stdio.stderr()).toMatch(/unpacked size .* exceeds 12MB/);
  });

  it("reports directory not found", async () => {
    const dir = await fixture();
    const missing = join(dir, "missing");
    const report = await checkActionSize(missing);
    expect(report.ok).toBe(false);
    expect(report.bytes).toBe(0);
    expect(report.errors.join("\n")).toMatch(/directory not found/);
  });

  it("reports not a directory", async () => {
    const dir = await fixture();
    await writeRel(dir, "file.txt");
    const report = await checkActionSize(join(dir, "file.txt"));
    expect(report.ok).toBe(false);
    expect(report.bytes).toBe(0);
    expect(report.errors.join("\n")).toMatch(/not a directory/);
  });
});
