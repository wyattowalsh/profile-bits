import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { WriteWidgetFiles } from "./engine.ts";
import type { WidgetBlob } from "./output.ts";

export class WriteFilesError extends Error {
  override readonly name = "WriteFilesError";
}

export type WriteFilesHost = {
  cwd: string;
  mkdir: (path: string) => Promise<void>;
  writeFile: (path: string, contents: Uint8Array) => Promise<void>;
};

type LocatedFile = {
  relative: string;
  absolute: string;
  bytes: Uint8Array;
};

/**
 * Disk-only {@link WriteWidgetFiles}. Engine already prefixes `output_dir`
 * onto each blob path. Does not git-commit.
 */
export function createWriteWidgetFiles(
  host: Partial<WriteFilesHost> = {},
): WriteWidgetFiles {
  const resolved = resolveHost(host);
  return (files) => writeWidgetFiles(files, resolved);
}

async function writeWidgetFiles(
  files: readonly WidgetBlob[],
  host: WriteFilesHost,
): Promise<readonly string[]> {
  if (files.length === 0) {
    return [];
  }

  const located = files.map((file) => locateFile(host.cwd, file));
  for (const file of located) {
    await host.mkdir(dirname(file.absolute));
    await host.writeFile(file.absolute, file.bytes);
  }
  return files.map((file) => file.path);
}

function locateFile(cwd: string, file: WidgetBlob): LocatedFile {
  const relative = locateRelative(file.path);
  return {
    relative,
    absolute: join(cwd, relative),
    bytes: blobBytes(file.contents),
  };
}

function locateRelative(relativePath: string): string {
  const trimmed = relativePath.replaceAll("\\", "/").replace(/^\.?\//, "");
  if (isReadmePath(trimmed)) {
    throw new WriteFilesError("Action must not patch README.md");
  }
  const segments = trimmed
    .split("/")
    .filter((part) => part !== "" && part !== ".");
  if (segments.includes("..")) {
    throw new WriteFilesError("widget file path escapes output_dir");
  }
  if (segments.includes("README.md")) {
    throw new WriteFilesError("Action must not patch README.md");
  }
  return segments.join("/");
}

function isReadmePath(path: string): boolean {
  return path === "README.md" || path.endsWith("/README.md");
}

function blobBytes(contents: string | Uint8Array): Uint8Array {
  return typeof contents === "string"
    ? new TextEncoder().encode(contents)
    : contents;
}

function resolveHost(options: Partial<WriteFilesHost>): WriteFilesHost {
  const cwd = options.cwd ?? process.env.GITHUB_WORKSPACE ?? process.cwd();
  return {
    cwd,
    writeFile:
      options.writeFile ?? ((path, contents) => writeFile(path, contents)),
    mkdir:
      options.mkdir ??
      ((path) => mkdir(path, { recursive: true }).then(() => undefined)),
  };
}
