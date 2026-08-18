import { afterEach, describe, expect, it, vi } from "vitest";
import type { PreviewFile } from "../preview/types";
import {
  APNG_DOWNLOAD_MIME,
  downloadExportImage,
  previewFileToBlob,
  toExportImage,
  toExportImages,
} from "./export-image";

const BYTES_BASE64 = "cHJvZmlsZS1iaXRz";

function previewFile(overrides: Partial<PreviewFile> = {}): PreviewFile {
  return {
    id: "github-stats",
    mime: "image/png",
    bytesBase64: BYTES_BASE64,
    filename: "stats.png",
    ...overrides,
  };
}

function mockDownloadDocument(): {
  anchor: {
    href: string;
    download: string;
    rel: string;
    click: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  createElement: ReturnType<typeof vi.fn>;
  appendChild: ReturnType<typeof vi.fn>;
} {
  const click = vi.fn();
  const remove = vi.fn();
  const appendChild = vi.fn();
  const anchor = {
    href: "",
    download: "",
    rel: "",
    click,
    remove,
  };
  const createElement = vi.fn((tag: string) => {
    expect(tag).toBe("a");
    return anchor;
  });
  vi.stubGlobal("document", {
    createElement,
    body: { appendChild },
  });
  return { anchor, createElement, appendChild };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("previewFileToBlob / toExportImage", () => {
  it("returns a Blob whose type matches the preview mime", () => {
    const file = previewFile({
      mime: "image/svg+xml",
      filename: "stats.svg",
    });
    const blob = previewFileToBlob(file);
    const exported = toExportImage(file);
    expect(blob).toBeInstanceOf(Blob);
    expect(exported.blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/svg+xml");
    expect(exported.blob.type).toBe("image/svg+xml");
    expect(exported.mime).toBe("image/svg+xml");
    expect(exported.filename).toBe("stats.svg");
    expect(exported.blob.size).toBeGreaterThan(0);
  });

  it.each([
    ["image/png", "stats.png"],
    ["image/jpeg", "stats.jpeg"],
    ["image/webp", "stats.webp"],
    ["image/gif", "stats.gif"],
    ["image/x-icon", "stats.ico"],
  ] as const)("preserves blob type %s", (mime, filename) => {
    const blob = previewFileToBlob(previewFile({ mime, filename }));
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(mime);
  });
});

describe("apng download naming", () => {
  it("downloads APNG as .png with image/png (Camo has no image/apng)", () => {
    const exported = toExportImage(
      previewFile({
        mime: "image/apng",
        filename: "stats.apng",
      }),
    );
    expect(exported.blob).toBeInstanceOf(Blob);
    expect(exported.blob.type).toBe("image/png");
    expect(exported.mime).toBe(APNG_DOWNLOAD_MIME);
    expect(exported.mime).toBe("image/png");
    expect(exported.filename).toBe("stats.png");
    expect(exported.filename.endsWith(".png")).toBe(true);
    expect(exported.filename.endsWith(".apng")).toBe(false);
    expect(exported.blob.type).not.toBe("image/apng");
  });

  it("rewrites .apng filename even when mime is already image/png", () => {
    const exported = toExportImage(
      previewFile({
        mime: "image/png",
        filename: "languages.APNG",
      }),
    );
    expect(exported.filename).toBe("languages.png");
    expect(exported.mime).toBe("image/png");
    expect(exported.blob.type).toBe("image/png");
  });

  it("keeps .png when mime is image/apng", () => {
    const exported = toExportImage(
      previewFile({
        mime: "image/apng",
        filename: "demo.png",
      }),
    );
    expect(exported.filename).toBe("demo.png");
    expect(exported.blob.type).toBe("image/png");
  });
});

describe("zip is refused", () => {
  it("rejects application/zip", () => {
    expect(() =>
      toExportImage(
        previewFile({
          mime: "application/zip",
          filename: "widgets.zip",
        }),
      ),
    ).toThrow(/zip/i);
    expect(() =>
      previewFileToBlob(
        previewFile({
          mime: "application/zip",
          filename: "widgets.zip",
        }),
      ),
    ).toThrow(/zip/i);
  });

  it("rejects a .zip filename", () => {
    expect(() =>
      toExportImage(
        previewFile({
          mime: "image/png",
          filename: "cards.zip",
        }),
      ),
    ).toThrow(/zip/i);
  });

  it("rejects bundling multiple files into an archive", () => {
    expect(() =>
      toExportImages([previewFile(), previewFile({ id: "github-demo" })]),
    ).toThrow(/zip/i);
    expect(() => toExportImages([])).toThrow(/zip/i);
  });

  it("does not create a zip blob for a single image", () => {
    const exported = toExportImage(previewFile());
    expect(exported.blob.type).not.toMatch(/zip/i);
    expect(exported.mime).not.toMatch(/zip/i);
    expect(exported.filename.endsWith(".zip")).toBe(false);
    expect(exported.blob.type).toBe("image/png");
    expect(toExportImages([previewFile()]).blob.type).not.toMatch(/zip/i);
  });
});

describe("downloadExportImage", () => {
  it("triggers a file download via document.createElement", () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:export-image");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const { anchor, createElement, appendChild } = mockDownloadDocument();

    downloadExportImage(
      previewFile({
        mime: "image/apng",
        filename: "stats.apng",
      }),
    );

    expect(createElement).toHaveBeenCalledWith("a");
    expect(anchor.download).toBe("stats.png");
    expect(anchor.href).toBe("blob:export-image");
    expect(anchor.href.startsWith("http")).toBe(false);
    expect(anchor.href).not.toContain("token");
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:export-image");
  });

  it("does not download a zip", () => {
    mockDownloadDocument();
    expect(() =>
      downloadExportImage(
        previewFile({
          mime: "application/zip",
          filename: "widgets.zip",
        }),
      ),
    ).toThrow(/zip/i);
  });
});
