import { parseConfig } from "@profile-bits/core";
import { describe, expect, it } from "vitest";
import { exportWorkflow } from "../codegen/export-workflow";
import { parse, serialize, toCrossLink } from "./permalink";
import type { PreviewRequest } from "./types";

const BASE: PreviewRequest = {
  scope: "plugin",
  plugin: "github",
  options: {},
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

describe("generate theming permalink", () => {
  it("shares theme between generate bits and github languages", () => {
    const mocha: PreviewRequest = {
      ...BASE,
      theme: "catppuccin-mocha",
      widget: "languages",
    };
    const params = serialize(mocha);
    expect(params.get("theme")).toBe("catppuccin-mocha");
    const bits = toCrossLink(`/generate/bits/Bar?${params.toString()}`);
    const languages = toCrossLink(
      `/generate/github/languages?${params.toString()}`,
    );
    expect(parse(bits).theme).toBe("catppuccin-mocha");
    expect(parse(languages).theme).toBe("catppuccin-mocha");
  });

  it("round-trips a mauve accent mix", () => {
    const mixed: PreviewRequest = {
      ...BASE,
      theme: {
        custom: {
          bg: "catppuccin-mocha.base",
          card: "catppuccin-mocha.mantle",
          text: "catppuccin-mocha.text",
          muted: "catppuccin-mocha.subtext0",
          accent: "catppuccin-mocha.mauve",
          border: "catppuccin-mocha.overlay0",
        },
      },
    };
    expect(parse(serialize(mixed)).theme).toEqual(mixed.theme);
  });
});

describe("generate theming export", () => {
  it("emits a named catalog id", () => {
    const { configYml } = exportWorkflow({
      user: "octocat",
      format: "svg",
      theme: "catppuccin-mocha",
      output_pair: false,
    });
    expect(configYml).toContain("theme: catppuccin-mocha");
  });

  it("emits theme.custom for a mix", () => {
    const { configYml } = exportWorkflow({
      user: "octocat",
      format: "svg",
      theme: {
        custom: {
          bg: "catppuccin-mocha.base",
          card: "dark.card",
          text: "dark.text",
          muted: "dark.muted",
          accent: "catppuccin-mocha.mauve",
          border: "dark.border",
        },
      },
      output_pair: false,
    });
    expect(configYml).toContain("theme:");
    expect(configYml).toContain("custom:");
    expect(configYml).toContain("accent: catppuccin-mocha.mauve");
  });

  it("emits pair when custom output_pair is true and yaml parses", () => {
    const { configYml } = exportWorkflow({
      user: "octocat",
      format: "svg",
      theme: {
        custom: {
          bg: "catppuccin-mocha.bg",
          card: "catppuccin-mocha.card",
          text: "catppuccin-mocha.text",
          muted: "catppuccin-mocha.muted",
          accent: "catppuccin-mocha.accent",
          border: "catppuccin-mocha.border",
          pair: "catppuccin-latte",
        },
      },
      output_pair: true,
    });
    expect(configYml).toContain("custom:");
    expect(configYml).toMatch(/pair:\s*catppuccin-latte/);
    expect(configYml).toContain("output_pair: true");
    const config = parseConfig({ yaml: configYml });
    expect(config.output_pair).toBe(true);
    expect(config.theme).toMatchObject({
      custom: {
        accent: "catppuccin-mocha.accent",
        pair: "catppuccin-latte",
      },
    });
  });
});
