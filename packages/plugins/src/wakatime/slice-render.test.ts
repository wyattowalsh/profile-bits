import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type WakatimeStatsData,
  WakatimeStatsEnvelopeSchema,
} from "@profile-bits/integrations";
import { resolveTheme, THEME_REGISTRY } from "@profile-bits/themes";
import { describe, expect, it, vi } from "vitest";
import { toSliceViewModel, WAKATIME_SLICE_WIDGET_IDS } from "./slice.js";
import { renderSliceSvg } from "./slice-render.js";
import { renderEditorsSvg } from "./widgets/editors/render.js";
import { renderLangsSvg } from "./widgets/langs/render.js";
import { renderOsSvg } from "./widgets/os/render.js";
import { renderProjectsSvg } from "./widgets/projects/render.js";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../integrations/src/wakatime/fixtures",
);

function loadDump(name: string): WakatimeStatsData {
  return WakatimeStatsEnvelopeSchema.parse(
    JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as unknown,
  ).data;
}

function assertBakedStillSvg(svg: string): void {
  expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
  expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
  expect(svg).toMatch(/<svg\b[^>]*\bviewBox="0 0 480 160"/);
  expect(svg).not.toMatch(/<text[\s>]/i);
  expect(svg).not.toMatch(/<style[\s>]/i);
  expect(svg).not.toContain("@keyframes");
  expect(svg).not.toMatch(/<(animate|animateTransform|animateMotion|set)\b/i);
  expect(svg).not.toMatch(/<foreignObject[\s>]/i);
}

describe("wakatime slice render", () => {
  it.each([...WAKATIME_SLICE_WIDGET_IDS])(
    "emits a 480×160 baked-still svg for %s without HTTP",
    async (id) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const dump = loadDump("last_7_days.json");
      const svg = await renderSliceSvg({ payload: dump, id, limit: 8 });
      assertBakedStillSvg(svg);
      expect(dump.editors).toHaveLength(2);
      expect(dump.projects).toHaveLength(2);
      expect(dump.operating_systems).toHaveLength(2);
      expect(dump.languages).toHaveLength(3);
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    },
  );

  it("named renderers share the unsliced dump and apply widget-side limit", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = loadDump("last_7_days.json");
    const editors = dump.editors;
    const [editorsSvg, projectsSvg, osSvg, langsSvg] = await Promise.all([
      renderEditorsSvg({ payload: dump, options: { limit: 1 } }),
      renderProjectsSvg({ payload: dump, options: { limit: 1 } }),
      renderOsSvg({ payload: dump, options: { limit: 1 } }),
      renderLangsSvg({ payload: dump, options: { limit: 1 } }),
    ]);

    expect(toSliceViewModel(dump, "editors", 1).rows).toHaveLength(1);
    expect(toSliceViewModel(dump, "langs", 1).rows[0]?.name).toBe("TypeScript");
    expect(dump.editors).toBe(editors);
    expect(dump.editors).toHaveLength(2);
    expect(dump.languages).toHaveLength(3);
    for (const svg of [editorsSvg, projectsSvg, osSvg, langsSvg]) {
      assertBakedStillSvg(svg);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not throw on empty-state slice cards", async () => {
    const dump = loadDump("empty.json");
    await expect(renderEditorsSvg({ payload: dump })).resolves.toMatch(
      /<svg\b/,
    );
    await expect(renderLangsSvg({ payload: dump })).resolves.toMatch(/<svg\b/);
    expect(dump.editors).toEqual([]);
    expect(dump.languages).toEqual([]);
  });

  it("bakes mocha card hex instead of Primer dark", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = loadDump("last_7_days.json");
    const svg = await renderLangsSvg({
      payload: dump,
      theme: resolveTheme("catppuccin-mocha", THEME_REGISTRY),
    });
    expect(svg).toContain("#1e1e2e");
    expect(svg).not.toContain("#0d1117");
    expect(svg).not.toMatch(/<style\b|@keyframes|<animate\b|foreignObject/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
