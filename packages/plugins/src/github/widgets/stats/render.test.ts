import { describe, expect, it } from "vitest";
import { renderStatsSvg } from "./render.js";
import { statsViewModel } from "./view-model.js";

describe("stats widget", () => {
  it("sums stars from crawled repos and omits contributions without capability", () => {
    const model = statsViewModel(
      {
        user: { login: "octocat", followers: 4 },
        repositories: [
          { stargazersCount: 10, forksCount: 1 },
          { stargazersCount: 5, forksCount: 2 },
        ],
      },
      { include: ["followers", "stars", "contributions"] },
      false,
    );
    expect(model.login).toBe("octocat");
    expect(model.chips.map((chip) => chip.label)).toEqual([
      "Followers",
      "Stars",
    ]);
    expect(model.chips[1]?.value).toBe("15");
  });

  it("uses static stats fixture numbers", () => {
    const model = statsViewModel({
      user: { login: "octocat" },
      stats: { followers: 4000, repos: 8, stars: 2250 },
    });
    expect(model.chips[0]?.value).toBe("4.0k");
  });

  it("renders svg without HTTP", async () => {
    const svg = await renderStatsSvg({
      payload: {
        user: { login: "octocat" },
        stats: { followers: 1, repos: 2, stars: 3 },
      },
    });
    expect(svg).toMatch(/<svg\b/);
  });

  it("bakes mocha bg hex instead of Primer dark", async () => {
    const svg = await renderStatsSvg({
      payload: {
        user: { login: "octocat" },
        stats: { followers: 1, repos: 2, stars: 3 },
      },
      theme: "catppuccin-mocha",
    });
    expect(svg).toContain("#1e1e2e");
    expect(svg).not.toContain("#0d1117");
    expect(svg).not.toMatch(/<style\b|@keyframes|<animate\b|foreignObject/i);
  });
});
