import { describe, expect, it, vi } from "vitest";
import { githubDumpFromFixtures } from "../github-dump.fixture.js";
import { dumpCalendar } from "../select-dump.js";
import {
  CONTRIBUTIONS_MAX_WEEKS,
  contributionStreaks,
  contributionsViewModel,
} from "./view-model.js";
import { NO_CONTRIBUTION_DATA } from "./widget.js";

describe("contributionsViewModel dump select", () => {
  it("selects calendar weeks, total, and streaks without HTTP", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = githubDumpFromFixtures();
    const model = contributionsViewModel(dump);
    const calendar = dumpCalendar(dump);

    expect(calendar?.totalContributions).toBe(1600);
    expect(calendar?.weeks).toHaveLength(2);
    expect(model.empty).toBe(false);
    expect(model.login).toBe("octocat");
    expect(model.weeks).toEqual([
      {
        days: [
          { date: "2026-01-04", count: 3, weekday: 0 },
          { date: "2026-01-05", count: 1, weekday: 1 },
        ],
      },
      {
        days: [{ date: "2026-01-11", count: 0, weekday: 0 }],
      },
    ]);
    expect(model.chips).toEqual([
      { label: "Total", value: "1.6k" },
      { label: "Streak", value: "0" },
      { label: "Longest", value: "2" },
    ]);
    expect(CONTRIBUTIONS_MAX_WEEKS).toBe(53);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not invent 0 when the calendar dump is omitted", () => {
    expect(contributionsViewModel({}).empty).toBe(true);
    expect(contributionsViewModel({}).chips).toEqual([]);
    expect(contributionsViewModel({}).weeks).toEqual([]);
    expect(contributionsViewModel({ contributions: 1600 }).empty).toBe(true);
    expect(NO_CONTRIBUTION_DATA).toBe("No contribution data");
  });

  it("still parses when extra dump keys are present", () => {
    const dump = githubDumpFromFixtures({ heatmap: { weeks: 52 } });
    expect(() => contributionsViewModel(dump)).not.toThrow();
    expect(contributionsViewModel(dump).login).toBe("octocat");
    expect(contributionsViewModel(dump).empty).toBe(false);
  });

  it("slices to the last 53 weeks", () => {
    const weeks = Array.from({ length: 60 }, (_, week) => ({
      contributionDays: [
        {
          date: `2025-01-${String((week % 28) + 1).padStart(2, "0")}`,
          contributionCount: 1,
          weekday: 0,
        },
      ],
    }));
    const model = contributionsViewModel({
      user: { login: "octocat" },
      calendar: { totalContributions: 60, weeks },
    });
    expect(model.weeks).toHaveLength(53);
    expect(model.empty).toBe(false);
  });
});

describe("contributionStreaks", () => {
  it("counts current and longest streaks with date adjacency", () => {
    expect(
      contributionStreaks(
        [
          { date: "2026-01-04", count: 3 },
          { date: "2026-01-05", count: 1 },
          { date: "2026-01-11", count: 0 },
        ],
        "2026-01-11",
      ),
    ).toEqual({ current: 0, longest: 2 });
    expect(
      contributionStreaks(
        [
          { date: "2026-01-04", count: 1 },
          { date: "2026-01-05", count: 2 },
          { date: "2026-01-06", count: 3 },
        ],
        "2026-01-06",
      ),
    ).toEqual({ current: 3, longest: 3 });
    expect(
      contributionStreaks(
        [
          { date: "2026-01-04", count: 1 },
          { date: "2026-01-11", count: 1 },
        ],
        "2026-01-11",
      ),
    ).toEqual({ current: 1, longest: 1 });
    expect(
      contributionStreaks(
        [
          { date: "2026-01-04", count: 1 },
          { date: "2026-01-05", count: 1 },
          { date: "2026-01-06", count: 0 },
        ],
        "2026-01-05",
      ),
    ).toEqual({ current: 2, longest: 2 });
  });
});
