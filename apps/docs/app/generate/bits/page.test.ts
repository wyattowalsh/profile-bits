import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH } from "@/src/generate/constants";
import { PREVIEW_BIT_IDS } from "@/src/preview/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

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

const README_CARD_BIT_NAMES = [
  "Image",
  "Heatmap",
  "Board",
  "Icon",
  "Grid",
  "List",
  "Time",
] as const;

const ALL_BIT_NAMES = [...V0_BIT_NAMES, ...README_CARD_BIT_NAMES] as const;

const REFUSED_BIT_NAMES = [
  "Cover",
  "Dialog",
  "Toast",
  "Popover",
  "Dropdown",
  "Command",
] as const;

describe("/generate/bits page (server)", () => {
  it("is a server page with isolator samples, no bits package, and no extra plugins", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("redirect(");
    expect(source).toContain("BitIsolator");
    expect(source).toContain("bit-isolator");
    expect(source).toContain("<BitIsolator bit={entry.id} />");
    expect(source).toContain('data-slot="bit-stage"');
    expect(source).toContain('data-slot="generate-bits-sample"');
    expect(source).toContain("data-samples");
    expect(source).not.toContain("names and hrefs only");
    expect(source).not.toContain("@profile-bits/bits");
    expect(source).not.toContain("packages/bits");
    expect(source).not.toContain("bit-samples");
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/\byaml\b/i);
    expect(source).not.toContain("wakatime");
    expect(source).not.toContain("rss");
    expect(source).not.toContain("/playground");
    expect(source).not.toContain("embed API");
    for (const extra of README_CARD_BIT_NAMES) {
      expect(source).toContain(extra);
    }
    for (const refused of REFUSED_BIT_NAMES) {
      expect(source).not.toContain(refused);
    }
  });

  it("locks Frozen 11 plus README-card bit names and hrefs without importing packages/bits", () => {
    expect(BIT_IDS).toEqual(ALL_BIT_NAMES);
    expect(BIT_IDS).toEqual(PREVIEW_BIT_IDS);
    expect(BIT_IDS).toHaveLength(18);
    expect(BITS_HREF).toBe("/generate/bits");
    expect(bitHref("Theme")).toBe("/generate/bits/Theme");
    expect(bitHref("Divider")).toBe("/generate/bits/Divider");
    expect(bitHref("Image")).toBe("/generate/bits/Image");
    expect(bitHref("Time")).toBe("/generate/bits/Time");
    expect(bitEntries()).toEqual(
      ALL_BIT_NAMES.map((bit) => ({
        id: bit,
        href: `/generate/bits/${bit}`,
        name: bit,
      })),
    );
    for (const extra of README_CARD_BIT_NAMES) {
      expect(BIT_IDS).toContain(extra);
    }
    for (const refused of REFUSED_BIT_NAMES) {
      expect(BIT_IDS).not.toContain(refused);
    }
  });

  it("shows a 480×160 sample stage for Frozen 11 and README-card bits, not names-only pills", () => {
    const html = renderToStaticMarkup(createElement(GenerateBitsPage));

    expect(html).toContain('data-slot="generate-bits"');
    expect(html).toContain('data-href="/generate/bits"');
    expect(html).toContain('data-samples="true"');
    expect(html).toContain('data-slot="generate-bits-list"');
    expect(html).toContain("<code>github</code>");
    expect(html).toContain(`${CARD_WIDTH}×${CARD_HEIGHT}`);
    expect(html).toContain("sample");
    expect(html).toContain("not a names-only index");
    expect(html).toContain("README-card bits");

    const items = html.match(/<li[^>]*data-slot="generate-bits-item"/g);
    const samples = html.match(/<div data-slot="generate-bits-sample"/g);
    const stages = html.match(/<figure[^>]*data-slot="bit-stage"/g);
    expect(items).toHaveLength(ALL_BIT_NAMES.length);
    expect(samples).toHaveLength(ALL_BIT_NAMES.length);
    expect(stages).toHaveLength(ALL_BIT_NAMES.length);

    for (const bit of ALL_BIT_NAMES) {
      expect(html).toContain(`data-bit="${bit}"`);
      expect(html).toContain(`href="/generate/bits/${bit}"`);
      expect(html).toContain(`>${bit}</a>`);
      expect(html).toContain(
        `aria-label="${bit} bit stage ${CARD_WIDTH} by ${CARD_HEIGHT}"`,
      );
      expect(html).toContain(`data-scope="bit"`);
      expect(html).toContain('data-preview-endpoint="/api/preview"');
    }

    expect(html).not.toContain("wakatime");
    expect(html).not.toContain("rss");
    expect(html.toLowerCase()).not.toContain("yaml");
    expect(html).not.toContain("source-drop");
    expect(html).not.toContain("border-radius: 999px");
    expect(html).not.toContain("embed API");
    for (const refused of REFUSED_BIT_NAMES) {
      expect(html).not.toContain(`data-bit="${refused}"`);
      expect(html).not.toContain(`/generate/bits/${refused}`);
    }
  });
});
