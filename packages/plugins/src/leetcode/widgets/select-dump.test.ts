import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  solvedMeters,
  solvedRows,
  solvedSplit,
  submissionWeeks,
} from "./select-dump.js";
import { renderSolvedSvg } from "./solved/render.js";
import { NO_SOLVED, solvedViewModel } from "./solved/view-model.js";

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
    expect(solved).toContain("StackBar");
    expect(solved).not.toContain("Meter");
    expect(solved).not.toContain("fetch(");
    expect(heatmap).toContain("Heatmap");
    expect(heatmap).not.toContain("Board");
    expect(heatmap).not.toContain("Meter");
    expect(heatmap).not.toContain("fetch(");
  });

  it("pairs solved counts with question totals and a difficulty split", () => {
    const payload = {
      matchedUser: {
        submitStatsGlobal: {
          acSubmissionNum: [
            { difficulty: "All", count: 12, submissions: 20 },
            { difficulty: "Easy", count: 8, submissions: 10 },
            { difficulty: "Medium", count: 3, submissions: 7 },
            { difficulty: "Hard", count: 0, submissions: 1 },
          ],
        },
      },
      allQuestionsCount: [
        { difficulty: "All", count: 3000 },
        { difficulty: "Easy", count: 800 },
        { difficulty: "Medium", count: 1600 },
        { difficulty: "Hard", count: 600 },
        { difficulty: "Easy", count: 1 },
      ],
      unexpected: true,
    };
    expect(solvedMeters(payload)).toEqual([
      { label: "Easy / 800", value: 8, max: 800 },
      { label: "Medium / 1600", value: 3, max: 1600 },
      { label: "Hard / 600", value: 0, max: 600 },
    ]);
    expect(solvedSplit(payload)).toEqual([
      { label: "Easy", value: 8 },
      { label: "Medium", value: 3 },
    ]);
    expect(solvedViewModel(payload)).toMatchObject({
      empty: false,
      rows: [
        { label: "All", value: 12 },
        { label: "Easy", value: 8 },
        { label: "Medium", value: 3 },
        { label: "Hard", value: 0 },
      ],
    });
  });

  it("does not invent a ratio from submissions or a one-part split", () => {
    const countsOnly = {
      matchedUser: {
        submitStatsGlobal: {
          acSubmissionNum: [
            { difficulty: "All", count: 3, submissions: 5 },
            { difficulty: "Easy", count: 3, submissions: 5 },
          ],
        },
      },
    };
    expect(solvedMeters(countsOnly)).toEqual([]);
    expect(solvedSplit(countsOnly)).toEqual([]);
    expect(
      solvedMeters({
        matchedUser: {
          submitStatsGlobal: {
            acSubmissionNum: [{ difficulty: "Easy", count: 4, submissions: 9 }],
          },
        },
        allQuestionsCount: [{ difficulty: "Easy", count: 0 }],
      }),
    ).toEqual([]);
    expect(solvedViewModel({})).toEqual({
      empty: true,
      title: NO_SOLVED,
      rows: [],
      meters: [],
      split: [],
    });
  });

  it("reads question totals nested on matchedUser when the root key is absent", () => {
    expect(
      solvedMeters({
        matchedUser: {
          submitStatsGlobal: {
            acSubmissionNum: [
              { difficulty: "All", count: 12 },
              { difficulty: "Easy", count: 4 },
            ],
          },
          allQuestionsCount: [
            { difficulty: "All", count: 3000 },
            { difficulty: "Easy", count: 800 },
          ],
        },
      }),
    ).toEqual([{ label: "Easy / 800", value: 4, max: 800 }]);
  });

  it("renders solved ratios without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderSolvedSvg({
      payload: {
        matchedUser: {
          submitStatsGlobal: {
            acSubmissionNum: [
              { difficulty: "All", count: 12 },
              { difficulty: "Easy", count: 8 },
              { difficulty: "Medium", count: 4 },
              { difficulty: "Hard", count: 1 },
            ],
          },
        },
        allQuestionsCount: [
          { difficulty: "All", count: 3000 },
          { difficulty: "Easy", count: 800 },
          { difficulty: "Medium", count: 1600 },
          { difficulty: "Hard", count: 600 },
        ],
      },
    });
    expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
    expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
