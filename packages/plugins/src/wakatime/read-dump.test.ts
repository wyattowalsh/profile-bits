import { describe, expect, it } from "vitest";
import { readSummarySeries, sparklineValues } from "./read-dump.js";

describe("wakatime dump bits", () => {
  it("keeps a reported zero day and skips a day with no seconds", () => {
    expect(
      readSummarySeries({
        summaries: {
          data: [
            { grand_total: { total_seconds: 100 } },
            { grand_total: {} },
            { grand_total: { total_seconds: 0 } },
          ],
        },
      }),
    ).toEqual([100, 0]);
    expect(readSummarySeries({})).toBeUndefined();
  });

  it("leaves a week of days intact and averages a longer series into eight bars", () => {
    expect(sparklineValues([1, 2, 3, 4, 5, 6, 7])).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(
      sparklineValues([0, 0, 10, 10, 0, 0, 20, 20, 4, 6, 1, 1, 8, 8, 3, 3]),
    ).toEqual([0, 10, 0, 20, 5, 1, 8, 3]);
  });
});
