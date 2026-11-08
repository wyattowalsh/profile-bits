import { describe, expect, it, vi } from "vitest";
import { githubDumpFromFixtures } from "../github-dump.fixture.js";
import { renderLanguagesSvg } from "./render.js";
import { languagesViewModel } from "./view-model.js";
import { NO_LANGUAGE_DATA } from "./widget.js";

describe("languages widget", () => {
  it("byte-weights and excludes names", () => {
    const { rows } = languagesViewModel(
      {
        languages: [
          { name: "TypeScript", bytes: 80 },
          { name: "HTML", bytes: 20 },
          { name: "CSS", bytes: 1 },
        ],
      },
      { limit: 8, min_pct: 5, exclude: ["HTML"] },
    );
    expect(rows.map((row) => row.name)).toEqual(["TypeScript"]);
  });

  it("empty payload is an empty card, not a crash", () => {
    expect(languagesViewModel({ languages: [] }).rows).toEqual([]);
    expect(NO_LANGUAGE_DATA).toBe("No language data");
  });

  it("renders svg without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderLanguagesSvg({
      payload: { languages: [{ name: "TS", bytes: 10 }] },
    });
    expect(svg).toMatch(/<svg\b/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders a dump with extra language color/id keys without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderLanguagesSvg({
      payload: githubDumpFromFixtures(),
    });
    expect(svg).toMatch(/<svg\b/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
