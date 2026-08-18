import { describe, expect, it } from "vitest";
import { themeMembersFor, themesFor } from "./themes-for.js";

const MOCHA_CUSTOM = {
  bg: "catppuccin-mocha.bg",
  card: "catppuccin-mocha.card",
  text: "catppuccin-mocha.text",
  muted: "catppuccin-mocha.muted",
  accent: "catppuccin-mocha.accent",
  border: "catppuccin-mocha.border",
} as const;

const LATTE_MAP = {
  bg: "catppuccin-latte.bg",
  card: "catppuccin-latte.card",
  text: "catppuccin-latte.text",
  muted: "catppuccin-latte.muted",
  accent: "catppuccin-latte.accent",
  border: "catppuccin-latte.border",
} as const;

const NORD_MAP = {
  bg: "nord.bg",
  card: "nord.card",
  text: "nord.text",
  muted: "nord.muted",
  accent: "nord.accent",
  border: "nord.border",
} as const;

describe("themesFor", () => {
  it("returns the selected named flavor when output_pair is false", () => {
    expect(
      themesFor({ theme: "catppuccin-mocha", output_pair: false }),
    ).toEqual(["catppuccin-mocha"]);
    expect(themesFor({ theme: "dark", output_pair: false })).toEqual(["dark"]);
  });

  it("returns light then dark members when output_pair is true", () => {
    expect(themesFor({ theme: "catppuccin-mocha", output_pair: true })).toEqual(
      ["catppuccin-latte", "catppuccin-mocha"],
    );
    expect(themesFor({ theme: "nord-light", output_pair: true })).toEqual([
      "nord-light",
      "nord",
    ]);
  });
});

describe("themeMembersFor", () => {
  it("keeps a custom mix as the only member when output_pair is false", () => {
    const members = themeMembersFor({
      theme: {
        custom: {
          bg: "dark.bg",
          card: "dark.card",
          text: "dark.text",
          muted: "dark.muted",
          accent: "catppuccin-mocha.mauve",
          border: "dark.border",
        },
      },
      output_pair: false,
    });
    expect(members).toHaveLength(1);
    expect(members[0]?.polarity).toBe("dark");
    expect(members[0]?.theme).toMatchObject({ accent: "#cba6f7" });
  });

  it("pairs a custom mix with a named opposite polarity", () => {
    const members = themeMembersFor({
      theme: {
        custom: {
          ...MOCHA_CUSTOM,
          pair: "catppuccin-latte",
        },
      },
      output_pair: true,
    });
    expect(members.map((member) => member.polarity)).toEqual(["light", "dark"]);
    expect(members[0]?.theme).toBe("catppuccin-latte");
    expect(members[1]?.theme).toMatchObject({ bg: "#1e1e2e" });
  });

  it("renders the custom mix, not the named pair, when output_pair is false", () => {
    const members = themeMembersFor({
      theme: {
        custom: {
          ...MOCHA_CUSTOM,
          pair: "catppuccin-latte",
        },
      },
      output_pair: false,
    });
    expect(members).toHaveLength(1);
    expect(members[0]?.polarity).toBe("dark");
    expect(members[0]?.theme).toMatchObject({ bg: "#1e1e2e" });
  });

  it("treats a pair map as the opposite member and keeps custom selected", () => {
    const paired = themeMembersFor({
      theme: {
        custom: {
          ...MOCHA_CUSTOM,
          pair: LATTE_MAP,
        },
      },
      output_pair: true,
    });
    expect(paired.map((member) => member.polarity)).toEqual(["light", "dark"]);
    expect(paired[0]?.theme).toMatchObject({ bg: "#eff1f5" });
    expect(paired[1]?.theme).toMatchObject({ bg: "#1e1e2e" });

    const selected = themeMembersFor({
      theme: {
        custom: {
          ...MOCHA_CUSTOM,
          pair: LATTE_MAP,
        },
      },
      output_pair: false,
    });
    expect(selected).toHaveLength(1);
    expect(selected[0]?.theme).toMatchObject({ bg: "#1e1e2e" });
    expect(selected[0]?.theme).not.toMatchObject({ bg: "#eff1f5" });
  });

  it("fails when both custom maps share a polarity", () => {
    expect(() =>
      themeMembersFor({
        theme: {
          custom: {
            ...MOCHA_CUSTOM,
            pair: NORD_MAP,
          },
        },
        output_pair: true,
      }),
    ).toThrow(/opposite polarity/);
  });
});
