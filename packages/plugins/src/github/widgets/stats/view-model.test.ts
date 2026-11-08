import { describe, expect, it, vi } from "vitest";
import { githubDumpFromFixtures } from "../github-dump.fixture.js";
import { statsViewModel } from "./view-model.js";

describe("statsViewModel dump select", () => {
  it("selects dump user counts and repo star sums without HTTP", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = githubDumpFromFixtures();
    const model = statsViewModel(dump, {
      include: [
        "followers",
        "following",
        "repos",
        "stars",
        "forks",
        "gists",
        "contributions",
      ],
    });

    expect(model.login).toBe("octocat");
    expect(model.avatarUrl).toBe(
      "https://avatars.githubusercontent.com/u/583231?v=4",
    );
    expect(model.chips).toEqual([
      { label: "Followers", value: "4.0k" },
      { label: "Following", value: "9" },
      { label: "Repos", value: "8" },
      { label: "Stars", value: "2.2k" },
      { label: "Forks", value: "1.5k" },
      { label: "Gists", value: "8" },
      { label: "Contributions", value: "1.6k" },
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps include widget-side and does not invent 0 for omitted keys", () => {
    const dump = githubDumpFromFixtures();
    const model = statsViewModel(dump, { include: ["followers", "gists"] });
    expect(model.chips.map((chip) => chip.label)).toEqual([
      "Followers",
      "Gists",
    ]);
    expect(
      statsViewModel(
        { user: { login: "octocat", followers: 4 } },
        { include: ["followers", "stars", "contributions"] },
      ).chips.map((chip) => chip.label),
    ).toEqual(["Followers"]);
  });

  it("reads calendar.totalContributions when the scalar is omitted", () => {
    const dump = githubDumpFromFixtures();
    const { contributions: _contributions, ...withoutScalar } = dump;
    expect(_contributions).toBe(1600);
    expect(
      statsViewModel(withoutScalar, { include: ["contributions"] }).chips,
    ).toEqual([{ label: "Contributions", value: "1.6k" }]);
  });

  it("still parses when extra dump keys are present", () => {
    const dump = githubDumpFromFixtures({ heatmap: { weeks: 52 } });
    expect(() => statsViewModel(dump)).not.toThrow();
    expect(statsViewModel(dump).login).toBe("octocat");
  });
});
