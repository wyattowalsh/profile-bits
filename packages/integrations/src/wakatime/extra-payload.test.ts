import { describe, expect, it } from "vitest";
import {
  omitWakatimeSecrets,
  parseAllTimeSinceToday,
  parseGoals,
  parseStatusbarToday,
  parseSummaries,
} from "./extra-payload.js";

describe("omitWakatimeSecrets", () => {
  it("drops email, api_key, subscribers, and shared_with", () => {
    const cleaned = omitWakatimeSecrets({
      title: "Code 1h",
      email: "user@example.com",
      api_key: "waka_secret",
      owner: { display_name: "Ada", email: "ada@example.com" },
      subscribers: [{ email: "other@example.com" }],
      shared_with: [{ email: "peer@example.com" }],
    });

    expect(cleaned).toEqual({
      title: "Code 1h",
      owner: { display_name: "Ada" },
    });
    expect(JSON.stringify(cleaned)).not.toContain("@");
    expect(JSON.stringify(cleaned)).not.toContain("waka_secret");
  });
});

describe("parseAllTimeSinceToday", () => {
  it("keeps totals and range dates and drops email", () => {
    const parsed = parseAllTimeSinceToday({
      data: {
        total_seconds: 3600,
        text: "1 hr",
        digital: "1:00",
        email: "user@example.com",
        api_key: "waka_secret",
        range: {
          start_date: "2013-01-01",
          end_date: "2026-08-27",
          timezone: "UTC",
        },
      },
    });

    expect(parsed).toMatchObject({
      total_seconds: 3600,
      text: "1 hr",
      digital: "1:00",
      range: { start_date: "2013-01-01", end_date: "2026-08-27" },
    });
    expect(parsed).not.toHaveProperty("email");
    expect(parsed).not.toHaveProperty("api_key");
  });

  it("omits a stats envelope that is not all_time_since_today", () => {
    expect(
      parseAllTimeSinceToday({
        data: {
          total_seconds: 10,
          human_readable_total: "10 secs",
          range: "last_7_days",
        },
      }),
    ).toBeUndefined();
  });
});

describe("parseSummaries", () => {
  it("keeps bounded start/end and per-day slices", () => {
    const parsed = parseSummaries({
      data: [
        {
          grand_total: { total_seconds: 100, text: "1 min 40 secs" },
          languages: [
            {
              name: "TypeScript",
              total_seconds: 100,
              percent: 100,
              text: "1 min 40 secs",
            },
          ],
          range: { date: "2026-08-20" },
        },
      ],
      start: "2026-08-20",
      end: "2026-08-26",
      email: "user@example.com",
    });

    expect(parsed?.start).toBe("2026-08-20");
    expect(parsed?.end).toBe("2026-08-26");
    expect(parsed?.data[0]?.languages?.[0]?.percent).toBe(100);
    expect(parsed).not.toHaveProperty("email");
  });

  it("omits a stats object payload", () => {
    expect(
      parseSummaries({
        data: { total_seconds: 1, human_readable_total: "1 sec" },
      }),
    ).toBeUndefined();
  });
});

describe("parseStatusbarToday", () => {
  it("requires grand_total so a stats envelope is omitted", () => {
    expect(
      parseStatusbarToday({
        data: {
          total_seconds: 1,
          human_readable_total: "1 sec",
          range: "last_7_days",
          categories: [],
        },
      }),
    ).toBeUndefined();
  });

  it("keeps today's grand_total", () => {
    const parsed = parseStatusbarToday({
      data: {
        grand_total: { total_seconds: 50, text: "50 secs", digital: "0:00:50" },
        languages: [
          { name: "Go", total_seconds: 50, percent: 100, text: "50 secs" },
        ],
        email: "user@example.com",
        range: { date: "2026-08-27", text: "Today", timezone: "UTC" },
      },
    });
    expect(parsed?.grand_total.total_seconds).toBe(50);
    expect(parsed).not.toHaveProperty("email");
  });
});

describe("parseGoals", () => {
  it("keeps goal title and drops owner email plus subscribers", () => {
    const parsed = parseGoals({
      data: [
        {
          id: "goal-1",
          title: "Code 1h/day",
          status: "success",
          seconds: 3600,
          email: "user@example.com",
          owner: { display_name: "Ada", email: "ada@example.com" },
          subscribers: [{ email: "other@example.com" }],
          shared_with: [{ email: "peer@example.com" }],
        },
      ],
    });

    expect(parsed).toEqual([
      {
        id: "goal-1",
        title: "Code 1h/day",
        status: "success",
        seconds: 3600,
      },
    ]);
    expect(JSON.stringify(parsed)).not.toContain("@");
    expect(parsed?.[0]).not.toHaveProperty("email");
    expect(parsed?.[0]).not.toHaveProperty("owner");
    expect(parsed?.[0]).not.toHaveProperty("subscribers");
  });
});
