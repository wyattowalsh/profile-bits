import { describe, expect, it } from "vitest";
import { resolveChipColor, SHIELDS_NAMED_COLORS } from "./colors.js";

const ACCENT = "#112233";

describe("SHIELDS_NAMED_COLORS", () => {
  it("maps classic shields names to hex", () => {
    expect(SHIELDS_NAMED_COLORS.brightgreen).toBe("#44cc11");
    expect(SHIELDS_NAMED_COLORS.green).toBe("#97ca00");
    expect(SHIELDS_NAMED_COLORS.yellowgreen).toBe("#a4a61d");
    expect(SHIELDS_NAMED_COLORS.yellow).toBe("#dfb317");
    expect(SHIELDS_NAMED_COLORS.orange).toBe("#fe7d37");
    expect(SHIELDS_NAMED_COLORS.red).toBe("#e05d44");
    expect(SHIELDS_NAMED_COLORS.blue).toBe("#007ec6");
    expect(SHIELDS_NAMED_COLORS.lightgrey).toBe("#9f9f9f");
    expect(SHIELDS_NAMED_COLORS.lightgray).toBe("#9f9f9f");
    expect(SHIELDS_NAMED_COLORS.success).toBe(SHIELDS_NAMED_COLORS.brightgreen);
    expect(SHIELDS_NAMED_COLORS.important).toBe(SHIELDS_NAMED_COLORS.orange);
    expect(SHIELDS_NAMED_COLORS.critical).toBe(SHIELDS_NAMED_COLORS.red);
    expect(SHIELDS_NAMED_COLORS.informational).toBe(SHIELDS_NAMED_COLORS.blue);
    expect(SHIELDS_NAMED_COLORS.inactive).toBe(SHIELDS_NAMED_COLORS.lightgrey);
  });
});

describe("resolveChipColor", () => {
  it.each([
    ["brightgreen", "#44cc11"],
    ["GREEN", "#97ca00"],
    ["YellowGreen", "#a4a61d"],
    ["yellow", "#dfb317"],
    ["orange", "#fe7d37"],
    ["red", "#e05d44"],
    ["blue", "#007ec6"],
    ["lightgrey", "#9f9f9f"],
    ["lightgray", "#9f9f9f"],
    ["success", "#44cc11"],
    ["important", "#fe7d37"],
    ["critical", "#e05d44"],
    ["informational", "#007ec6"],
    ["inactive", "#9f9f9f"],
  ] as const)("maps named color %s", (name, hex) => {
    expect(resolveChipColor(name, ACCENT)).toBe(hex);
  });

  it("expands #rgb to #rrggbb", () => {
    expect(resolveChipColor("#abc", ACCENT)).toBe("#aabbcc");
    expect(resolveChipColor("#ABC", ACCENT)).toBe("#aabbcc");
  });

  it("normalizes #rrggbb", () => {
    expect(resolveChipColor("#aabbcc", ACCENT)).toBe("#aabbcc");
    expect(resolveChipColor("#AABBCC", ACCENT)).toBe("#aabbcc");
  });

  it("returns accent for unknown names", () => {
    expect(resolveChipColor("chartreuse", ACCENT)).toBe(ACCENT);
  });

  it("returns accent for null or missing color", () => {
    expect(resolveChipColor(null, ACCENT)).toBe(ACCENT);
    expect(resolveChipColor(undefined, ACCENT)).toBe(ACCENT);
    expect(resolveChipColor("", ACCENT)).toBe(ACCENT);
  });

  it("returns accent for css injection and non-hex forms", () => {
    expect(resolveChipColor("url(https://evil.example/x)", ACCENT)).toBe(
      ACCENT,
    );
    expect(resolveChipColor("rgb(255, 0, 0)", ACCENT)).toBe(ACCENT);
    expect(resolveChipColor("#ffff", ACCENT)).toBe(ACCENT);
    expect(resolveChipColor("#ffffffff", ACCENT)).toBe(ACCENT);
    expect(resolveChipColor("#aabbcc;background:url(x)", ACCENT)).toBe(ACCENT);
  });
});
