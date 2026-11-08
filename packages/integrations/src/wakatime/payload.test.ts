import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { selectCodingPayload, WakatimeStatsEnvelopeSchema } from "./payload.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as unknown;
}

function fullStatsEnvelope(): unknown {
  return {
    data: {
      total_seconds: 12345.67,
      human_readable_total: "3 hrs 25 mins",
      total_seconds_including_other_language: 13000,
      human_readable_total_including_other_language: "3 hrs 36 mins",
      daily_average: 1763.67,
      daily_average_including_other_language: 1857.14,
      human_readable_daily_average: "29 mins",
      human_readable_daily_average_including_other_language: "30 mins",
      is_up_to_date: true,
      best_day: {
        date: "2026-08-20",
        text: "2 hrs 10 mins",
        total_seconds: 7800,
      },
      range: "last_7_days",
      human_readable_range: "Last 7 Days",
      start: "2026-08-20T00:00:00Z",
      end: "2026-08-26T23:59:59Z",
      timezone: "America/Los_Angeles",
      categories: [
        {
          name: "Coding",
          total_seconds: 12000,
          percent: 97.2,
          text: "3 hrs 20 mins",
          digital: "3:20:00",
        },
      ],
      machines: [
        {
          name: "studio",
          machine_name_id: "machine-1",
          total_seconds: 12345.67,
          percent: 100,
          text: "3 hrs 25 mins",
          digital: "3:25:45",
        },
      ],
      dependencies: [
        {
          name: "zod",
          total_seconds: 400,
          percent: 3.2,
          text: "6 mins",
          digital: "0:06:40",
        },
      ],
      languages: [
        {
          name: "TypeScript",
          total_seconds: 8000,
          percent: 64.8,
          text: "2 hrs 13 mins",
          digital: "2:13:20",
        },
        {
          name: "Python",
          total_seconds: 3000,
          percent: 24.3,
          text: "50 mins",
          digital: "0:50:00",
        },
      ],
      editors: [
        {
          name: "VS Code",
          total_seconds: 10000,
          percent: 81,
          text: "2 hrs 46 mins",
          digital: "2:46:40",
        },
      ],
      projects: [
        {
          name: "profile-bits",
          total_seconds: 9000,
          percent: 72.9,
          text: "2 hrs 30 mins",
          digital: "2:30:00",
        },
      ],
      operating_systems: [
        {
          name: "Mac",
          total_seconds: 11000,
          percent: 89.1,
          text: "3 hrs 3 mins",
          digital: "3:03:20",
        },
      ],
    },
  };
}

describe("WakatimeStatsEnvelopeSchema", () => {
  it("keeps fixture percent and text on every include slice", () => {
    const envelope = WakatimeStatsEnvelopeSchema.parse(
      loadFixture("last_7_days.json"),
    );

    expect(envelope.data.languages?.map((row) => row.percent)).toEqual([
      64.8, 24.3, 10.9,
    ]);
    expect(envelope.data.languages?.map((row) => row.text)).toEqual([
      "2 hrs 13 mins",
      "50 mins",
      "22 mins",
    ]);
    expect(envelope.data.editors?.[0]).toMatchObject({
      percent: 81,
      text: "2 hrs 46 mins",
    });
    expect(envelope.data.projects?.[0]).toMatchObject({
      percent: 72.9,
      text: "2 hrs 30 mins",
    });
    expect(envelope.data.operating_systems?.[0]).toMatchObject({
      percent: 89.1,
      text: "3 hrs 3 mins",
    });
  });

  it("keeps best_day, categories, machines, dependencies, range, and digital", () => {
    const envelope = WakatimeStatsEnvelopeSchema.parse(fullStatsEnvelope());
    const { data } = envelope;

    expect(data.best_day).toEqual({
      date: "2026-08-20",
      text: "2 hrs 10 mins",
      total_seconds: 7800,
    });
    expect(data.categories?.[0]).toMatchObject({
      name: "Coding",
      percent: 97.2,
      text: "3 hrs 20 mins",
      digital: "3:20:00",
    });
    expect(data.machines?.[0]).toMatchObject({
      name: "studio",
      machine_name_id: "machine-1",
      percent: 100,
      text: "3 hrs 25 mins",
      digital: "3:25:45",
    });
    expect(data.dependencies?.[0]).toMatchObject({
      name: "zod",
      percent: 3.2,
      text: "6 mins",
      digital: "0:06:40",
    });
    expect(data.range).toBe("last_7_days");
    expect(data.human_readable_range).toBe("Last 7 Days");
    expect(data.start).toBe("2026-08-20T00:00:00Z");
    expect(data.end).toBe("2026-08-26T23:59:59Z");
    expect(data.timezone).toBe("America/Los_Angeles");
    expect(data.daily_average).toBe(1763.67);
    expect(data.human_readable_daily_average).toBe("29 mins");
    expect(data.languages?.[0]?.digital).toBe("2:13:20");
  });

  it("does not invent missing dump keys or keep email or api_key", () => {
    const envelope = WakatimeStatsEnvelopeSchema.parse({
      data: {
        total_seconds: 10,
        human_readable_total: "10 secs",
        email: "user@example.com",
        api_key: "waka_secret",
        key: "waka_secret",
      },
    });

    expect(envelope.data).not.toHaveProperty("email");
    expect(envelope.data).not.toHaveProperty("api_key");
    expect(envelope.data).not.toHaveProperty("key");
    expect(envelope.data).not.toHaveProperty("best_day");
    expect(envelope.data).not.toHaveProperty("categories");
    expect(envelope.data).not.toHaveProperty("machines");
    expect(envelope.data).not.toHaveProperty("dependencies");
    expect(envelope.data).not.toHaveProperty("os");
    expect(envelope.data.total_seconds).toBe(10);
  });
});

describe("selectCodingPayload", () => {
  it("keeps languages and editors and omits projects/os", () => {
    const envelope = WakatimeStatsEnvelopeSchema.parse(
      loadFixture("last_7_days.json"),
    );
    const payload = selectCodingPayload(
      envelope.data,
      ["languages", "editors"],
      8,
    );

    expect(payload.total_seconds).toBe(12345.67);
    expect(payload.human_readable_total).toBe("3 hrs 25 mins");
    expect(payload.languages?.map((row) => row.name)).toEqual([
      "TypeScript",
      "Python",
      "Go",
    ]);
    expect(payload.editors?.map((row) => row.name)).toEqual([
      "VS Code",
      "Neovim",
    ]);
    expect(payload.languages?.[0]).toMatchObject({
      percent: 64.8,
      text: "2 hrs 13 mins",
    });
    expect(payload).not.toHaveProperty("projects");
    expect(payload).not.toHaveProperty("os");
  });

  it("maps os from operating_systems and never invents omitted zeros", () => {
    const envelope = WakatimeStatsEnvelopeSchema.parse(
      loadFixture("last_7_days.json"),
    );
    const payload = selectCodingPayload(envelope.data, ["os"], 1);

    expect(payload.os?.map((row) => row.name)).toEqual(["Mac"]);
    expect(payload).not.toHaveProperty("languages");
    expect(payload).not.toHaveProperty("editors");
    expect(payload).not.toHaveProperty("projects");
  });

  it("omits a requested key when the API slice is missing", () => {
    const payload = selectCodingPayload(
      {
        total_seconds: 10,
        human_readable_total: "10 secs",
      },
      ["languages", "editors"],
      8,
    );
    expect(payload).not.toHaveProperty("languages");
    expect(payload).not.toHaveProperty("editors");
    expect(payload.total_seconds).toBe(10);
  });
});
