import { describe, expect, it } from "vitest";
import { themeMembersFor, themesFor } from "./themes-for.js";

describe("themesFor", () => {
  it("returns the selected named flavor when output_pair is false", () => {
    expect(themesFor({ theme: "catppuccin-mocha", output_pair: false })).toEqual(
      ["catppuccin-mocha"],
    );
    expect(themesFor({ theme: "dark", output_pair: false })).toEqual(["dark"]);
  });

  it("returns light then dark members when output_pair is true", () => {
    expect(themesFor({ theme: "catppuccin-mocha", output_pair: true })).toEqual([
      "catppuccin-latte",
      "catppuccin-mocha",
    ]);
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
          bg: "dark.bg",
          card: "dark.card",
          text: "dark.text",
          muted: "dark.muted",
          accent: "dark.accent",
          border: "dark.border",
          pair: "light",
        },
      },
      output_pair: true,
    });
    expect(members.map((member) => member.polarity)).toEqual(["light", "dark"]);
    expect(members[0]?.theme).toBe("light");
  });
});
