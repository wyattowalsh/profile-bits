import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  fileIsMotion,
  isMotionFormat,
  isZipPreviewFile,
  PAIR_CAPTIONS,
  PreviewStage,
  type PreviewStageProps,
  prefersReducedMotion,
  README_MODE_MODULE,
  REDUCED_MOTION_NOTICE,
  ReadmeModeSlot,
  visiblePreviewFiles,
  WASM_PLACEHOLDER_NOTE,
} from "./preview-stage";
import type { PreviewFile, PreviewResponse } from "./types";

const SVG_BYTES = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}"></svg>`,
).toString("base64");

function previewFile(overrides: Partial<PreviewFile> = {}): PreviewFile {
  return {
    id: "stats",
    mime: "image/svg+xml",
    bytesBase64: SVG_BYTES,
    filename: "stats.svg",
    ...overrides,
  };
}

const PAIR_FILES: PreviewFile[] = [
  previewFile({
    id: "stats",
    filename: "stats.svg",
  }),
  previewFile({
    id: "stats-dark",
    filename: "stats-dark.svg",
  }),
];

const PAIR_RESPONSE: PreviewResponse = {
  files: PAIR_FILES,
  provenance: "fixture",
  generatedAt: "2026-08-16T00:00:00.000Z",
};

function renderStage(props: PreviewStageProps = {}): string {
  return renderToStaticMarkup(createElement(PreviewStage, props));
}

function withoutStyles(html: string): string {
  return html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "");
}

function countSlot(html: string, slot: string): number {
  return [
    ...withoutStyles(html).matchAll(new RegExp(`data-slot="${slot}"`, "g")),
  ].length;
}

