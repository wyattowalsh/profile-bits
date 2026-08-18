import { container, percentage, text } from "@takumi-rs/helpers";
import { describe, expect, it } from "vitest";
import { renderSvg } from "./index.js";

describe("renderSvg", () => {
  it("emits a 480×160 baked-still svg opening tag", async () => {
    const svg = await renderSvg(
      container({
        style: {
          width: percentage(100),
          height: percentage(100),
          display: "flex",
          alignItems: "center",
        },
        children: [text("profile-bits")],
      }),
    );

    expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
    expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
    expect(svg).toMatch(/<svg\b[^>]*\bviewBox="0 0 480 160"/);
    expect(svg).not.toMatch(/<text[\s>]/i);
    expect(svg).not.toMatch(/<style[\s>]/i);
    expect(svg).not.toContain("@keyframes");
    expect(svg).not.toMatch(/<(animate|animateTransform|animateMotion|set)\b/i);
    expect(svg).not.toMatch(/<foreignObject[\s>]/i);
  });
});
