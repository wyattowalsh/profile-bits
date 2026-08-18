import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { THEME_PAIR_LABEL, ThemeMixer } from "./theme-mixer";
import { customRolesFromNamed } from "./theme-picker";

describe("ThemeMixer", () => {
  it("keeps a named pair control seeded from the current flavor", () => {
    const html = renderToStaticMarkup(
      createElement(ThemeMixer, {
        value: { custom: customRolesFromNamed("catppuccin-mocha") },
      }),
    );

    expect(html).toContain('data-slot="theme-mixer"');
    expect(html).toContain(THEME_PAIR_LABEL);
    expect(html).toContain('name="cpair"');
    expect(html).toContain('data-slot="theme-pair"');
    expect(html).toContain('value="catppuccin-latte"');
  });
});
