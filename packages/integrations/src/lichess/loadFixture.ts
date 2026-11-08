import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const LICHESS_FIXTURE_NAMES = [
  "user.json",
  "current-game.json",
  "recent-games.ndjson",
] as const;

export type LichessFixtureName = (typeof LICHESS_FIXTURE_NAMES)[number];

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const NAME_SET = new Set<string>(LICHESS_FIXTURE_NAMES);

export function lichessFixturePath(name: LichessFixtureName): string {
  return join(fixturesDir, name);
}

export function loadFixtureText(name: LichessFixtureName): string {
  if (!NAME_SET.has(name)) {
    throw new Error(`unknown lichess fixture: ${String(name)}`);
  }
  return readFileSync(lichessFixturePath(name), "utf8");
}

export function loadFixture(
  name: Exclude<LichessFixtureName, "recent-games.ndjson">,
): unknown {
  try {
    return JSON.parse(loadFixtureText(name)) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to load lichess fixture ${name}: ${detail}`);
  }
}
