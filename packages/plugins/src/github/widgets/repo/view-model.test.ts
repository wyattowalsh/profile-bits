import { describe, expect, it, vi } from "vitest";
import { githubDumpFromFixtures } from "../github-dump.fixture.js";
import { repoViewModel } from "./view-model.js";

describe("repoViewModel dump select", () => {
  it("selects dump repository fields and ignores extra keys without HTTP", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = githubDumpFromFixtures();
    const model = repoViewModel(dump, {
      include: ["stars", "forks", "watchers", "issues", "license", "language"],
    });

    expect(model.empty).toBe(false);
    expect(model.fullName).toBe("octocat/Hello-World");
    expect(model.avatarUrl).toBe(
      "https://avatars.githubusercontent.com/u/583231?v=4",
    );
    expect(model.chips).toEqual([
      { label: "Stars", value: "2.0k" },
      { label: "Forks", value: "1.4k" },
      { label: "Watchers", value: "42" },
      { label: "Issues", value: "3" },
      { label: "License", value: "MIT" },
      { label: "Language", value: "TypeScript" },
    ]);
    expect(dump.repository).toEqual(
      expect.objectContaining({
        htmlUrl: "https://github.com/octocat/Hello-World",
        description: "My first repository on GitHub!",
        topics: ["octocat", "atom", "electron"],
      }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps include widget-side and does not invent 0", () => {
    const model = repoViewModel(githubDumpFromFixtures(), {
      include: ["language", "stars"],
    });
    expect(model.chips.map((chip) => chip.label)).toEqual([
      "Language",
      "Stars",
    ]);
  });
});
