import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  selectCodingPayload,
  WakatimeStatsEnvelopeSchema,
} from "@profile-bits/integrations";
import { describe, expect, it } from "vitest";
import { NO_CODING_DATA, toCodingViewModel } from "./view-model.js";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../integrations/src/wakatime/fixtures",
);

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as unknown;
}

describe("toCodingViewModel", () => {
  it("exposes languages and editors from last_7_days and omits projects/os", () => {
    const envelope = WakatimeStatsEnvelopeSchema.parse(
      loadFixture("last_7_days.json"),
    );
    const payload = selectCodingPayload(
      envelope.data,
      ["languages", "editors"],
      8,
    );
    const model = toCodingViewModel(payload, ["languages", "editors"], 8);

    expect(model.empty).toBe(false);
    expect(model.slices.map((slice) => slice.key)).toEqual([
      "languages",
      "editors",
    ]);
    expect(model.slices.some((slice) => slice.key === "projects")).toBe(false);
    expect(model.slices.some((slice) => slice.key === "os")).toBe(false);
    expect(payload).not.toHaveProperty("projects");
    expect(payload).not.toHaveProperty("os");
  });

  it("renders No coding data for empty payload slices", () => {
    const envelope = WakatimeStatsEnvelopeSchema.parse(
      loadFixture("empty.json"),
    );
    const payload = selectCodingPayload(
      envelope.data,
      ["languages", "editors"],
      8,
    );
    const model = toCodingViewModel(payload, ["languages", "editors"], 8);
    expect(model.empty).toBe(true);
    expect(model.totalText).toBe(NO_CODING_DATA);
    expect(model.slices).toEqual([]);
  });

  it("does not invent zeros for omitted include keys", () => {
    const model = toCodingViewModel(
      {
        total_seconds: 10,
        human_readable_total: "10 secs",
        languages: [{ name: "TypeScript", total_seconds: 10 }],
      },
      ["languages", "editors"],
      8,
    );
    expect(model.slices.map((slice) => slice.key)).toEqual(["languages"]);
    expect(
      model.slices.find((slice) => slice.key === "editors"),
    ).toBeUndefined();
  });
});
