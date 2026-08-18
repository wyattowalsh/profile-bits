import { describe, expect, it, vi } from "vitest";
import { chipFixture } from "./index.js";

describe("chipFixture", () => {
  it("loads shieldcn npm without color and shields npm with color", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const shieldcnNpm = chipFixture("shieldcn", "npm") as Record<
      string,
      unknown
    >;
    expect(shieldcnNpm.value).toBe("19.1.1");
    expect(shieldcnNpm).not.toHaveProperty("color");

    const shieldsNpm = chipFixture("shields", "npm") as Record<string, unknown>;
    expect(shieldsNpm.message).toBe("v19.1.1");
    expect(shieldsNpm.color).toBe("blue");

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("throws on an unknown combo", () => {
    expect(() => chipFixture("unknown" as "shieldcn", "npm")).toThrow(
      /unknown chip fixture combo/,
    );
  });
});
