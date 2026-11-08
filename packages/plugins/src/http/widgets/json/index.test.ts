import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { HttpClient } from "@profile-bits/integrations";
import { resolveTheme, THEME_REGISTRY } from "@profile-bits/themes";
import { describe, expect, it, vi } from "vitest";
import {
  isEmptyJsonResult,
  JsonWidgetError,
  jsonTemplate,
  loadJsonPayload,
  NO_JSON_DATA,
  readJsonDump,
  renderJsonFromClient,
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

  it("bakes mocha card hex instead of Primer dark", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderJsonFromPayload({
      payload: { name: "octocat", count: 3 },
      jmespath: "@",
      theme: resolveTheme("catppuccin-mocha", THEME_REGISTRY),
    });
    assertBakedStillSvg(svg);
    expect(svg).toContain("#181825");
    expect(svg).not.toContain("#0d1117");
    expect(svg).not.toMatch(/<style\b|@keyframes|<animate\b|foreignObject/i);
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
    const dump = { a: 1, extra: true };
    await expect(
      renderJsonFromPayload({ payload: dump, jmespath: "[" }),
    ).rejects.toBeInstanceOf(JsonWidgetError);
    expect(dump).toEqual({ a: 1, extra: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("applies jmespath on the cached dump and does not ask fetchJson to filter", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = {
      name: "octocat",
      extra: { nested: true },
      unused: 9,
      keep: 1,
    };
    const fetchJson = vi.fn<HttpClient["fetchJson"]>(async (request) => {
      expect(request).not.toHaveProperty("jmespath");
      expect(request.url).toBe("https://example.com/api.json");
      return dump;
    });
    const loaded = await loadJsonPayload(
      { fetchJson },
      { url: "https://example.com/api.json" },
    );
    expect(loaded).toBe(dump);
    expect(readJsonDump(dump, "name")).toBe("octocat");
    expect(dump).toEqual({
      name: "octocat",
      extra: { nested: true },
      unused: 9,
      keep: 1,
    });
    const svg = await renderJsonFromClient(
      { fetchJson },
      { url: "https://example.com/api.json", jmespath: "name" },
    );
    assertBakedStillSvg(svg);
    expect(fetchJson).toHaveBeenCalledTimes(2);
    for (const [request] of fetchJson.mock.calls) {
      expect(request).not.toHaveProperty("jmespath");
    }
    expect(dump.extra).toEqual({ nested: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps jmespath as a widget reader in source", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const indexSource = readFileSync(join(here, "index.ts"), "utf8");
    const jmesSource = readFileSync(join(here, "jmes.ts"), "utf8");
    const loadFn = indexSource.slice(
      indexSource.indexOf("export async function loadJsonPayload"),
      indexSource.indexOf("export async function renderJsonFromClient"),
    );
    expect(loadFn).toContain("client.fetchJson");
    expect(loadFn).not.toMatch(/\bjmespath\b/i);
    expect(indexSource).toContain(
      "readJsonDump(input.payload, input.jmespath)",
    );
    expect(jmesSource).toContain("Widget-side JMESPath");
    expect(indexSource).not.toContain("normalizeBadgeJson");
    expect(indexSource).not.toMatch(/plugin_[a-z]+_[a-z]+_/);
    expect(indexSource).not.toMatch(/\bplaywright\b/i);
    expect(jmesSource).not.toMatch(/\bplaywright\b/i);
  });
});
