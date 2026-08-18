import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkPlaygroundFieldsSnapshot,
  main as generateDocsCli,
  playgroundFieldsSnapshotPath,
  serializePlaygroundFields,
} from "./docs-cli.ts";
import { getPlaygroundFields } from "./docs-fields.ts";

function generatedSnapshot(): string {
  return serializePlaygroundFields(getPlaygroundFields());
}

describe("generate-docs CLI", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints usage for --help", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(generateDocsCli(["--help"])).resolves.toBe(0);
    expect(log).toHaveBeenCalledWith("Usage: generate-docs [--check]");
  });

  it("prints usage for -h", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(generateDocsCli(["-h"])).resolves.toBe(0);
    expect(log).toHaveBeenCalledWith("Usage: generate-docs [--check]");
  });

  it("fails on unknown arguments", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(generateDocsCli(["--wat"])).resolves.toBe(1);
    expect(err).toHaveBeenCalledWith("Unknown arguments: --wat");
  });

  it("accepts just/pnpm -- --check against the current snapshot", async () => {
    await expect(
      generateDocsCli(["--", "--check"], playgroundFieldsSnapshotPath()),
    ).resolves.toBe(0);
  });
});

describe("generate-docs --check", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exits ok when current matches generated fields", () => {
    const generated = generatedSnapshot();
    expect(checkPlaygroundFieldsSnapshot(generated, generated)).toEqual({
      ok: true,
    });
  });

  it("fails --check when the snapshot is missing", () => {
    const result = checkPlaygroundFieldsSnapshot(null, generatedSnapshot());
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.join("\n")).toMatch(/missing/);
  });

  it("fails --check when fields would drift", async () => {
    const dir = await mkdtemp(join(tmpdir(), "profile-bits-docs-drift-"));
    const snap = join(dir, "playground-fields.json");
    try {
      await writeFile(
        snap,
        `${JSON.stringify({ drifted: true }, null, 2)}\n`,
        "utf8",
      );
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(generateDocsCli(["--check"], snap)).resolves.toBe(1);
      expect(err.mock.calls.map((call) => String(call[0])).join("\n")).toMatch(
        /stale/,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writes only the core snapshot without --check", async () => {
    const dir = await mkdtemp(join(tmpdir(), "profile-bits-docs-write-"));
    const snap = join(dir, "__snapshots__", "playground-fields.json");
    try {
      await mkdir(dirname(snap), { recursive: true });
      await expect(generateDocsCli([], snap)).resolves.toBe(0);
      await expect(readFile(snap, "utf8")).resolves.toBe(generatedSnapshot());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
