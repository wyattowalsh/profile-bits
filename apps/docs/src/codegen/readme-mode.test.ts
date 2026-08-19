import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PreviewFile } from "@/src/preview/types";
import ReadmeModeDefault, {
  exportReadmeMarkdown,
  previewFileToDataUrl,
  README_APNG_MIME,
  README_CARD_HEIGHT,
  README_CARD_WIDTH,
  README_EMBED_EXAMPLE,
  README_MODE_CHECKLIST,
  README_OUTPUT_DIR,
  ReadmeMode,
  readmeDisplayFilename,
  readmeEmbedMarkdown,
  readmeModeDisplayMime,
} from "./readme-mode";

const SVG_BYTES = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${README_CARD_WIDTH}" height="${README_CARD_HEIGHT}" viewBox="0 0 ${README_CARD_WIDTH} ${README_CARD_HEIGHT}"></svg>`,
).toString("base64");
const PNG_BYTES = Buffer.from("fake-png-bytes").toString("base64");
const GIF_BYTES = Buffer.from("fake-gif-bytes").toString("base64");
const APNG_BYTES = Buffer.from("fake-apng-bytes").toString("base64");
const WEBP_BYTES = Buffer.from("fake-webp-bytes").toString("base64");

function previewFile(overrides: Partial<PreviewFile> = {}): PreviewFile {
  return {
    id: "stats",
    mime: "image/svg+xml",
    bytesBase64: SVG_BYTES,
    filename: "stats.svg",
    ...overrides,
  };
}

function renderReadmeMode(files?: readonly PreviewFile[]) {
  return renderToStaticMarkup(createElement(ReadmeMode, { files }));
}

function styleBlock(html: string): string {
  const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  expect(match).not.toBeNull();
  return match?.[1] ?? "";
}

function cssFromSource(source: string): string {
  const start = source.indexOf("const README_MODE_CSS");
  const open = source.indexOf("`", start);
  const close = source.indexOf("`;", open);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(open).toBeGreaterThan(start);
  expect(close).toBeGreaterThan(open);
  return source.slice(open, close);
}

function assertNoCssMotion(html: string): void {
  const css = styleBlock(html);
  expect(css).not.toMatch(/@keyframes/);
  expect(css).not.toMatch(/animation\s*:/);
  expect(html).not.toMatch(/<img[^>]*style="[^"]*animation/);
}

describe("previewFileToDataUrl / readmeModeDisplayMime", () => {
  it("builds an img data URL from PreviewFile bytesBase64", () => {
    const file = previewFile();
    expect(previewFileToDataUrl(file)).toBe(
      `data:image/svg+xml;base64,${SVG_BYTES}`,
    );
  });

  it("serves APNG as image/png even when mime is image/apng", () => {
    const file = previewFile({
      id: "demo",
      mime: "image/apng",
      bytesBase64: APNG_BYTES,
      filename: "demo.apng",
    });
    expect(readmeModeDisplayMime(file)).toBe(README_APNG_MIME);
    expect(readmeDisplayFilename(file)).toBe("demo.png");
    expect(previewFileToDataUrl(file)).toBe(
      `data:${README_APNG_MIME};base64,${APNG_BYTES}`,
    );
  });

  it("keeps gif and animated webp mime from renderAnimation bytes", () => {
    const gif = previewFile({
      mime: "image/gif",
      bytesBase64: GIF_BYTES,
      filename: "demo.gif",
    });
    const webp = previewFile({
      mime: "image/webp",
      bytesBase64: WEBP_BYTES,
      filename: "demo.webp",
    });
    expect(previewFileToDataUrl(gif)).toBe(
      `data:image/gif;base64,${GIF_BYTES}`,
    );
    expect(previewFileToDataUrl(webp)).toBe(
      `data:image/webp;base64,${WEBP_BYTES}`,
    );
  });
});

describe("readmeEmbedMarkdown", () => {
  it("emits a relative ./profile-bits/ path with widget alt", () => {
    expect(readmeEmbedMarkdown("stats.svg")).toBe(
      `![stats](./${README_OUTPUT_DIR}/stats.svg)`,
    );
    expect(readmeEmbedMarkdown("profile-bits/languages.png")).toBe(
      "![languages](./profile-bits/languages.png)",
    );
    expect(readmeEmbedMarkdown("demo.apng")).toBe(
      "![demo](./profile-bits/demo.png)",
    );
  });
});

