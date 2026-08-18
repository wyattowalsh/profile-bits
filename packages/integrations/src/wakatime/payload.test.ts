import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { selectCodingPayload, WakatimeStatsEnvelopeSchema } from "./payload.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as unknown;
}

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