function sourceUrl(): URL {
  return new URL("./preview-stage.tsx", import.meta.url);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("card size constants", () => {
  it("locks the card at 480×160", () => {
    expect(CARD_WIDTH).toBe(480);
    expect(CARD_HEIGHT).toBe(160);
  });

  it("stamps 480×160 on the stage and frames (no custom size)", () => {
    const html = renderStage({ files: [previewFile()] });

    expect(html).toContain(`data-card-width="${CARD_WIDTH}"`);
    expect(html).toContain(`data-card-height="${CARD_HEIGHT}"`);
    expect(html).toContain(`width="${CARD_WIDTH}"`);
    expect(html).toContain(`height="${CARD_HEIGHT}"`);
    expect(html).toContain(`width:${CARD_WIDTH}px`);
    expect(html).toContain(`height:${CARD_HEIGHT}px`);
    expect(html).not.toContain('data-card-width="640"');
    expect(html).not.toContain('data-card-height="320"');
  });
});

describe("pair mode", () => {
  it("renders one figure when output_pair is false", () => {
    const html = renderStage({
      files: [previewFile()],
      output_pair: false,
      tab: "readme",
    });

    expect(html).toContain('data-output-pair="false"');
    expect(countSlot(html, "preview-wasm")).toBe(1);
    expect(countSlot(html, "readme-mode-file")).toBe(1);
    expect(html).toContain("<figcaption>stats.svg");
    expect(html).not.toContain("WASM layout light");
    expect(html).not.toContain(PAIR_CAPTIONS[1]);
  });

  it("renders two figures when output_pair is true", () => {
    const html = renderStage({
      response: PAIR_RESPONSE,
      output_pair: true,
      tab: "readme",
    });

    expect(html).toContain('data-output-pair="true"');
    expect(countSlot(html, "preview-wasm")).toBe(2);
    expect(countSlot(html, "readme-mode-file")).toBe(2);
    expect(html).toContain("stats.svg");
    expect(html).toContain("stats-dark.svg");
    expect(html).not.toContain("stats-light.svg");
    expect(html).toContain("WASM layout light");
    expect(html).toContain("WASM layout dark");
    expect(PAIR_CAPTIONS).toEqual(["Light", "Dark"]);
  });
});

describe("loading skeleton", () => {
  it("shows Skeleton figures while loading", () => {
    const html = renderStage({
      loading: true,
      output_pair: true,
      files: PAIR_FILES,
    });

    expect(html).toContain('data-loading="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-slot="skeleton"');
    expect(countSlot(html, "preview-skeleton")).toBe(4);
    expect(html).not.toContain('data-wasm="placeholder"');
    expect(html).not.toContain(`data:${PAIR_FILES[0]?.mime};base64,`);
  });
});

describe("layout WASM placeholder", () => {
  it("hosts an empty WASM slot instead of a second renderer", () => {
    const html = renderStage({ files: [previewFile()] });

    expect(html).toContain('data-slot="tabs"');
    expect(html).toContain(">Layout<");
    expect(html).toContain(">README<");
    expect(html).toContain('data-wasm="placeholder"');
    expect(html).toContain(WASM_PLACEHOLDER_NOTE);
    expect(html).not.toContain("takumi-js");
    expect(html).not.toContain("@takumi-rs/wasm");
    expect(html).not.toContain("<iframe");
  });
});

describe("README tab", () => {
  it("renders T312 ReadmeMode with accessible captions", () => {
    const slot = renderToStaticMarkup(
      createElement(ReadmeModeSlot, { files: [previewFile()] }),
    );
    const html = renderStage({
      files: [previewFile()],
      tab: "readme",
    });

    expect(slot).toContain('data-readme-mode="pane"');
    expect(slot).toContain("<figure");
    expect(slot).toContain("<figcaption>");
    expect(slot).toContain("stats.svg");
    expect(slot).toContain(`width="${CARD_WIDTH}"`);
    expect(slot).toContain(`height="${CARD_HEIGHT}"`);
    expect(html).toContain('data-readme-mode="pane"');
    expect(html).toContain("stats.svg");
  });
});

describe("prefers-reduced-motion", () => {
  it("reads matchMedia prefers-reduced-motion", () => {
    expect(
      prefersReducedMotion({
        matchMedia: () => ({ matches: true }) as MediaQueryList,
      }),
    ).toBe(true);
    expect(
      prefersReducedMotion({
        matchMedia: () => ({ matches: false }) as MediaQueryList,
      }),
    ).toBe(false);
    expect(prefersReducedMotion({ matchMedia: undefined })).toBe(false);
  });

  it("forces still + notice for motion formats", () => {
    const gif = previewFile({
      id: "demo",
      mime: "image/gif",
      filename: "demo.gif",
      bytesBase64: Buffer.from("GIF89a").toString("base64"),
    });
    const html = renderStage({
      files: [gif],
      format: "gif",
      reducedMotion: true,
      tab: "readme",
    });

    expect(html).toContain('data-reduced-motion="true"');
    expect(html).toContain(REDUCED_MOTION_NOTICE);
    expect(html).toContain('data-slot="reduced-motion-notice"');
    expect(html).toContain('role="status"');
    expect(html).not.toContain("data:image/gif;base64,");
    expect(isMotionFormat("gif")).toBe(true);
    expect(fileIsMotion(gif, "svg")).toBe(true);
  });

  it("shows the reduced-motion notice when files are empty", () => {
    const empty = renderStage({
      files: [],
      reducedMotion: true,
    });
    const omitted = renderStage({
      reducedMotion: true,
    });
    const off = renderStage({
      files: [],
      reducedMotion: false,
    });

    expect(withoutStyles(empty)).toContain('data-slot="reduced-motion-notice"');
    expect(empty).toContain(REDUCED_MOTION_NOTICE);
    expect(withoutStyles(empty)).toContain('role="status"');
    expect(withoutStyles(omitted)).toContain(
      'data-slot="reduced-motion-notice"',
    );
    expect(withoutStyles(off)).not.toContain(
      'data-slot="reduced-motion-notice"',
    );
    expect(off).not.toContain(REDUCED_MOTION_NOTICE);
  });
});

describe("no zip", () => {
  it("drops zip PreviewFiles from the stage", () => {
    const archive: PreviewFile = {
      id: "bundle",
      mime: "application/zip",
      bytesBase64: Buffer.from("PK").toString("base64"),
      filename: "widgets.zip",
    };
    expect(isZipPreviewFile(archive)).toBe(true);
    expect(visiblePreviewFiles([archive, previewFile()])).toEqual([
      previewFile(),
    ]);

    const html = renderStage({
      files: [archive],
      tab: "readme",
    });
    expect(html).not.toContain("widgets.zip");
    expect(html).not.toContain("application/zip");
    expect(html).not.toContain("data:application/zip");
    expect(html).not.toContain('download="');
  });
});

describe("preview-stage source", () => {
  it("uses docs Tabs/Skeleton, locked 480×160, T312 ReadmeMode, and no zip downloader", async () => {
    const source = await readFile(sourceUrl(), "utf8");

    expect(source).toContain('"use client"');
    expect(source).toContain("export const CARD_WIDTH = 480");
    expect(source).toContain("export const CARD_HEIGHT = 160");
    expect(source).toContain('from "@/components/ui/tabs"');
    expect(source).toContain('from "@/components/ui/skeleton"');
    expect(source).toContain(README_MODE_MODULE);
    expect(source).toContain("ReadmeMode");
    expect(source).toContain("prefers-reduced-motion");
    expect(source).toContain("<figcaption>");
    expect(source).toContain('data-wasm="placeholder"');
    expect(source).not.toContain("JSZip");
    expect(source).not.toContain("widgets.zip");
    expect(source).not.toMatch(/download.*zip/i);
    expect(source).not.toContain("new Zip");
  });
});
