import { describe, expect, it } from "vitest";
import { isHexColor, normalizeHex, parseHex } from "./hex.js";

describe("hex grammar", () => {
  it.each(["#fff", "#FFF", "#ffffff", "#FFFFFF", "#ffffffff", "#0d1117"])(
    "accepts %s",
    (hex) => {
      expect(isHexColor(hex)).toBe(true);
      expect(parseHex(hex)).toMatchObject({
        r: expect.any(Number),
        g: expect.any(Number),
        b: expect.any(Number),
      });
    },
  );

  it("expands #RGB to #RRGGBB", () => {
    expect(normalizeHex("#0d1")).toBe("#00dd11");
    expect(normalizeHex("#FFF")).toBe("#ffffff");
  });

  it("lowercases #RRGGBB", () => {
    expect(normalizeHex("#0D1117")).toBe("#0d1117");
  });

  it("keeps #RRGGBBAA", () => {
    expect(normalizeHex("#0d1117ff")).toBe("#0d1117ff");
    expect(normalizeHex("#58A6FF80")).toBe("#58a6ff80");
  });

  it.each([
    "",
    "#",
    "#gggggg",
    "#1234",
    "#12345",
    "123456",
    "#1234567",
    "#123456789",
    "blue",
    "#0d1117f",
  ])("rejects malformed %s", (hex) => {
    expect(isHexColor(hex)).toBe(false);
    expect(() => parseHex(hex)).toThrow(/Malformed hex color/);
  });
});
