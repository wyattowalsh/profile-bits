import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  type WakatimeSliceItem,
  type WakatimeStatsData,
  WakatimeStatsEnvelopeSchema,
} from "./payload.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

const SLICE_KEYS = [
  "languages",
  "editors",
  "projects",
  "operating_systems",
  "categories",
  "machines",
  "dependencies",
] as const satisfies ReadonlyArray<keyof WakatimeStatsData>;

function loadRaw(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

function loadFixture(name: string): unknown {
  return JSON.parse(loadRaw(name)) as unknown;
}

function sliceRows(
  data: WakatimeStatsData,
  key: (typeof SLICE_KEYS)[number],
): WakatimeSliceItem[] {
  return data[key] ?? [];
}

describe("wakatime stats fixtures", () => {
  it("keeps percent and text on every last_7_days dump slice after parse", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const raw = loadFixture("last_7_days.json");
    const envelope = WakatimeStatsEnvelopeSchema.parse(raw);
    const { data } = envelope;

    for (const key of SLICE_KEYS) {
      const rows = sliceRows(data, key);
      expect(rows.length, key).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.percent, `${key}:${row.name}:percent`).toEqual(
          expect.any(Number),
        );
        expect(row.text, `${key}:${row.name}:text`).toEqual(expect.any(String));
        expect(row.text?.length, `${key}:${row.name}:text`).toBeGreaterThan(0);
        expect(row.digital, `${key}:${row.name}:digital`).toEqual(
          expect.any(String),
        );
      }
    }

    expect(data.languages?.map((row) => row.percent)).toEqual([
      64.8, 24.3, 10.9,
    ]);
    expect(data.languages?.map((row) => row.text)).toEqual([
      "2 hrs 13 mins",
      "50 mins",
      "22 mins",
    ]);
    expect(data.languages?.[0]).toMatchObject({
      name: "TypeScript",
      percent: 64.8,
      text: "2 hrs 13 mins",
      digital: "2:13:20",
    });
    expect(data.editors?.[0]).toMatchObject({
      percent: 81,
      text: "2 hrs 46 mins",
    });
    expect(data.projects?.[0]).toMatchObject({
      percent: 72.9,
      text: "2 hrs 30 mins",
    });
    expect(data.operating_systems?.[0]).toMatchObject({
      percent: 89.1,
      text: "3 hrs 3 mins",
    });
    expect(data.categories?.[0]).toMatchObject({
      name: "Coding",
      percent: 97.2,
      text: "3 hrs 20 mins",
      digital: "3:20:00",
    });
    expect(data.machines?.[0]).toMatchObject({
      name: "studio",
      percent: 100,
      text: "3 hrs 25 mins",
    });
    expect(data.dependencies?.[0]).toMatchObject({
      name: "zod",
      percent: 3.2,
      text: "6 mins",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps best_day, daily averages, range metadata, and unrequested slices", () => {
    const envelope = WakatimeStatsEnvelopeSchema.parse(
      loadFixture("last_7_days.json"),
    );
    const { data } = envelope;

    expect(data.best_day).toEqual({
      date: "2026-08-20",
      text: "2 hrs 10 mins",
      total_seconds: 7800,
    });
    expect(data.daily_average).toBe(1763.67);
    expect(data.human_readable_daily_average).toBe("29 mins");
    expect(data.range).toBe("last_7_days");
    expect(data.human_readable_range).toBe("Last 7 Days");
    expect(data.start).toBe("2026-08-20T00:00:00Z");
    expect(data.end).toBe("2026-08-26T23:59:59Z");
    expect(data.timezone).toBe("America/Los_Angeles");
    expect(data.editors).toHaveLength(2);
    expect(data.projects).toHaveLength(2);
    expect(data.operating_systems).toHaveLength(2);
    expect(data.languages).toHaveLength(3);
    expect(data).not.toHaveProperty("os");
  });

  it("does not put email, api_key, or query keys in last_7_days.json", () => {
    const text = loadRaw("last_7_days.json");
    const envelope = WakatimeStatsEnvelopeSchema.parse(JSON.parse(text));

    expect(text).not.toMatch(/api_key|\?key=|Bearer |waka_/);
    expect(text).not.toContain("@");
    expect(envelope.data).not.toHaveProperty("email");
    expect(envelope.data).not.toHaveProperty("api_key");
    expect(envelope.data).not.toHaveProperty("key");
    expect(envelope.data).not.toHaveProperty("username");
  });

  it("parses empty.json without inventing dump slices or percent rows", () => {
    const envelope = WakatimeStatsEnvelopeSchema.parse(
      loadFixture("empty.json"),
    );
    const { data } = envelope;

    expect(data.total_seconds).toBe(0);
    expect(data.languages).toEqual([]);
    expect(data.editors).toEqual([]);
    expect(data.projects).toEqual([]);
    expect(data.operating_systems).toEqual([]);
    expect(data).not.toHaveProperty("best_day");
    expect(data).not.toHaveProperty("categories");
    expect(data).not.toHaveProperty("machines");
    expect(data).not.toHaveProperty("dependencies");
    expect(data).not.toHaveProperty("email");
    expect(data).not.toHaveProperty("api_key");
  });
});
