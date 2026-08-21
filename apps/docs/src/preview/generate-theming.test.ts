import { parseConfig, themeMembersFor } from "@profile-bits/core";
import { resolveWidgetTheme } from "@profile-bits/renderer";
import { describe, expect, it } from "vitest";
import { exportWorkflow } from "../codegen/export-workflow";
import { parse, serialize, toCrossLink } from "./permalink";
import { renderPreview } from "./server/render-preview";
import type { PreviewRequest } from "./types";

const MOCHA_BG = "#1e1e2e";
const MOCHA_CARD = "#181825";
const PRIMER_BG = "#0d1117";

const BASE: PreviewRequest = {
  scope: "plugin",
  plugin: "github",
  options: {},
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

const MOCHA_PREVIEW_HOST = {
  readToken: () => undefined,
  loadFixtures: () => ({
    user: { login: "octocat" },
    stats: { followers: 1, repos: 2, stars: 3 },
    languages: [{ name: "TypeScript", bytes: 100 }],
  }),
};

function decodePreviewSvg(bytesBase64: string): string {
  return Buffer.from(bytesBase64, "base64").toString("utf8");
}

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

describe("generate preview mocha card", () => {
  it("resolves mocha card to mantle hex and paints it instead of Primer bg", async () => {
    const members = themeMembersFor({
      theme: "catppuccin-mocha",
      output_pair: false,
    });
    expect(members).toHaveLength(1);
    const member = members[0];
    expect(member).toBeDefined();
    if (member === undefined) {
      throw new Error("expected a theme member");
    }
    const palette = resolveWidgetTheme(member.theme);
    expect(palette.card).toBe(MOCHA_CARD);
    expect(palette.bg).toBe(MOCHA_BG);
    expect(palette.bg).not.toBe(PRIMER_BG);

    const mochaChip: PreviewRequest = {
      scope: "bit",
      bit: "Chip",
      plugin: "github",
      options: {},
      format: "svg",
      theme: "catppuccin-mocha",
      output_pair: false,
      user: "octocat",
    };
    const mochaStats: PreviewRequest = {
      ...BASE,
      scope: "widget",
      widget: "stats",
      theme: "catppuccin-mocha",
    };
    const mochaLanguages: PreviewRequest = {
      ...BASE,
      scope: "widget",
      widget: "languages",
      theme: "catppuccin-mocha",
    };

    for (const request of [mochaChip, mochaStats, mochaLanguages]) {
      const result = await renderPreview(request, MOCHA_PREVIEW_HOST);
      expect(result.files.length).toBeGreaterThan(0);
      const file = result.files[0];
      expect(file).toBeDefined();
      if (file === undefined) {
        throw new Error("expected a preview file");
      }
      const svg = decodePreviewSvg(file.bytesBase64);
      expect(svg).toContain(MOCHA_CARD);
      expect(svg).toContain(MOCHA_BG);
      expect(svg).not.toContain(PRIMER_BG);
    }
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
