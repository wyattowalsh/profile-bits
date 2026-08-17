import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ACTION_YML_FILENAME, generateActionYml } from "./action-yml.ts";
import { checkActionYml } from "./check.ts";
import { assertNoFlattenedActionInputs } from "./flatten.ts";

export async function main(
  argv: readonly string[] = process.argv.slice(2),
  cwd: string = process.cwd(),
): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: generate-action [--check]");
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

  const generated = generateActionYml();
  const dest = resolve(cwd, ACTION_YML_FILENAME);

  if (checkMode) {
    let current: string | null = null;
    try {
      current = await readFile(dest, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
    const result = checkActionYml(current, generated);
    if (!result.ok) {
      for (const error of result.errors) {
        console.error(error);
      }
      return 1;
    }
    return 0;
  }

  assertNoFlattenedActionInputs(generated);
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
