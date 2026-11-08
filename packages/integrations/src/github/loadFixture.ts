import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Disk fixtures of already-fetched GitHub REST/GraphQL JSON. Never network. */
export const GITHUB_FIXTURE_NAMES = [
  "user.json",
  "repos.json",
  "repo.json",
  "languages-nodes.json",
  "contributions.json",
] as const;

export type GithubFixtureName = (typeof GITHUB_FIXTURE_NAMES)[number];

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const NAME_SET = new Set<string>(GITHUB_FIXTURE_NAMES);

export function githubFixturePath(name: GithubFixtureName): string {
  return join(fixturesDir, name);
}

export function loadFixture(name: GithubFixtureName): unknown {
  if (!NAME_SET.has(name)) {
    throw new Error(`unknown github fixture: ${String(name)}`);
  }
  const path = githubFixturePath(name);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to load github fixture ${name}: ${detail}`);
  }
}