describe("exportReadmeMarkdown", () => {
  it("emits relative markdown from PreviewFile rows", () => {
    const md = exportReadmeMarkdown([
      previewFile(),
      previewFile({
        id: "languages",
        filename: "languages.svg",
      }),
    ]);

    expect(md).toBe(
      "![stats](./profile-bits/stats.svg)\n![languages](./profile-bits/languages.svg)\n",
    );
    expect(md).toContain("./profile-bits/");
    expect(md).not.toMatch(/https?:\/\//);
    expect(md).not.toContain("https://camo");
    expect(md.toLowerCase()).not.toContain("zip");
  });

  it("emits relative markdown from widget ids, defaulting to svg", () => {
    expect(exportReadmeMarkdown(["stats"])).toBe(
      "![stats](./profile-bits/stats.svg)\n",
    );
    expect(exportReadmeMarkdown(["stats", "languages"])).toBe(
      "![stats](./profile-bits/stats.svg)\n![languages](./profile-bits/languages.svg)\n",
    );
    expect(exportReadmeMarkdown(["demo.apng"])).toBe(
      "![demo](./profile-bits/demo.png)\n",
    );
  });

  it("drops remote URLs, tokens, and non-image files", () => {
    const archive: PreviewFile = {
      id: "bundle",
      mime: "application/zip",
      bytesBase64: Buffer.from("PK").toString("base64"),
      filename: "widgets.zip",
    };
    const remote: PreviewFile = {
      id: "cdn",
      mime: "image/png",
      bytesBase64: PNG_BYTES,
      filename: "https://camo.githubusercontent.com/stats.png",
    };
    const tokenFile: PreviewFile = {
      id: "ghp_secretleaktoken",
      mime: "image/svg+xml",
      bytesBase64: SVG_BYTES,
      filename: "stats.svg",
    };

    const md = exportReadmeMarkdown([
      archive,
      remote,
      tokenFile,
      previewFile(),
    ]);
    const ids = exportReadmeMarkdown([
      "https://camo.githubusercontent.com/stats.svg",
      "ghp_secretleaktoken",
      "github_pat_secretleaktoken",
      "stats",
    ]);

    expect(md).toBe("![stats](./profile-bits/stats.svg)\n");
    expect(ids).toBe("![stats](./profile-bits/stats.svg)\n");
    expect(md).not.toContain("widgets.zip");
    expect(md).not.toContain("https://camo");
    expect(md).not.toContain("ghp_");
    expect(ids).not.toContain("https://");
    expect(ids).not.toContain("github_pat_");
  });
});

describe("ReadmeMode", () => {
  it("exports a default that is the named ReadmeMode pane", () => {
    expect(ReadmeModeDefault).toBe(ReadmeMode);
  });

  it("shows baked renderSvg bytes on an img, not a CSS loop on a still PNG", () => {
    const html = renderReadmeMode([previewFile()]);

    expect(html).toContain('data-slot="readme-mode"');
    expect(html).toContain('data-readme-mode="pane"');
    expect(html).toContain("<img");
    expect(html).toContain(`src="data:image/svg+xml;base64,${SVG_BYTES}"`);
    expect(html).toContain(`width="${README_CARD_WIDTH}"`);
    expect(html).toContain(`height="${README_CARD_HEIGHT}"`);
    expect(html).toContain("<code>renderSvg</code>");
    expect(html).toContain("<code>renderAnimation</code>");
    expect(html).toContain("![stats](./profile-bits/stats.svg)");
    expect(html).not.toContain("data:image/png;base64,");
    assertNoCssMotion(html);
  });

  it("shows renderAnimation gif/apng/webp bytes instead of a CSS-animated PNG", () => {
    const html = renderReadmeMode([
      previewFile({
        id: "gif",
        mime: "image/gif",
        bytesBase64: GIF_BYTES,
        filename: "demo.gif",
      }),
      previewFile({
        id: "apng",
        mime: "image/apng",
        bytesBase64: APNG_BYTES,
        filename: "demo.apng",
      }),
      previewFile({
        id: "webp",
        mime: "image/webp",
        bytesBase64: WEBP_BYTES,
        filename: "demo.webp",
      }),
    ]);

    expect(html).toContain(`src="data:image/gif;base64,${GIF_BYTES}"`);
    expect(html).toContain(`src="data:image/png;base64,${APNG_BYTES}"`);
    expect(html).toContain(`src="data:image/webp;base64,${WEBP_BYTES}"`);
    expect(html).toContain("demo.png");
    expect(html).not.toContain("demo.apng");
    expect(html).not.toContain("image/apng");
    assertNoCssMotion(html);
  });

  it("still shows the checklist and PreviewFile img when the renderer is missing", () => {
    const file = previewFile({
      mime: "image/png",
      bytesBase64: PNG_BYTES,
      filename: "stats.png",
    });
    const html = renderReadmeMode([file]);

    expect(html).toContain(`src="data:image/png;base64,${PNG_BYTES}"`);
    expect(html).toContain('data-slot="readme-mode-checklist"');
    for (const item of README_MODE_CHECKLIST) {
      expect(html).toContain(item.label);
    }
  });

  it("keeps the checklist when there are no files", () => {
    const html = renderReadmeMode([]);
    const labels = README_MODE_CHECKLIST.map((item) => item.label).join("\n");

    expect(html).toContain('data-slot="readme-mode-empty"');
    expect(html).not.toContain("<img");
    expect(html).toContain("GitHub README constraints");
    expect(html).toContain(README_EMBED_EXAMPLE);
    expect(html).toContain(`${README_CARD_WIDTH}×${README_CARD_HEIGHT}`);
    expect(html).toContain("Do not hotlink a CDN or Camo URL");
    expect(labels).toMatch(/baked still/i);
    expect(labels).toMatch(/foreignObject/i);
    expect(labels).toMatch(/SMIL/i);
    expect(labels).toMatch(/APNG is served and named as PNG/i);
    expect(labels).toMatch(/Action commits widget files/i);
    expect(labels).toMatch(/does not patch README\.md/i);
    expect(labels).toMatch(/gist is optional publish/i);
    expect(labels).toMatch(/relative committed files/i);
    expect(labels).toMatch(/do not hotlink gist raw as a CDN/i);
    expect(labels).not.toMatch(/\.zip/i);
    for (const item of README_MODE_CHECKLIST) {
      expect(html).toContain(`data-checklist-id="${item.id}"`);
      expect(html).toContain(item.label);
    }
  });

  it("does not claim Camo prediction or sanitize rewriting", async () => {
    const source = await readFile(
      new URL("./readme-mode.tsx", import.meta.url),
      "utf8",
    );
    const html = renderReadmeMode([previewFile()]);
    const blob = `${source}\n${html}`;
    const lower = blob.toLowerCase();

    expect(html).toContain("not a Camo");
    expect(html).toContain("?sanitize=true");
    expect(html).toContain("oracle");
    expect(html).toContain("does not predict rewriting");
    expect(html).toContain("Do not hotlink a CDN or Camo URL");
    expect(lower).not.toContain("https://camo");
    expect(lower).not.toContain("xml rewriter");
    expect(lower).not.toMatch(/camo.{0,80}rewrit/);
    expect(lower).not.toMatch(/predicts?\s+camo/);
    expect(lower).not.toMatch(/sanitize(?:r)?\s+rewrit/);
    expect(lower).not.toMatch(/simulat(?:e|es|ing)\s+camo/);
    expect(html.toLowerCase()).not.toContain("zip");
    expect(source.toLowerCase()).not.toContain("zip");
  });

  it("hides archive files from the README pane", () => {
    const archive: PreviewFile = {
      id: "bundle",
      mime: "application/zip",
      bytesBase64: Buffer.from("PK").toString("base64"),
      filename: "widgets.zip",
    };
    const html = renderReadmeMode([archive, previewFile()]);

    expect(html).toContain(`src="data:image/svg+xml;base64,${SVG_BYTES}"`);
    expect(html).not.toContain("widgets.zip");
    expect(html).not.toContain("application/zip");
    expect(html).not.toContain("data:application/zip");
  });
});

describe("readme-mode ownership", () => {
  it("does not import renderer, generate, preview-stage, core index, bits, or openspec", async () => {
    const source = await readFile(
      new URL("./readme-mode.tsx", import.meta.url),
      "utf8",
    );
    const css = cssFromSource(source);

    expect(source).toContain('"use client"');
    expect(source).toContain("bytesBase64");
    expect(source).toContain("exportReadmeMarkdown");
    expect(source).not.toContain("@profile-bits/renderer");
    expect(source).not.toContain("@/src/generate");
    expect(source).not.toContain("preview-stage");
    expect(source).not.toContain("packages/bits");
    expect(source).not.toContain("openspec");
    expect(source).not.toMatch(/from ["']@profile-bits\/core["']/);
    expect(css).not.toMatch(/@keyframes/);
    expect(css).not.toMatch(/animation\s*:/);
  });
});
