import { describe, expect, it, vi } from "vitest";
import {
  isEmptyJsonResult,
  JsonWidgetError,
  jsonTemplate,
  NO_JSON_DATA,
  renderJsonFromPayload,
  renderJsonSvg,
  searchJson,
} from "./index.js";

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

describe("json widget", () => {
  it("renders a fixture object without fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderJsonFromPayload({
      payload: { name: "octocat", count: 3 },
      jmespath: "@",
      url: "https://example.com/api.json",
    });
    assertBakedStillSvg(svg);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders primitive and array fixtures", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const primitive = await renderJsonFromPayload({
      payload: 42,
      jmespath: "@",
    });
    const array = await renderJsonFromPayload({
      payload: ["a", "b", "c"],
      jmespath: "@",
    });
    assertBakedStillSvg(primitive);
    assertBakedStillSvg(array);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders No data for empty successful jmespath", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(jsonTemplate({ empty: true, value: null })).toMatchObject({
      type: "container",
      children: expect.arrayContaining([
        expect.objectContaining({ type: "text", text: NO_JSON_DATA }),
      ]),
    });
    for (const payload of [null, "", [], {}]) {
      expect(isEmptyJsonResult(searchJson(payload, "@"))).toBe(true);
      const svg = await renderJsonFromPayload({ payload, jmespath: "@" });
      assertBakedStillSvg(svg);
    }
    expect(isEmptyJsonResult(searchJson({ a: 1 }, "missing"))).toBe(true);
    const missing = await renderJsonFromPayload({
      payload: { a: 1 },
      jmespath: "missing",
    });
    assertBakedStillSvg(missing);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders 0 and false", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(isEmptyJsonResult(0)).toBe(false);
    expect(isEmptyJsonResult(false)).toBe(false);
    const zero = await renderJsonSvg({ value: 0 });
    const bool = await renderJsonSvg({ value: false });
    assertBakedStillSvg(zero);
    assertBakedStillSvg(bool);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("fails the widget on invalid jmespath", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      renderJsonFromPayload({ payload: { a: 1 }, jmespath: "[" }),
    ).rejects.toBeInstanceOf(JsonWidgetError);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
