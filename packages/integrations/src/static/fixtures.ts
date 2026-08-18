import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const STATIC_FIXTURE_USER = "octocat" as const;
export const STATIC_FIXTURE_FILE = "octocat.json" as const;

export class StaticFixtureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaticFixtureError";
  }
}

export type StaticDemoFixture = {
  text: string;
  subtitle?: string;
  animate: boolean;
};

export type StaticUserFixture = {
  login: typeof STATIC_FIXTURE_USER;
  id: number;
  nodeId: string;
  name: string;
  avatarUrl: string;
  bio: string;
  company: string;
  location: string;
  createdAt: string;
};

export type StaticStatsFixture = {
  followers: number;
  following: number;
  repos: number;
  stars: number;
  forks: number;
  gists: number;
  contributions: number;
  rank: string;
};

export type StaticRepoFixture = {
  id: number;
  nodeId: string;
  name: string;
  fullName: string;
  fork: boolean;
  archived: boolean;
  stargazersCount: number;
  forksCount: number;
  language: string | null;
};

export type StaticLanguageFixture = {
  name: string;
  bytes: number;
};

export type StaticFixtures = {
  generatedAt: string;
  user: StaticUserFixture;
  demo: StaticDemoFixture;
  stats: StaticStatsFixture;
  repos: readonly StaticRepoFixture[];
  languages: readonly StaticLanguageFixture[];
};

export function staticFixturePath(): string {
  return join(
    dirname(fileURLToPath(import.meta.url)),
    "fixtures",
    STATIC_FIXTURE_FILE,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new StaticFixtureError(`static fixture missing string "${key}"`);
  }
  return value;
}

function requiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new StaticFixtureError(`static fixture missing number "${key}"`);
  }
  return value;
}

function requiredBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new StaticFixtureError(`static fixture missing boolean "${key}"`);
  }
  return value;
}

function parseUser(value: unknown): StaticUserFixture {
  if (!isRecord(value)) {
    throw new StaticFixtureError("static fixture user must be an object");
  }
  const login = requiredString(value, "login");
  if (login !== STATIC_FIXTURE_USER) {
    throw new StaticFixtureError(
      `static fixture user must be ${STATIC_FIXTURE_USER}`,
    );
  }
  return {
    login,
    id: requiredNumber(value, "id"),
    nodeId: requiredString(value, "nodeId"),
    name: requiredString(value, "name"),
    avatarUrl: requiredString(value, "avatarUrl"),
    bio: requiredString(value, "bio"),
    company: requiredString(value, "company"),
    location: requiredString(value, "location"),
    createdAt: requiredString(value, "createdAt"),
  };
}

function parseDemo(value: unknown): StaticDemoFixture {
  if (!isRecord(value)) {
    throw new StaticFixtureError("static fixture demo must be an object");
  }
  const demo: StaticDemoFixture = {
    text: requiredString(value, "text"),
    animate: requiredBoolean(value, "animate"),
  };
  if (value.subtitle !== undefined) {
    demo.subtitle = requiredString(value, "subtitle");
  }
  return demo;
}

function parseStats(value: unknown): StaticStatsFixture {
  if (!isRecord(value)) {
    throw new StaticFixtureError("static fixture stats must be an object");
  }
  return {
    followers: requiredNumber(value, "followers"),
    following: requiredNumber(value, "following"),
    repos: requiredNumber(value, "repos"),
    stars: requiredNumber(value, "stars"),
    forks: requiredNumber(value, "forks"),
    gists: requiredNumber(value, "gists"),
    contributions: requiredNumber(value, "contributions"),
    rank: requiredString(value, "rank"),
  };
}

function parseRepo(value: unknown, index: number): StaticRepoFixture {
  if (!isRecord(value)) {
    throw new StaticFixtureError(
      `static fixture repos[${index}] must be an object`,
    );
  }
  const language = value.language;
  if (language !== null && typeof language !== "string") {
    throw new StaticFixtureError(
      `static fixture repos[${index}].language must be string or null`,
    );
  }
  return {
    id: requiredNumber(value, "id"),
    nodeId: requiredString(value, "nodeId"),
    name: requiredString(value, "name"),
    fullName: requiredString(value, "fullName"),
    fork: requiredBoolean(value, "fork"),
    archived: requiredBoolean(value, "archived"),
    stargazersCount: requiredNumber(value, "stargazersCount"),
    forksCount: requiredNumber(value, "forksCount"),
    language,
  };
}

function parseLanguage(value: unknown, index: number): StaticLanguageFixture {
  if (!isRecord(value)) {
    throw new StaticFixtureError(
      `static fixture languages[${index}] must be an object`,
    );
  }
  return {
    name: requiredString(value, "name"),
    bytes: requiredNumber(value, "bytes"),
  };
}

function parseArray<T>(
  value: unknown,
  key: string,
  mapItem: (item: unknown, index: number) => T,
): T[] {
  if (!Array.isArray(value)) {
    throw new StaticFixtureError(`static fixture ${key} must be an array`);
  }
  return value.map(mapItem);
}

export function parseStaticFixtures(value: unknown): StaticFixtures {
  if (!isRecord(value)) {
    throw new StaticFixtureError("static fixture root must be an object");
  }
  const fixtures: StaticFixtures = {
    generatedAt: requiredString(value, "generatedAt"),
    user: parseUser(value.user),
    demo: parseDemo(value.demo),
    stats: parseStats(value.stats),
    repos: parseArray(value.repos, "repos", parseRepo),
    languages: parseArray(value.languages, "languages", parseLanguage),
  };
  return freezeDeep(fixtures);
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        freezeDeep(item);
      }
    } else {
      for (const item of Object.values(value)) {
        freezeDeep(item);
      }
    }
  }
  return value;
}

function readFixtureFile(): StaticFixtures {
  const path = staticFixturePath();
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new StaticFixtureError(`failed to load ${path}: ${detail}`);
  }
  return parseStaticFixtures(parsed);
}

const loaded = readFixtureFile();

/** Frozen clock from the fixture JSON. Never `Date.now()`. */
export const STATIC_FIXED_NOW = loaded.generatedAt;

export function getStaticFixtures(): StaticFixtures {
  return loaded;
}

/** Docs playground wrap (T310b). Same pack as demo/tests; no HTTP. */
export async function loadPreviewFixtures(): Promise<StaticFixtures> {
  return getStaticFixtures();
}

export function loadStaticFixtures(): StaticFixtures {
  return getStaticFixtures();
}
