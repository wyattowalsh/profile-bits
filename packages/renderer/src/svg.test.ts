import { container, text } from "@takumi-rs/helpers";
import { describe, expect, it } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH } from "./fonts.js";
import { renderSvg } from "./render-svg.js";

function fixtureCard(copy: string) {
  return container({
    style: {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      backgroundColor: "#0d1117",
      color: "#e6edf3",
      fontFamily: "Geist",
      fontSize: 16,
      padding: 16,
    },
    children: [text(copy)],
  });
}

describe("renderSvg", () => {
  it("emits a baked still 480×160 SVG without CSS/SMIL/foreignObject", async () => {
    const svg = await renderSvg(fixtureCard("No feed items"));

    expect(svg).toMatch(/<svg\b/i);
    expect(svg).toMatch(new RegExp(`\\b${CARD_WIDTH}\\b`));
    expect(svg).toMatch(new RegExp(`\\b${CARD_HEIGHT}\\b`));
    expect(svg).not.toMatch(/<style[\s>]/i);
    expect(svg).not.toMatch(/@keyframes/i);
    expect(svg).not.toMatch(/<(animate|animateTransform|animateMotion|set)\b/i);
    expect(svg).not.toMatch(/<foreignObject\b/i);
  });

  it("reuses the registered renderer across calls", async () => {
    const first = await renderSvg(fixtureCard("Hello"));
    const second = await renderSvg(fixtureCard("Hello"));
    expect(first).toMatch(/<svg\b/i);
    expect(second).toMatch(/<svg\b/i);
  });
});
