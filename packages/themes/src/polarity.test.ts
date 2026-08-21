import { afterEach, describe, expect, it, vi } from "vitest";
import * as contrast from "./contrast.js";
import { polarityFromHex } from "./polarity.js";

describe("polarityFromHex", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("classifies mocha hex as dark and latte hex as light", () => {
    expect(polarityFromHex("#1e1e2e")).toBe("dark");
    expect(polarityFromHex("#eff1f5")).toBe("light");
  });

  it("classifies Primer chrome backgrounds", () => {
    expect(polarityFromHex("#0d1117")).toBe("dark");
    expect(polarityFromHex("#ffffff")).toBe("light");
    expect(polarityFromHex("#000")).toBe("dark");
  });

  it("throws when contrast vs white and black is equal", () => {
    vi.spyOn(contrast, "contrastRatio").mockReturnValue(4.5);
    expect(() => polarityFromHex("#808080")).toThrow(
      "Unable to determine theme polarity from background",
    );
  });

  it("throws on malformed hex", () => {
    expect(() => polarityFromHex("not-a-color")).toThrow(/Malformed hex color/);
  });
});
