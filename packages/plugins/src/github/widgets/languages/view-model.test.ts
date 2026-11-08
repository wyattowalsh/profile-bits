import { describe, expect, it, vi } from "vitest";
import { githubDumpFromFixtures } from "../github-dump.fixture.js";
import { languagesViewModel } from "./view-model.js";

describe("languagesViewModel dump select", () => {
  it("applies limit, min_pct, and exclude in the widget against the dump", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = githubDumpFromFixtures();

    expect(languagesViewModel(dump).rows).toEqual([
      { name: "TypeScript", pct: 71.4 },
      { name: "Python", pct: 28.6 },
    ]);
    expect(
      languagesViewModel(dump, { exclude: ["Python"], limit: 8, min_pct: 1 })
        .rows,
    ).toEqual([{ name: "TypeScript", pct: 100 }]);
    expect(languagesViewModel(dump, { limit: 1 }).rows).toEqual([
      { name: "TypeScript", pct: 71.4 },
    ]);
    expect(languagesViewModel(dump, { min_pct: 50 }).rows).toEqual([
      { name: "TypeScript", pct: 71.4 },
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not fail parse when language nodes keep color and id", () => {
    const dump = githubDumpFromFixtures();
    const languages = dump.languages;
    expect(Array.isArray(languages)).toBe(true);
    expect(languages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "TypeScript",
          bytes: 1000,
          color: "#3178c6",
          id: "MDg6TGFuZ3VhZ2Ux",
        }),
      ]),
    );
    expect(() => languagesViewModel(dump)).not.toThrow();
  });
});
