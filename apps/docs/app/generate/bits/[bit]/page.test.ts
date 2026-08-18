import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BIT_SAMPLE_IDS } from "@/src/generate/bit-samples";
import { PREVIEW_BIT_IDS } from "@/src/preview/types";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: import("react").ReactNode;
  }) => createElement("a", { href, ...rest }, children),
}));

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  GENERATE_PLUGIN_ID,
} from "@/src/generate/shell";
import GenerateBitPage, {
  bitIsolatorRequest,
  generateStaticParams,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("GET /generate/bits/[bit]", () => {
  beforeEach(() => {
    mocks.notFound.mockClear();
  });

  it("is a server isolator wired to bit-samples and the bit preview POST", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("generateStaticParams");
    expect(source).toContain("notFound");
    expect(source).not.toContain("GenerateShell");
    expect(source).toContain("BIT_SAMPLE_IDS");
    expect(source).toContain("bit-samples");
    expect(source).toContain("BitIsolator");
    expect(source).toContain("bitIsolatorRequest");
    expect(source).toContain("isPreviewBitName");
    expect(source).toContain('data-slot="bit-stage"');
    expect(source).not.toContain("data-placeholder");
    expect(source).not.toContain("bit-stage-label");
    expect(source).not.toContain("@profile-bits/bits");
    expect(source).not.toContain("packages/bits");
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toContain("/playground");
    expect(source).not.toMatch(/zip/i);
    expect(source).not.toMatch(/yaml/i);
    expect(source).not.toMatch(/\bwakatime\b/i);
    expect(source).not.toMatch(/\brss\b/i);
  });

  it("generateStaticParams lists only v0 bit sample names", () => {
    expect(generateStaticParams()).toEqual(
      BIT_SAMPLE_IDS.map((bit) => ({ bit })),
    );
    expect(BIT_SAMPLE_IDS).toEqual(PREVIEW_BIT_IDS);
    expect(PREVIEW_BIT_IDS).toEqual([
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
    ]);
  });

  it.each(PREVIEW_BIT_IDS)(
    "mounts a %s 480×160 isolator stage without a placeholder",
    async (bit) => {
      const page = await GenerateBitPage({
        params: Promise.resolve({ bit }),
      });
      const html = renderToStaticMarkup(page);

      expect(bitIsolatorRequest(bit)).toEqual({
        scope: "bit",
        plugin: GENERATE_PLUGIN_ID,
        bit,
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      });
      expect(html).not.toContain('data-slot="generate-shell"');
      expect(html).toContain('data-slot="bit-isolator"');
      expect(html).toContain(`data-bit="${bit}"`);
      expect(html).toContain('data-slot="bit-stage"');
      expect(html).toContain('data-scope="bit"');
      expect(html).toContain('data-preview-endpoint="/api/preview"');
      expect(html).not.toContain("data-placeholder");
      expect(html).not.toContain("bit-stage-label");
      expect(html).toContain(`data-card-width="${CARD_WIDTH}"`);
      expect(html).toContain(`data-card-height="${CARD_HEIGHT}"`);
      expect(html).toContain(
        `aria-label="${bit} bit stage ${CARD_WIDTH} by ${CARD_HEIGHT}"`,
      );
      expect(html).toContain(`<h2>${bit}</h2>`);
      expect(html).toContain(`width:${CARD_WIDTH}px`);
      expect(html).toContain(`height:${CARD_HEIGHT}px`);
      expect(html).not.toContain("source-drop");
      expect(html).not.toMatch(/Thin workflow YAML/);
      expect(mocks.notFound).not.toHaveBeenCalled();
    },
  );

  it("calls notFound() for unknown bit names", async () => {
    await expect(
      GenerateBitPage({
        params: Promise.resolve({ bit: "NotABit" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
