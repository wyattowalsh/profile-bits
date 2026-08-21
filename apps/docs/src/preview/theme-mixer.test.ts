import { COLOR_ROLES } from "@profile-bits/themes";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  applyMixerPair,
  CONTRAST_WARNING,
  familyRefsFor,
  SAME_POLARITY_NOTE,
  THEME_MIX_POLARITY_LABEL,
  THEME_PAIR_LABEL,
  THEME_PAIR_POLARITY_LABEL,
  ThemeMixer,
} from "./theme-mixer";
import { customRolesFromNamed } from "./theme-picker";

function renderMixer(value: Parameters<typeof ThemeMixer>[0]["value"]): string {
  return renderToStaticMarkup(createElement(ThemeMixer, { value }));
}

describe("ThemeMixer", () => {
  it("keeps a named pair control seeded from the current flavor", () => {
    const html = renderMixer({
      custom: customRolesFromNamed("catppuccin-mocha"),
    });

    expect(html).toContain('data-slot="theme-mixer"');
    expect(html).toContain(THEME_PAIR_LABEL);
    expect(html).toContain('name="cpair"');
    expect(html).toContain('data-slot="theme-pair"');
    expect(html).toContain('value="catppuccin-latte"');
  });

  it("lists family-grouped role refs including seeded mocha.bg", () => {
    const html = renderMixer({
      custom: customRolesFromNamed("catppuccin-mocha"),
    });
    const browsing = familyRefsFor("", "catppuccin-mocha.bg");
    const refs = browsing.flatMap((family) =>
      family.options.map((option) => option.ref),
    );

    expect(html).toContain('role="combobox"');
    expect(html).toContain('role="listbox"');
    expect(html).toContain('data-slot="theme-mixer-combobox"');
    expect(html).toContain('data-slot="theme-mixer-listbox"');
    expect(html).toContain('name="cbg"');
    expect(html).toContain('value="catppuccin-mocha.bg"');
    expect(html).toContain('value="catppuccin-mocha.card"');
    expect(html).toContain('value="catppuccin-mocha.text"');
    expect(html).toContain('value="catppuccin-mocha.muted"');
    expect(html).toContain('value="catppuccin-mocha.accent"');
    expect(html).toContain('value="catppuccin-mocha.border"');
    expect(html).not.toMatch(/<datalist[\s>]/);
    expect(html).not.toMatch(/role="option"/);
    expect(html).not.toContain('data-value="catppuccin-mocha.bg"');
    expect(html).not.toContain('data-value="catppuccin-mocha.font"');
    for (const role of COLOR_ROLES) {
      expect(html).toContain(`data-role="${role}"`);
    }
    expect(refs).toContain("catppuccin-mocha.bg");
    expect(refs).toContain("catppuccin-mocha.card");
    expect(refs).toContain("catppuccin-mocha.text");
    expect(refs).toContain("catppuccin-mocha.muted");
    expect(refs).toContain("catppuccin-mocha.accent");
    expect(refs).toContain("catppuccin-mocha.border");
    expect(refs).not.toContain("catppuccin-mocha.font");
    expect(browsing.some((family) => family.id === "catppuccin")).toBe(true);
    expect(browsing.some((family) => family.id === "github")).toBe(true);
  });

  it("previews mix and pair polarity from background hex", () => {
    const html = renderMixer({
      custom: customRolesFromNamed("catppuccin-mocha"),
    });

    expect(html).toContain(THEME_MIX_POLARITY_LABEL);
    expect(html).toContain(THEME_PAIR_POLARITY_LABEL);
    expect(html).toContain('data-slot="theme-mix-polarity"');
    expect(html).toContain('data-slot="theme-pair-polarity"');
    expect(html).toMatch(
      /data-slot="theme-mix-polarity"[^>]*data-polarity="dark"/,
    );
    expect(html).toMatch(
      /data-slot="theme-pair-polarity"[^>]*data-polarity="light"/,
    );
    expect(html).not.toContain(SAME_POLARITY_NOTE);
  });

  it("keeps the seeded mocha pair when the empty pair option is selected", () => {
    const mocha = customRolesFromNamed("catppuccin-mocha");
    const html = renderMixer({ custom: mocha });

    expect(html).toContain(">Keep seeded pair</option>");
    expect(mocha.pair).toBe("catppuccin-latte");
    expect(applyMixerPair(mocha, "")).toEqual(mocha);
    expect(applyMixerPair(mocha, "").pair).toBe("catppuccin-latte");
  });

  it("does not rewrite a same-polarity pair when the empty option is selected", () => {
    const mixed = {
      ...customRolesFromNamed("catppuccin-mocha"),
      pair: "nord",
    };

    expect(applyMixerPair(mixed, "")).toEqual(mixed);
    expect(applyMixerPair(mixed, "").pair).toBe("nord");
  });

  it("lists mauve role and swatch when searching mocha mauve hex", () => {
    const refs = familyRefsFor("#cba6f7", "catppuccin-mocha.accent").flatMap(
      (family) => family.options.map((option) => option.ref),
    );

    expect(refs).toContain("catppuccin-mocha.mauve");
    expect(refs).toContain("catppuccin-mocha.accent");
    expect(
      familyRefsFor("#cba6f7", "catppuccin-mocha.accent").some(
        (family) => family.id === "catppuccin",
      ),
    ).toBe(true);
  });

  it("still lists mocha role refs when searching the flavor id", () => {
    const refs = familyRefsFor("mocha", "catppuccin-mocha.bg").flatMap(
      (family) => family.options.map((option) => option.ref),
    );

    expect(refs).toContain("catppuccin-mocha.bg");
    expect(refs).toContain("catppuccin-mocha.mauve");
  });

  it("does not treat color-mix or oklch queries as catalog hex matches", () => {
    expect(
      familyRefsFor(
        "color-mix(in srgb, #cba6f7 50%, #1e1e2e)",
        "catppuccin-mocha.accent",
      ),
    ).toEqual([]);
    expect(
      familyRefsFor("oklch(0.747 0.123 301.2)", "catppuccin-mocha.accent"),
    ).toEqual([]);
  });

  it("warns on same-polarity pairs without rewriting the pair", () => {
    const html = renderMixer({
      custom: {
        ...customRolesFromNamed("catppuccin-mocha"),
        pair: "nord",
      },
    });

    expect(html).toContain('name="cpair"');
    expect(html).toContain('value="nord"');
    expect(html).toMatch(
      /data-slot="theme-mix-polarity"[^>]*data-polarity="dark"/,
    );
    expect(html).toMatch(
      /data-slot="theme-pair-polarity"[^>]*data-polarity="dark"/,
    );
    expect(html).toContain(SAME_POLARITY_NOTE);
    expect(html).toContain('value="catppuccin-mocha.bg"');
  });

  it("warns on vs-card contrast without blocking muted failures", () => {
    const html = renderMixer({
      custom: {
        bg: "#000000",
        card: "#f5f5f5",
        text: "#ffffff",
        muted: "#111111",
        accent: "#ffffff",
        border: "#333333",
        pair: "catppuccin-latte",
      },
    });

    expect(html).toContain(CONTRAST_WARNING);
    expect(html).toContain('data-slot="theme-contrast-warning"');
    expect(html).toContain('role="status"');
    expect(html).not.toMatch(/disabled/);
    expect(html).toContain('name="cmuted"');
    expect(html).toContain('name="cpair"');
    expect(html).toContain('role="combobox"');
  });

  it("keeps incomplete custom roles as a custom object", () => {
    const html = renderMixer({
      custom: {
        bg: "",
        card: "",
        text: "",
        muted: "",
        accent: "",
        border: "",
      },
    });

    expect(html).toContain('data-slot="theme-mixer"');
    expect(html).toContain('name="cbg"');
    expect(html).toContain('name="cpair"');
    expect(html).not.toMatch(
      /data-slot="theme-mixer-combobox"[^>]*value="dark"/,
    );
    expect(html).toMatch(/data-slot="theme-mix-polarity"[^>]*data-polarity=""/);
    expect(html).not.toContain(CONTRAST_WARNING);
  });
});
