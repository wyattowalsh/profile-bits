import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const CHESSCOM_FIXTURE_NAMES = [
  "player.json",
  "stats.json",
  "games-to-move.json",
  "archives.json",
  "games-month.json",
] as const;

export type ChesscomFixtureName = (typeof CHESSCOM_FIXTURE_NAMES)[number];

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const NAME_SET = new Set<string>(CHESSCOM_FIXTURE_NAMES);

export function chesscomFixturePath(name: ChesscomFixtureName): string {
  return join(fixturesDir, name);
}

export function loadFixture(name: ChesscomFixtureName): unknown {
  if (!NAME_SET.has(name)) {
    throw new Error(`unknown chesscom fixture: ${String(name)}`);
  }
  const path = chesscomFixturePath(name);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to load chesscom fixture ${name}: ${detail}`);
  }
}
