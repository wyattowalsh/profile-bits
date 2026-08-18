import { describe, expect, it, vi } from "vitest";
import { createWriteWidgetFiles } from "./write-files.ts";

const CWD = "/repo";
const RELATIVE = "profile-bits/wakatime.svg";
const ABSOLUTE = `${CWD}/${RELATIVE}`;
const PARENT = `${CWD}/profile-bits`;
const SVG = "<svg />";

function bytes(contents: string): Uint8Array {
  return new TextEncoder().encode(contents);
}

function createHarness() {
  const written = new Map<string, Uint8Array>();
  const directories = new Map<string, true>();
  const writeFile = vi.fn(async (path: string, contents: Uint8Array) => {
    written.set(path, contents);
  });
  const mkdir = vi.fn(async (path: string) => {
    directories.set(path, true);
  });
  const writeFiles = createWriteWidgetFiles({
    cwd: CWD,
    writeFile,
    mkdir,
  });
  return { writeFiles, writeFile, mkdir, written, directories };
}

describe("createWriteWidgetFiles", () => {
  it("writes svg bytes under a cwd-relative path and returns paths", async () => {
    const { writeFiles, writeFile, mkdir, written, directories } =
      createHarness();
    const svg = bytes(SVG);

    const paths = await writeFiles([{ path: RELATIVE, contents: svg }]);

    expect(paths).toEqual([RELATIVE]);
    expect(mkdir).toHaveBeenCalledWith(PARENT);
    expect(writeFile).toHaveBeenCalledWith(ABSOLUTE, svg);
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(written.get(ABSOLUTE)).toEqual(svg);
    expect(directories.has(PARENT)).toBe(true);
  });

  it("encodes string contents as utf8", async () => {
    const { writeFiles, writeFile } = createHarness();

    const paths = await writeFiles([{ path: RELATIVE, contents: SVG }]);

    expect(paths).toEqual([RELATIVE]);
    expect(writeFile).toHaveBeenCalledWith(ABSOLUTE, bytes(SVG));
  });

  it("rejects README.md without writing", async () => {
    const { writeFiles, writeFile, mkdir } = createHarness();

    await expect(
      writeFiles([{ path: "README.md", contents: "# patched" }]),
    ).rejects.toThrow(/README\.md/);

    expect(writeFile).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
  });

  it("rejects .. path segments without writing", async () => {
    const { writeFiles, writeFile, mkdir } = createHarness();

    await expect(
      writeFiles([{ path: "../secrets.svg", contents: SVG }]),
    ).rejects.toThrow(/escapes/);

    expect(writeFile).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
  });

  it("returns [] for an empty list without writing", async () => {
    const { writeFiles, writeFile, mkdir } = createHarness();

    const paths = await writeFiles([]);

    expect(paths).toEqual([]);
    expect(writeFile).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
  });
});
