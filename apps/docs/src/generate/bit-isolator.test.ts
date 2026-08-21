import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  BitIsolator,
  bitIsolatorRequest,
  requestFromSearch,
} from "@/src/generate/bit-isolator";
import { BIT_SAMPLE_IDS } from "@/src/generate/bit-samples";
import { CARD_HEIGHT, CARD_WIDTH } from "@/src/generate/constants";
import type { PreviewFile } from "@/src/preview/types";
import { PREVIEW_ENDPOINT } from "@/src/preview/use-preview";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const THEME_FILE: PreviewFile = {
  id: "Theme",
  mime: "image/svg+xml",
  bytesBase64: btoa("<svg></svg>"),
  filename: "Theme.svg",
};

function isolatorSourceUrl(): URL {
  return new URL("./bit-isolator.tsx", import.meta.url);
}

describe("bit isolator island", () => {
  it("is a client island that POSTs bit scope through usePreview", async () => {
    const source = await readFile(isolatorSourceUrl(), "utf8");

    expect(source.startsWith('"use client"')).toBe(true);
    expect(source).toContain("usePreview");
    expect(source).toContain("PREVIEW_ENDPOINT");
    expect(source).toContain('scope: "bit"');
    expect(source).toContain("bitIsolatorRequest");
    expect(source).toContain("requestFromSearch");
    expect(source).toContain("usePreview(requestFromSearch(bit, searchKey))");
    expect(source).toContain("pickOptions");
    expect(source).not.toContain("requestProp ?? bitIsolatorRequest");
    expect(source).toContain('data-slot="bit-stage"');
    expect(source).not.toContain("data-placeholder");
    expect(source).not.toContain("bit-stage-label");
    expect(source).not.toContain("@profile-bits/bits");
    expect(source).not.toContain("packages/bits");
    expect(source).not.toContain("bit-samples");
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toContain("/playground");
    expect(source).not.toMatch(/yaml/i);
    expect(source).not.toMatch(/\bwakatime\b/i);
    expect(source).not.toMatch(/\brss\b/i);
  });

  it("builds a bit-scoped preview request for every sample id", () => {
    expect(BIT_SAMPLE_IDS.length).toBeGreaterThan(0);
    for (const bit of BIT_SAMPLE_IDS) {
      expect(bitIsolatorRequest(bit)).toEqual({
        scope: "bit",
        plugin: "github",
        bit,
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      });
    }
  });

  it("keeps remaining bits dark when generate search is empty", () => {
    for (const bit of BIT_SAMPLE_IDS) {
      expect(requestFromSearch(bit, "")).toEqual(bitIsolatorRequest(bit));
      expect(requestFromSearch(bit, new URLSearchParams()).theme).toBe("dark");
    }
  });

  it("hydrates named GlobalBar theme from generate search params", () => {
    const search = new URLSearchParams({
      scope: "widget",
      plugin: "github",
      widget: "languages",
      theme: "catppuccin-mocha",
    });

    const request = requestFromSearch("Bar", search);

    expect(request.scope).toBe("bit");
    expect(request.bit).toBe("Bar");
    expect(request.theme).toBe("catppuccin-mocha");
    expect(request.format).toBe("svg");
  });

  it("hydrates custom c* mixer tokens from generate search params", () => {
    const search = new URLSearchParams({
      theme: "custom",
      cbg: "111111",
      ccard: "222222",
      ctext: "eeeeee",
      cmuted: "aaaaaa",
      caccent: "cba6f7",
      cborder: "333333",
      cpair: "light",
    });

    const request = requestFromSearch("Chip", search);

    expect(request.scope).toBe("bit");
    expect(request.bit).toBe("Chip");
    expect(request.theme).toEqual({
      custom: {
        bg: "111111",
        card: "222222",
        text: "eeeeee",
        muted: "aaaaaa",
        accent: "cba6f7",
        border: "333333",
        pair: "light",
      },
    });
  });

  it("lets the path bit win over a permalink bit query", () => {
    const search = new URLSearchParams({
      scope: "bit",
      bit: "Theme",
      theme: "nord",
    });

    expect(requestFromSearch("Avatar", search).bit).toBe("Avatar");
    expect(requestFromSearch("Avatar", search).theme).toBe("nord");
  });

  it("renders the staged Theme+Frame card from preview files", () => {
    const html = renderToStaticMarkup(
      createElement(BitIsolator, {
        bit: "Theme",
        files: [THEME_FILE],
        loading: false,
      }),
    );

    expect(html).toContain('data-slot="bit-stage"');
    expect(html).toContain('data-bit="Theme"');
    expect(html).toContain('data-scope="bit"');
    expect(html).toContain(`data-preview-endpoint="${PREVIEW_ENDPOINT}"`);
    expect(html).toContain(`data-card-width="${CARD_WIDTH}"`);
    expect(html).toContain(`data-card-height="${CARD_HEIGHT}"`);
    expect(html).toContain(
      `aria-label="Theme bit stage ${CARD_WIDTH} by ${CARD_HEIGHT}"`,
    );
    expect(html).toContain('alt="Theme.svg"');
    expect(html).toContain(
      `src="data:${THEME_FILE.mime};base64,${THEME_FILE.bytesBase64}"`,
    );
    expect(html).toContain("Theme.svg");
    expect(html).not.toContain("data-placeholder");
    expect(html).not.toContain("bit-stage-label");
    expect(html).not.toContain("source-drop");
  });

  it("shows a skeleton when the preview file has not arrived", () => {
    const html = renderToStaticMarkup(
      createElement(BitIsolator, {
        bit: "Frame",
        files: [],
        loading: true,
      }),
    );

    expect(html).toContain('data-loading="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-slot="skeleton"');
    expect(html).toContain('data-bit="Frame"');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("data-placeholder");
  });
});
