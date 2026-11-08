import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { solvedRows, submissionWeeks } from "./select-dump.js";

const WIDGETS = join(dirname(fileURLToPath(import.meta.url)), ".");

describe("leetcode select-dump", () => {
  it("reads solved counts and a string submissionCalendar", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const payload = {
      matchedUser: {
        submitStatsGlobal: {
          acSubmissionNum: [
            { difficulty: "All", count: 3, submissions: 5 },
            { difficulty: "Hard" },
          ],
        },
      },
      userCalendar: {
        submissionCalendar: JSON.stringify({ "1700000000": 2 }),
        extra: "kept",
      },
      unexpected: 1,
    };
    expect(solvedRows(payload)).toEqual([{ label: "All", value: 3 }]);
    expect(submissionWeeks(payload)).toHaveLength(1);
    expect(submissionWeeks(payload)[0]?.days[0]?.count).toBe(2);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("reads an object calendar and omits zero counts", () => {
    const weeks = submissionWeeks({
      userCalendar: {
        submissionCalendar: { "1700000000": 0, "1700086400": 4 },
      },
    });
    expect(weeks).toHaveLength(1);
    expect(weeks[0]?.days).toHaveLength(1);
    expect(weeks[0]?.days[0]?.count).toBe(4);
  });

  it("widget sources do not fetch", () => {
    const solved = readFileSync(join(WIDGETS, "solved/widget.tsx"), "utf8");
    const heatmap = readFileSync(join(WIDGETS, "heatmap/widget.tsx"), "utf8");
    expect(solved).toContain("Stat");
    expect(solved).not.toContain("fetch(");
    expect(heatmap).toContain("Heatmap");
    expect(heatmap).not.toContain("Board");
    expect(heatmap).not.toContain("fetch(");
  });
});
