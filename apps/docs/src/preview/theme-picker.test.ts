import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  customRolesFromNamed,
  THEME_CUSTOM_VALUE,
  THEME_PICKER_SEARCH_LABEL,
  THEME_SWATCH_ROLES,
  ThemePicker,
} from "./theme-picker";

describe("customRolesFromNamed", () => {
  it("seeds mixer roles from the current named flavor including pair", () => {
    expect(customRolesFromNamed("catppuccin-mocha")).toEqual({
      bg: "catppuccin-mocha.bg",
      card: "catppuccin-mocha.card",
      text: "catppuccin-mocha.text",
      muted: "catppuccin-mocha.muted",
      accent: "catppuccin-mocha.accent",
      border: "catppuccin-mocha.border",
      pair: "catppuccin-latte",
    });
  });
});

describe("ThemePicker", () => {
  it("renders a family-grouped searchable combobox with swatch chips", () => {
    const html = renderToStaticMarkup(
      createElement(ThemePicker, { value: "catppuccin-mocha" }),
    );

    expect(html).toContain('data-slot="theme-picker"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain(`aria-label="${THEME_PICKER_SEARCH_LABEL}"`);
    expect(html).toContain('role="listbox"');
    expect(html).toContain('data-family="catppuccin"');
    expect(html).toContain('data-family="github"');
    expect(html).toContain('data-value="catppuccin-mocha"');
    expect(html).toContain(`data-value="${THEME_CUSTOM_VALUE}"`);
    expect(html).toContain("#1e1e2e");
    for (const role of THEME_SWATCH_ROLES) {
      expect(html).toContain(`data-swatch="${role}"`);
    }
    expect(html).not.toMatch(/<select[\s>]/);
  });
});
