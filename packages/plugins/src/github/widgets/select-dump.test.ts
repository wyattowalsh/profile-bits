import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { githubDumpFromFixtures } from "./github-dump.fixture.js";
import {
  dumpContributions,
  dumpLanguages,
  dumpRepositories,
  dumpRepository,
  dumpUser,
} from "./select-dump.js";

const widgetsDir = dirname(fileURLToPath(import.meta.url));

const READER_FILES = [
  "select-dump.ts",
  "demo/render.ts",
  "demo/widget.tsx",
  "stats/view-model.ts",
  "stats/render.ts",
  "stats/widget.tsx",
  "languages/view-model.ts",
  "languages/render.ts",
  "languages/widget.tsx",
  "repo/view-model.ts",
  "repo/render.ts",
  "repo/widget.tsx",
] as const;

describe("github dump selectors", () => {
  it("selects dump user, repos, languages, calendar, and repo without HTTP", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = githubDumpFromFixtures();

    expect(dumpUser(dump)).toMatchObject({
      login: "octocat",
      name: "The Octocat",
      bio: "GitHub's mascot",
      avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
      createdAt: "2011-01-25T18:44:36Z",
      followers: 4000,
      publicRepos: 8,
      publicGists: 8,
    });
    expect(dumpRepositories(dump).map((repo) => repo.name)).toEqual([
      "Hello-World",
      "boysenberry-repo-1",
    ]);
    expect(dumpLanguages(dump)).toEqual([
      { name: "TypeScript", bytes: 1000 },
      { name: "Python", bytes: 400 },
    ]);
    expect(dumpContributions(dump)).toBe(1600);
    expect(dumpRepository(dump)).toMatchObject({
      fullName: "octocat/Hello-World",
      htmlUrl: "https://github.com/octocat/Hello-World",
      description: "My first repository on GitHub!",
      language: "TypeScript",
      topics: ["octocat", "atom", "electron"],
    });
    expect(dump).toHaveProperty("pinnedItems");
    expect(dump).toHaveProperty("publicEvents");
    expect(dump).toHaveProperty("unexpected");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("reads calendar.totalContributions when the scalar is omitted", () => {
    expect(
      dumpContributions({
        calendar: { totalContributions: 12, weeks: [] },
      }),
    ).toBe(12);
    expect(dumpContributions({})).toBeUndefined();
    expect(dumpContributions({ contributions: 0 })).toBe(0);
  });

  it("keeps language name/bytes and ignores extra color/id keys", () => {
    expect(
      dumpLanguages({
        languages: [
          {
            name: "TypeScript",
            bytes: 10,
            color: "#3178c6",
            id: "MDg6TGFuZ3VhZ2Ux",
          },
          { name: "skip-me" },
        ],
      }),
    ).toEqual([{ name: "TypeScript", bytes: 10 }]);
  });

  it("github widget readers contain no HTTP and never REST /languages", () => {
    for (const relative of READER_FILES) {
      const text = readFileSync(join(widgetsDir, relative), "utf8");
      expect(text, relative).not.toMatch(/\bfetch\s*\(/);
      expect(text, relative).not.toContain("/repos/{owner}/{repo}/languages");
      expect(text, relative).not.toMatch(/https?:\/\/api\.github\.com/);
    }
  });
});
