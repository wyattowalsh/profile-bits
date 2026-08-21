import { describe, expect, it, vi } from "vitest";
import { CLI_SMOKE_NODE, renderCli } from "./cli.js";

vi.mock("./render-svg.js", () => ({
  renderSvg: vi.fn(
    async () =>
      '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160" viewBox="0 0 480 160"></svg>',
  ),
}));

vi.mock("./render.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./render.js")>();
  return {
    ...original,
    render: vi.fn(async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47])),
  };
});

describe("renderCli", () => {
  it("returns svg without foreignObject", async () => {
    const svg = await renderCli("svg", CLI_SMOKE_NODE);
    expect(typeof svg).toBe("string");
    expect(svg).toMatch(/<svg\b/);
    expect(svg).not.toMatch(/<foreignObject\b/i);
  });

  it("returns png bytes", async () => {
    const png = await renderCli("png", CLI_SMOKE_NODE);
    expect(png).toBeInstanceOf(Uint8Array);
    expect((png as Uint8Array)[0]).toBe(0x89);
  });

  it("rejects unknown formats", async () => {
    await expect(renderCli("gif")).rejects.toBeInstanceOf(TypeError);
  });
});
