import { describe, expect, it } from "vitest";
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
    const svg = await renderDemoSvg({ text: "profile-bits", theme: "dark" });
    expect(svg).toMatch(/<svg\b/);
    expect(svg).toMatch(/width="480"/);
  });
});
