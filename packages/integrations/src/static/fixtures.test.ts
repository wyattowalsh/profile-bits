import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  getStaticFixtures,
  loadPreviewFixtures,
  loadStaticFixtures,
  parseStaticFixtures,
  STATIC_FIXED_NOW,
  STATIC_FIXTURE_FILE,
  STATIC_FIXTURE_USER,
  StaticFixtureError,
  staticFixturePath,
} from "./fixtures.js";

describe("static fixtures", () => {
  it("loads octocat JSON from disk (no network)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const path = staticFixturePath();
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as { user: { login: string } };

    expect(path.endsWith(STATIC_FIXTURE_FILE)).toBe(true);
    expect(parsed.user.login).toBe(STATIC_FIXTURE_USER);
    expect(getStaticFixtures()).toEqual(parseStaticFixtures(JSON.parse(raw)));
    expect(loadStaticFixtures()).toBe(getStaticFixtures());
    expect(await loadPreviewFixtures()).toBe(getStaticFixtures());
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("freezes generatedAt to the fixture clock", () => {
    const fixtures = getStaticFixtures();
    expect(fixtures.generatedAt).toBe("2026-01-15T00:00:00.000Z");
    expect(fixtures.generatedAt).toBe(STATIC_FIXED_NOW);
    expect(fixtures.user.createdAt).toBe("2011-01-25T18:44:36Z");
  });

  it("rejects a non-octocat fixture pack", () => {
    expect(() =>
      parseStaticFixtures({
        generatedAt: "2026-01-15T00:00:00.000Z",
        user: {
          login: "hubot",
          id: 1,
          nodeId: "x",
          name: "Hubot",
          avatarUrl: "https://example.invalid/hubot",
          bio: "bot",
          company: "GitHub",
          location: "Earth",
          createdAt: "2011-01-25T18:44:36Z",
        },
        demo: { text: "profile-bits", animate: true },
        stats: {
          followers: 0,
          following: 0,
          repos: 0,
          stars: 0,
          forks: 0,
          gists: 0,
          contributions: 0,
          rank: "C",
        },
        repos: [],
        languages: [],
      }),
    ).toThrow(StaticFixtureError);
  });
});
