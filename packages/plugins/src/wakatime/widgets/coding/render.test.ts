import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  selectCodingPayload,
  WakatimeStatsEnvelopeSchema,
} from "@profile-bits/integrations";
import { describe, expect, it, vi } from "vitest";
import { renderCodingSvg } from "./render.js";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../integrations/src/wakatime/fixtures",
);

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as unknown;
}

describe("renderCodingSvg", () => {
  it("emits a 480×160 baked-still svg for last_7_days", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const envelope = WakatimeStatsEnvelopeSchema.parse(
      loadFixture("last_7_days.json"),
    );
    const payload = selectCodingPayload(
      envelope.data,
      ["languages", "editors"],
      8,
    );
    const svg = await renderCodingSvg({
      payload,
      include: ["languages", "editors"],
      limit: 8,
    });
    expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
    expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
    expect(svg).toMatch(/<svg\b[^>]*\bviewBox="0 0 480 160"/);
    expect(svg).not.toMatch(/<text[\s>]/i);
    expect(svg).not.toMatch(/<style[\s>]/i);
    expect(svg).not.toContain("@keyframes");
    expect(svg).not.toMatch(/<(animate|animateTransform|animateMotion|set)\b/i);
    expect(svg).not.toMatch(/<foreignObject[\s>]/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not throw on the empty-state card", async () => {
    const envelope = WakatimeStatsEnvelopeSchema.parse(
      loadFixture("empty.json"),
    );
    const payload = selectCodingPayload(
      envelope.data,
      ["languages", "editors"],
      8,
    );
    await expect(
      renderCodingSvg({
        payload,
        include: ["languages", "editors"],
        limit: 8,
      }),
    ).resolves.toMatch(/<svg\b/);
  });
});
