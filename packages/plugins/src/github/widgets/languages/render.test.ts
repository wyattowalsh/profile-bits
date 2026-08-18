import { describe, expect, it } from "vitest";
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
    const svg = await renderLanguagesSvg({
      payload: { languages: [{ name: "TS", bytes: 10 }] },
    });
    expect(svg).toMatch(/<svg\b/);
  });
});
