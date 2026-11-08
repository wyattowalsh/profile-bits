import { readFile } from "node:fs/promises";
import {
  COLOR_ROLES,
  listFamilies,
  NAMED_THEME_IDS,
  THEME_REGISTRY,
} from "@profile-bits/themes";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PREVIEW_THEMES } from "@/src/preview/types";
import GenerateThemesPage, {
  flavorRoleHex,
  THEME_LIBRARY_SWATCH_ROLES,
  THEMES_HREF,
  themeFamilies,
  themeFlavorHref,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("/generate/themes page (server)", () => {
  it("is a server page sourced from NAMED_THEME_IDS and listFamilies", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("redirect(");
    expect(source).not.toContain("permanentRedirect");
    expect(source).toContain("NAMED_THEME_IDS");
    expect(source).toContain("listFamilies(THEME_REGISTRY)");
    expect(source).not.toMatch(/from ["']@profile-bits\/themes\/families/);
    expect(source).not.toContain("author-palette");
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/\byaml\b/i);
    expect(source).not.toContain("/playground");
    expect(source).not.toMatch(/plugin_[a-z]+_[a-z]+_[a-z]+/);
    expect(source).not.toMatch(/playwright/i);
    expect(source).not.toContain("npx skills add");
    expect(source).not.toContain("/repos/");
    expect(source).not.toContain("/languages");
    expect(source).not.toContain("radical");
    expect(source).not.toContain("merko");
    expect(source).not.toMatch(/THEME_REGISTRY\s*=/);
  });

  it("locks the library to the live 47 named ids and 19 families", () => {
    const families = themeFamilies();
    const listedIds = families
      .flatMap((family) => family.flavors.map((flavor) => flavor.id))
      .sort();

    expect(THEMES_HREF).toBe("/generate/themes");
    expect(NAMED_THEME_IDS).toHaveLength(47);
    expect(PREVIEW_THEMES).toEqual(NAMED_THEME_IDS);
    expect(families).toEqual(listFamilies(THEME_REGISTRY));
    expect(families).toHaveLength(19);
    expect(listedIds).toEqual([...NAMED_THEME_IDS]);
    expect(THEME_LIBRARY_SWATCH_ROLES).toEqual(COLOR_ROLES);
    expect(themeFlavorHref("catppuccin-mocha")).toBe(
      "/generate/themes?theme=catppuccin-mocha",
    );
    expect(themeFlavorHref("dark")).toBe("/generate/themes?theme=dark");
    expect(listedIds).not.toContain("radical");
    expect(listedIds).not.toContain("merko");
  });

  it("lists every named flavor under its listFamilies group with role swatches", () => {
    const families = themeFamilies();
    const html = renderToStaticMarkup(createElement(GenerateThemesPage));
    const mocha = THEME_REGISTRY["catppuccin-mocha"];
    const dark = THEME_REGISTRY.dark;

    expect(html).toContain('data-slot="generate-themes"');
    expect(html).toContain('data-href="/generate/themes"');
    expect(html).toContain('data-theme-count="47"');
    expect(html).toContain('data-family-count="19"');
    expect(html).toContain('data-slot="generate-themes-families"');
    expect(html).toContain("<code>NAMED_THEME_IDS</code>");
    expect(html).toContain("<code>listFamilies</code>");
    expect(html).toContain("47 flavors in 19 families");
    expect(html).toContain("480×160");

    for (const family of families) {
      expect(html).toContain(`data-family="${family.id}"`);
      expect(html).toContain(
        `data-slot="generate-themes-family-label">${family.id}</h3>`,
      );
    }

    for (const id of NAMED_THEME_IDS) {
      const flavor = THEME_REGISTRY[id];
      expect(flavor).toBeDefined();
      expect(html).toContain(`data-theme="${id}"`);
      expect(html).toContain(`href="/generate/themes?theme=${id}"`);
      expect(html).toContain(`<code>${id}</code>`);
      expect(html).toContain(`data-polarity="${flavor?.polarity}"`);
      expect(html).toContain(`data-pair="${flavor?.pair}"`);
    }

    for (const role of COLOR_ROLES) {
      expect(html).toContain(`data-swatch="${role}"`);
    }

    expect(mocha).toBeDefined();
    expect(dark).toBeDefined();
    if (mocha !== undefined) {
      expect(html).toContain(flavorRoleHex(mocha, "bg"));
      expect(html).toContain(flavorRoleHex(mocha, "card"));
      expect(html).toContain(flavorRoleHex(mocha, "accent"));
    }
    if (dark !== undefined) {
      expect(html).toContain(flavorRoleHex(dark, "bg"));
    }

    expect(html).not.toContain("radical");
    expect(html).not.toContain("merko");
    expect(html.toLowerCase()).not.toContain("yaml");
    expect(html).not.toContain("source-drop");
    expect(html).not.toContain("embed API");
  });
});
