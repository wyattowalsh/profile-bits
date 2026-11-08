import { describe, expect, it, vi } from "vitest";
import { githubDumpFromFixtures } from "../github-dump.fixture.js";
import { topReposViewModel } from "./view-model.js";
import { NO_REPOSITORIES } from "./widget.js";

describe("topReposViewModel dump select", () => {
  it("ranks owner-crawl dump by stars then forks without HTTP", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = githubDumpFromFixtures();
    const model = topReposViewModel(dump);

    expect(model.empty).toBe(false);
    expect(model.items.map((row) => row.title)).toEqual([
      "Hello-World",
      "boysenberry-repo-1",
    ]);
    expect(model.items[0]?.meta).toBe("2.0k stars");
    expect(model.items[1]?.meta).toBe("200 stars");
    expect(dump).toHaveProperty("pinnedItems");
    expect(dump).toHaveProperty("publicEvents");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("applies limit widget-side and keeps dump rows", () => {
    const dump = {
      repositories: [
        { name: "low", stargazersCount: 1, forksCount: 99 },
        { name: "high", stargazersCount: 10, forksCount: 0 },
        { name: "tie-b", stargazersCount: 5, forksCount: 3 },
        { name: "tie-a", stargazersCount: 5, forksCount: 2 },
      ],
    };
    expect(
      topReposViewModel(dump, { limit: 1 }).items.map((row) => row.title),
    ).toEqual(["high"]);
    expect(topReposViewModel(dump).items.map((row) => row.title)).toEqual([
      "high",
      "tie-b",
      "tie-a",
      "low",
    ]);
    expect(dump.repositories).toHaveLength(4);
  });

  it("maps snake_case dump fields and ranks zero-star rows", () => {
    const model = topReposViewModel({
      repositories: [
        { name: "zero", stargazers_count: 0, forks_count: 1 },
        { full_name: "octocat/named", stargazers_count: 3, forks_count: 0 },
      ],
    });
    expect(model.items).toEqual([
      { title: "octocat/named", meta: "3 stars" },
      { title: "zero", meta: "0 stars" },
    ]);
  });

  it("empty payload is an empty card, not a crash", () => {
    expect(topReposViewModel({}).empty).toBe(true);
    expect(topReposViewModel({ repositories: [] }).items).toEqual([]);
    expect(
      topReposViewModel({
        repositories: [{ stargazersCount: 12 }],
      }).empty,
    ).toBe(true);
    expect(NO_REPOSITORIES).toBe("No repositories");
  });
});
