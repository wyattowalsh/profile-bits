import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type WakatimeStatsData,
  WakatimeStatsEnvelopeSchema,
} from "@profile-bits/integrations";
import { describe, expect, it, vi } from "vitest";
import {
  SLICE_EMPTY_TEXT,
  SLICE_TITLE,
  toSliceViewModel,
  WAKATIME_SLICE_WIDGET_IDS,
} from "./slice.js";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../integrations/src/wakatime/fixtures",
);

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as unknown;
}

function loadDump(name: string): WakatimeStatsData {
  return WakatimeStatsEnvelopeSchema.parse(loadFixture(name)).data;
}

describe("toSliceViewModel", () => {
  it("uses globally unique slice ids, not stats or github languages", () => {
    expect([...WAKATIME_SLICE_WIDGET_IDS]).toEqual([
      "editors",
      "projects",
      "os",
      "langs",
    ]);
    expect(WAKATIME_SLICE_WIDGET_IDS).not.toContain("stats");
    expect(WAKATIME_SLICE_WIDGET_IDS).not.toContain("languages");
    expect(SLICE_TITLE.langs).toBe("Languages");
    expect(SLICE_EMPTY_TEXT.langs).toBe("No language data");
  });

  it("reads dump slices with percent and text and leaves the dump unsliced", () => {
    const dump = loadDump("last_7_days.json");
    const editors = dump.editors;
    const languages = dump.languages;
    const model = toSliceViewModel(dump, "editors", 8);

    expect(model.id).toBe("editors");
    expect(model.empty).toBe(false);
    expect(model.title).toBe("Editors");
    expect(model.rows.map((row) => row.name)).toEqual(["VS Code", "Neovim"]);
    expect(model.rows[0]).toEqual({
      name: "VS Code",
      totalSeconds: 10000,
      percent: 81,
      text: "2 hrs 46 mins",
    });
    expect(dump.editors).toBe(editors);
    expect(dump.languages).toBe(languages);
    expect(dump.editors).toHaveLength(2);
    expect(dump.languages).toHaveLength(3);
    expect(dump.projects).toHaveLength(2);
    expect(dump.operating_systems).toHaveLength(2);
  });

  it("maps langs from dump languages and os from operating_systems", () => {
    const dump = loadDump("last_7_days.json");
    const langs = toSliceViewModel(dump, "langs", 8);
    const os = toSliceViewModel(dump, "os", 8);
    const projects = toSliceViewModel(dump, "projects", 8);

    expect(langs.rows.map((row) => row.name)).toEqual([
      "TypeScript",
      "Python",
      "Go",
    ]);
    expect(langs.rows[0]?.percent).toBe(64.8);
    expect(langs.rows[0]?.text).toBe("2 hrs 13 mins");
    expect(os.rows.map((row) => row.name)).toEqual(["Mac", "Linux"]);
    expect(os.rows[0]?.percent).toBe(89.1);
    expect(projects.rows.map((row) => row.name)).toEqual([
      "profile-bits",
      "other",
    ]);
    expect(dump).not.toHaveProperty("os");
    expect(dump.operating_systems?.map((row) => row.name)).toEqual([
      "Mac",
      "Linux",
    ]);
    expect(dump.languages).toHaveLength(3);
  });

  it("caps rendered rows with limit and does not truncate the dump", () => {
    const dump = loadDump("last_7_days.json");
    const model = toSliceViewModel(dump, "langs", 1);

    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]?.name).toBe("TypeScript");
    expect(dump.languages).toHaveLength(3);
    expect(dump.languages?.map((row) => row.name)).toEqual([
      "TypeScript",
      "Python",
      "Go",
    ]);
  });

  it("sorts rows by total_seconds without mutating dump order", () => {
    const dump: WakatimeStatsData = {
      total_seconds: 35,
      human_readable_total: "35 secs",
      languages: [
        { name: "Go", total_seconds: 5, percent: 14.3, text: "5 secs" },
        {
          name: "TypeScript",
          total_seconds: 20,
          percent: 57.1,
          text: "20 secs",
        },
        { name: "Python", total_seconds: 10, percent: 28.6, text: "10 secs" },
      ],
    };
    const model = toSliceViewModel(dump, "langs", 8);

    expect(model.rows.map((row) => row.name)).toEqual([
      "TypeScript",
      "Python",
      "Go",
    ]);
    expect(dump.languages?.map((row) => row.name)).toEqual([
      "Go",
      "TypeScript",
      "Python",
    ]);
  });

  it("renders empty copy when the dump slice is missing or empty", () => {
    const empty = loadDump("empty.json");
    expect(toSliceViewModel(empty, "editors", 8)).toEqual({
      id: "editors",
      title: "Editors",
      empty: true,
      emptyText: "No editor data",
      rows: [],
    });
    expect(toSliceViewModel(empty, "langs", 8).emptyText).toBe(
      "No language data",
    );
    expect(empty.editors).toEqual([]);
    expect(empty.languages).toEqual([]);

    const omitted: WakatimeStatsData = {
      total_seconds: 10,
      human_readable_total: "10 secs",
      languages: [{ name: "TypeScript", total_seconds: 10 }],
    };
    const editors = toSliceViewModel(omitted, "editors", 8);
    expect(editors.empty).toBe(true);
    expect(editors.rows).toEqual([]);
    expect(omitted).not.toHaveProperty("editors");
  });

  it("derives percent from total_seconds when the dump row omits percent", () => {
    const dump: WakatimeStatsData = {
      total_seconds: 30,
      human_readable_total: "30 secs",
      editors: [
        { name: "Vim", total_seconds: 10 },
        { name: "Emacs", total_seconds: 20 },
      ],
    };
    const model = toSliceViewModel(dump, "editors", 8);
    expect(
      model.rows.map((row) => ({ name: row.name, percent: row.percent })),
    ).toEqual([
      { name: "Emacs", percent: 66.7 },
      { name: "Vim", percent: 33.3 },
    ]);
  });

  it("does not perform HTTP", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = loadDump("last_7_days.json");
    toSliceViewModel(dump, "projects", 8);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
