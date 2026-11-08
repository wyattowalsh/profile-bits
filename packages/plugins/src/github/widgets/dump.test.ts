/**
 * W2-G-06 widget dump tests. Extra payload keys MUST NOT fail parse.
 * Widgets select from the cache and MUST NOT perform HTTP.
 */

import { describe, expect, it, vi } from "vitest";
import { githubDumpFromFixtures } from "./github-dump.fixture.js";
import { renderLanguagesSvg } from "./languages/render.js";
import { languagesViewModel } from "./languages/view-model.js";
import { renderRepoSvg } from "./repo/render.js";
import { repoViewModel } from "./repo/view-model.js";
import { renderStatsSvg } from "./stats/render.js";
import { statsViewModel } from "./stats/view-model.js";

describe("W2-G-06 github widget dump extra keys", () => {
  it("still parses stats, languages, and repo when extra dump keys are present", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = githubDumpFromFixtures({
      heatmap: { weeks: 52 },
      unexpected: { foo: 1, nested: [true] },
    });

    expect(dump.user).toEqual(
      expect.objectContaining({
        name: "The Octocat",
        bio: "GitHub's mascot",
        avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
        createdAt: "2011-01-25T18:44:36Z",
      }),
    );
    expect(dump.repositories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          htmlUrl: "https://github.com/octocat/Hello-World",
          description: "My first repository on GitHub!",
          topics: ["octocat", "atom", "electron"],
        }),
      ]),
    );
    expect(dump).toHaveProperty("pinnedItems");
    expect(dump).toHaveProperty("publicEvents");
    expect(dump).toHaveProperty("heatmap");

    expect(() => statsViewModel(dump)).not.toThrow();
    expect(() => languagesViewModel(dump)).not.toThrow();
    expect(() => repoViewModel(dump)).not.toThrow();

    expect(statsViewModel(dump).login).toBe("octocat");
    expect(languagesViewModel(dump).rows.map((row) => row.name)).toEqual([
      "TypeScript",
      "Python",
    ]);
    expect(repoViewModel(dump).fullName).toBe("octocat/Hello-World");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders dump widgets with extra keys and never performs HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = githubDumpFromFixtures({ extraCard: { unused: true } });

    await expect(renderStatsSvg({ payload: dump })).resolves.toMatch(/<svg\b/);
    await expect(renderLanguagesSvg({ payload: dump })).resolves.toMatch(
      /<svg\b/,
    );
    await expect(renderRepoSvg({ payload: dump })).resolves.toMatch(/<svg\b/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
