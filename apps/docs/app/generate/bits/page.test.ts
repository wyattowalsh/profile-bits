import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PREVIEW_BIT_IDS } from "@/src/preview/types";
import GenerateBitsPage, {
  BIT_IDS,
  BITS_HREF,
  bitEntries,
  bitHref,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

const V0_BIT_NAMES = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Stat",
  "Bar",
  "Chip",
  "Avatar",
  "Divider",
] as const;

describe("/generate/bits page (server)", () => {
  it("is a server page with no yaml rail, no packages/bits, and no extra plugins", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("redirect(");
    expect(source).not.toMatch(/from ["']@profile-bits\/bits["']/);
    expect(source).not.toMatch(/from ["'][^"']*bits\/bit-samples["']/);
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/\byaml\b/i);
    expect(source).not.toContain("wakatime");
    expect(source).not.toContain("rss");
    expect(source).not.toContain("/playground");
  });

  it("locks v0 bit names and hrefs without importing packages/bits", () => {
    expect(BIT_IDS).toEqual(V0_BIT_NAMES);
    expect(BIT_IDS).toEqual(PREVIEW_BIT_IDS);
    expect(BITS_HREF).toBe("/generate/bits");
    expect(bitHref("Theme")).toBe("/generate/bits/Theme");
    expect(bitHref("Divider")).toBe("/generate/bits/Divider");
    expect(bitEntries()).toEqual(
      V0_BIT_NAMES.map((bit) => ({
        id: bit,
        href: `/generate/bits/${bit}`,
        name: bit,
      })),
    );
  });

  it("lists every v0 bit as a link to /generate/bits/[bit]", () => {
    const html = renderToStaticMarkup(createElement(GenerateBitsPage));

    expect(html).toContain('data-slot="generate-bits"');
    expect(html).toContain('data-href="/generate/bits"');
    expect(html).toContain('data-slot="generate-bits-list"');
    expect(html).toContain("<code>github</code>");
    expect(html).toContain("480×160");

    for (const bit of V0_BIT_NAMES) {
      expect(html).toContain(`data-bit="${bit}"`);
      expect(html).toContain(`href="/generate/bits/${bit}"`);
      expect(html).toContain(`>${bit}</a>`);
    }

    expect(html).not.toContain("wakatime");
    expect(html).not.toContain("rss");
    expect(html.toLowerCase()).not.toContain("yaml");
    expect(html).not.toContain("source-drop");
  });
});
