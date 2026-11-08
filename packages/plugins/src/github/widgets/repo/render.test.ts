import { describe, expect, it, vi } from "vitest";
import { githubDumpFromFixtures } from "../github-dump.fixture.js";
import { renderRepoSvg } from "./render.js";
import { repoViewModel } from "./view-model.js";
import { NO_REPO_DATA } from "./widget.js";

const CAMEL_REPOSITORY = {
  fullName: "octocat/hello-world",
  avatarUrl: "https://example.com/octocat.png",
  stargazersCount: 1500,
  forksCount: 2,
  watchersCount: 4,
  openIssuesCount: 0,
  license: "MIT",
  language: "TypeScript",
};

describe("repo widget", () => {
  it("maps camelCase and snake_case repository fields", () => {
    const camel = repoViewModel(
      { repository: CAMEL_REPOSITORY },
      {
        include: [
          "stars",
          "forks",
          "watchers",
          "issues",
          "license",
          "language",
        ],
      },
    );
    expect(camel.empty).toBe(false);
    expect(camel.fullName).toBe("octocat/hello-world");
    expect(camel.avatarUrl).toBe("https://example.com/octocat.png");
    expect(camel.chips).toEqual([
      { label: "Stars", value: "1.5k" },
      { label: "Forks", value: "2" },
      { label: "Watchers", value: "4" },
      { label: "Issues", value: "0" },
      { label: "License", value: "MIT" },
      { label: "Language", value: "TypeScript" },
    ]);

    const snake = repoViewModel(
      {
        repository: {
          full_name: "octocat/hello-world",
          avatar_url: "https://example.com/octocat.png",
          stargazers_count: 1500,
          forks_count: 2,
          watchers_count: 4,
          open_issues_count: 0,
          license: "MIT",
          language: "TypeScript",
        },
      },
      {
        include: [
          "stars",
          "forks",
          "watchers",
          "issues",
          "license",
          "language",
        ],
      },
    );
    expect(snake).toEqual(camel);
  });

  it("omits missing include keys and does not invent 0", () => {
    const model = repoViewModel(
      {
        repository: {
          fullName: "octocat/hello-world",
          stargazersCount: 3,
        },
      },
      { include: ["stars", "forks", "issues"] },
    );
    expect(model.chips.map((chip) => chip.label)).toEqual(["Stars"]);
    expect(model.chips[0]?.value).toBe("3");
  });

  it("omits Avatar when avatar is false or src is empty", () => {
    expect(
      repoViewModel({ repository: CAMEL_REPOSITORY }, { avatar: false })
        .avatarUrl,
    ).toBeUndefined();
    expect(
      repoViewModel({
        repository: { ...CAMEL_REPOSITORY, avatarUrl: "" },
      }).avatarUrl,
    ).toBeUndefined();
  });

  it("empty payload is an empty card, not a crash", () => {
    expect(repoViewModel({}).empty).toBe(true);
    expect(repoViewModel({ repository: null }).chips).toEqual([]);
    expect(
      repoViewModel({
        repository: { name: "hello-world", stargazersCount: 1 },
      }).empty,
    ).toBe(true);
    expect(NO_REPO_DATA).toBe("No repo data");
  });

  it("maps ownerAvatarUrl from the REST repository payload", () => {
    expect(
      repoViewModel({
        repository: {
          fullName: "octocat/hello-world",
          ownerAvatarUrl: "https://example.com/owner.png",
        },
      }).avatarUrl,
    ).toBe("https://example.com/owner.png");
  });

  it("renders svg without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderRepoSvg({
      payload: { repository: CAMEL_REPOSITORY },
    });
    expect(svg).toMatch(/<svg\b/);
    expect(svg).toMatch(/width="480"/);
    expect(svg).toMatch(/height="160"/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders empty card text without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderRepoSvg({ payload: {} });
    expect(svg).toMatch(/<svg\b/);
    expect(NO_REPO_DATA).toBe("No repo data");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders a dump with extra htmlUrl/topics keys without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderRepoSvg({ payload: githubDumpFromFixtures() });
    expect(svg).toMatch(/<svg\b/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("bakes mocha bg hex instead of Primer dark", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderRepoSvg({
      payload: { repository: CAMEL_REPOSITORY },
      theme: "catppuccin-mocha",
    });
    expect(svg).toContain("#1e1e2e");
    expect(svg).not.toContain("#0d1117");
    expect(svg).not.toMatch(/<style\b|@keyframes|<animate\b|foreignObject/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
