import { describe, expect, it } from "vitest";
import { THEME_REGISTRY } from "./registry.js";
import { resolveColorRef, resolveTheme } from "./resolve.js";

function thrownMessage(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
  }
  throw new Error("expected throw");
}

describe("resolveColorRef did-you-mean", () => {
  it("suggests a close flavor id and still throws", () => {
    expect(
      thrownMessage(() => resolveColorRef("nordd.bg", THEME_REGISTRY)),
    ).toBe('Unknown theme flavor "nordd". Did you mean "nord"?');
    expect(
      thrownMessage(() =>
        resolveColorRef("catppuccin-mocah.mauve", THEME_REGISTRY),
      ),
    ).toBe(
      'Unknown theme flavor "catppuccin-mocah". Did you mean "catppuccin-mocha"?',
    );
  });

  it("suggests a close swatch on a known flavor", () => {
    expect(
      thrownMessage(() =>
        resolveColorRef("catppuccin-mocha.mauv", THEME_REGISTRY),
      ),
    ).toBe(
      'Unknown swatch or role "mauv" on flavor "catppuccin-mocha". Did you mean "mauve"?',
    );
  });

  it("still throws on unofficial dump ids and does not fall back to dark", () => {
    expect(
      thrownMessage(() => resolveColorRef("merko.bg", THEME_REGISTRY)),
    ).toBe('Unknown theme flavor "merko"');
    expect(
      thrownMessage(() => resolveColorRef("radical.mauve", THEME_REGISTRY)),
    ).toBe('Unknown theme flavor "radical"');
    expect(thrownMessage(() => resolveTheme("merko", THEME_REGISTRY))).toBe(
      'Unknown theme flavor "merko"',
    );
    expect(resolveTheme("dark", THEME_REGISTRY).bg).toBe("#0d1117");
  });

  it("omits a suggestion when the distance is huge", () => {
    expect(
      thrownMessage(() =>
        resolveColorRef("zzzzzzzzzzzzzzzzzzzz.bg", THEME_REGISTRY),
      ),
    ).toBe('Unknown theme flavor "zzzzzzzzzzzzzzzzzzzz"');
    expect(
      thrownMessage(() => resolveColorRef("dark.nope", THEME_REGISTRY)),
    ).toBe('Unknown swatch or role "nope" on flavor "dark"');
  });
});

describe("resolveTheme did-you-mean", () => {
  it("suggests a close named id and still throws", () => {
    expect(thrownMessage(() => resolveTheme("nordd", THEME_REGISTRY))).toBe(
      'Unknown theme flavor "nordd". Did you mean "nord"?',
    );
  });
});
