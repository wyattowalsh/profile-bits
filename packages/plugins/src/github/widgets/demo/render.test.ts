import { describe, expect, it, vi } from "vitest";
import { githubDumpFromFixtures } from "../github-dump.fixture.js";
import { demoTextFromPayload, renderDemoSvg } from "./render.js";

describe("demo widget", () => {
  it("reads text from static fixture payload", () => {
    expect(demoTextFromPayload({ demo: { text: "hello" } })).toEqual({
      text: "hello",
    });
    expect(demoTextFromPayload({}, { text: "override" })).toEqual({
      text: "override",
    });
  });

  it("renders svg without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderDemoSvg({ text: "profile-bits", theme: "dark" });
    expect(svg).toMatch(/<svg\b/);
    expect(svg).toMatch(/width="480"/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("ignores extra github dump keys and stays static", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(demoTextFromPayload(githubDumpFromFixtures())).toEqual({
      text: "profile-bits",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
