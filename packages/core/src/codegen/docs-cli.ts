import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getPlaygroundFields } from "./docs-fields.ts";

export const PLAYGROUND_FIELDS_SNAPSHOT_FILENAME = "playground-fields.json";

export function playgroundFieldsSnapshotPath(
  codegenDir: string = fileURLToPath(new URL(".", import.meta.url)),
): string {
  return resolve(
    codegenDir,
    "__snapshots__",
    PLAYGROUND_FIELDS_SNAPSHOT_FILENAME,
  );
}

export function serializePlaygroundFields(fields: unknown): string {
  return `${JSON.stringify(fields, null, 2)}\n`;
}

export type PlaygroundFieldsCheckResult =
  | { ok: true }
  | { ok: false; errors: string[] };

/**
 * --check: fail when the core snapshot is missing or would drift from
 * `getPlaygroundFields()`.
 */
export function checkPlaygroundFieldsSnapshot(
  currentText: string | null,
  generatedText: string,
): PlaygroundFieldsCheckResult {
  const errors: string[] = [];

  if (currentText === null) {
    errors.push("playground-fields.json is missing; run `pnpm generate-docs`.");
  } else if (currentText !== generatedText) {
    errors.push("playground-fields.json is stale; run `pnpm generate-docs`.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

export async function main(
  argv: readonly string[] = process.argv.slice(2),
  snapshotPath: string = playgroundFieldsSnapshotPath(),
): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: generate-docs [--check]");
    return 0;
  }

  const checkMode = argv.includes("--check");
  const unknown = argv.filter(
    (arg) =>
      arg !== "--" && arg !== "--check" && arg !== "--help" && arg !== "-h",
  );
  if (unknown.length > 0) {
    console.error(`Unknown arguments: ${unknown.join(" ")}`);
    return 1;
  }

  const generated = serializePlaygroundFields(getPlaygroundFields());
  const dest = resolve(snapshotPath);

  if (checkMode) {
    let current: string | null = null;
    try {
      current = await readFile(dest, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
    const result = checkPlaygroundFieldsSnapshot(current, generated);
    if (!result.ok) {
      for (const error of result.errors) {
        console.error(error);
      }
      return 1;
    }
    return 0;
  }

  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, generated, "utf8");
  return 0;
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
