import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { permalinkHref, tweetIntentUrl } from "@/src/generate/share-result";
import {
  PREVIEW_TOKEN_QUERY_KEYS,
  type PreviewFile,
  type PreviewRequest,
} from "@/src/preview/types";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  COPY_LINK_LABEL,
  DOWNLOAD_LABEL,
  downloadPackFile,
  generatorPermalink,
  isZipPreviewFile,
  PackStage,
  REDUCED_MOTION_NOTICE,
  SHARE_LABEL,
  SHARE_STATUS,
  ShareFallback,
  sharePackFile,
  shouldShowShareFallback,
  TWEET_LABEL,
  visiblePackFiles,
} from "./pack-stage";

const BYTES_BASE64 = "cHJvZmlsZS1iaXRz";

const PNG_FILE: PreviewFile = {
  id: "github-stats",
  mime: "image/png",
  bytesBase64: BYTES_BASE64,
  filename: "stats.png",
};

const ZIP_FILE: PreviewFile = {
  id: "pack",
  mime: "application/zip",
  bytesBase64: btoa("PK"),
  filename: "widgets.zip",
};

const PLUGIN_STATE: PreviewRequest = {
  scope: "plugin",
  plugin: "github",
  options: { demo: { text: "profile-bits", animate: true } },
  format: "png",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

const ORIGIN = "https://docs.example";

function tokenBag(
  state: PreviewRequest,
): PreviewRequest & Record<(typeof PREVIEW_TOKEN_QUERY_KEYS)[number], string> {
  return {
    ...state,
    github_token: "ghp_secret",
    committer_token: "ghs_secret",
    token: "secret-token",
    pat: "pat_secret",
    access_token: "access_secret",
    authorization: "Bearer secret",
    gist_token: "gist_secret",
    http_token_env: "HTTP_TOKEN",
    http_token: "http_secret",
  };
}

function renderStage(
  overrides: Partial<{
    request: PreviewRequest;
    files: readonly PreviewFile[];
    loading: boolean;
    output_pair: boolean;
    origin: string;
    reducedMotion: boolean;
  }> = {},
): string {
  return renderToStaticMarkup(
    createElement(PackStage, {
      request: overrides.request ?? PLUGIN_STATE,
      files: overrides.files ?? [PNG_FILE],
      loading: overrides.loading,
      output_pair: overrides.output_pair,
      origin: overrides.origin ?? ORIGIN,
      reducedMotion: overrides.reducedMotion,
    }),
  );
}

function sourceUrl(): URL {
  return new URL("./pack-stage.tsx", import.meta.url);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PackStage primary CTAs", () => {
  it("renders Download, Share, and Copy generator link", () => {
    const html = renderStage();

    expect(html).toContain(`data-slot="pack-stage"`);
    expect(html).toContain(`data-primary-cta="download"`);
    expect(html).toContain(`data-primary-cta="share"`);
    expect(html).toContain(`data-primary-cta="copy-link"`);
    expect(html).toContain(`aria-label="${DOWNLOAD_LABEL}"`);
    expect(html).toContain(`aria-label="${SHARE_LABEL}"`);
    expect(html).toContain(DOWNLOAD_LABEL);
    expect(html).toContain(SHARE_LABEL);
    expect(html).toContain(COPY_LINK_LABEL);
    expect(html).toContain('type="button"');
    expect(html).toContain(`data-slot="pack-download"`);
    expect(html).toContain(`data-slot="pack-share"`);
    expect(html).toContain(`data-slot="pack-copy-link"`);
  });

  it("renders a 480x160 hero figure", () => {
    const html = renderStage();

    expect(CARD_WIDTH).toBe(480);
    expect(CARD_HEIGHT).toBe(160);
    expect(`${CARD_WIDTH}x${CARD_HEIGHT}`).toBe("480x160");
    expect(html).toContain(`data-slot="pack-card"`);
    expect(html).toContain(`data-card-width="${CARD_WIDTH}"`);
    expect(html).toContain(`data-card-height="${CARD_HEIGHT}"`);
    expect(html).toContain(`width="${CARD_WIDTH}"`);
    expect(html).toContain(`height="${CARD_HEIGHT}"`);
    expect(html).toContain("<figure");
    expect(html).toContain("480×160");
    expect(html).toContain("stats.png");
  });

  it("has no workflow yaml rail and no source editor", () => {
    const html = renderStage().toLowerCase();

    expect(html).not.toContain("workflow");
    expect(html).not.toContain("yaml");
    expect(html).not.toContain("code-rail");
    expect(html).not.toContain("source-drop");
    expect(html).not.toContain("sourcedrop");
    expect(html).not.toContain("source editor");
    expect(html).not.toContain("source-editor");
    expect(html).not.toContain("discoversource");
    expect(html).not.toContain("dropzone");
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain("application/zip");
    expect(html).not.toContain("widgets.zip");
    expect(html).not.toContain(".zip");
  });
});

describe("empty and loading Skeleton", () => {
  it("shows Skeleton while loading", () => {
    const html = renderStage({ loading: true, files: [PNG_FILE] });

    expect(html).toContain('data-loading="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-slot="skeleton"');
    expect(html).toContain('data-slot="pack-skeleton"');
    expect(html).toContain("<figure");
    expect(html).toContain(`data-card-width="${CARD_WIDTH}"`);
    expect(html).toContain(`data-card-height="${CARD_HEIGHT}"`);
    expect(html).not.toContain(`data:${PNG_FILE.mime};base64,`);
    expect(html).toContain(DOWNLOAD_LABEL);
    expect(html).toContain(SHARE_LABEL);
  });

  it("shows Skeleton when files are empty", () => {
    const html = renderStage({ files: [], loading: false });

    expect(html).toContain('data-empty="true"');
    expect(html).toContain('data-slot="skeleton"');
    expect(html).toContain('data-slot="pack-skeleton"');
    expect(html).toContain("<figure");
    expect(html).not.toContain('<figure data-slot="pack-card"');
    expect(html).toContain(DOWNLOAD_LABEL);
    expect(html).toContain(SHARE_LABEL);
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

    expect(empty).toContain('data-empty="true"');
    expect(empty).toContain('data-slot="pack-skeleton"');
    expect(empty).toContain(
      '<p data-slot="reduced-motion-notice" role="status">',
    );
    expect(empty).toContain(REDUCED_MOTION_NOTICE);
    expect(empty).toContain('data-reduced-motion="true"');
    expect(omitted).toContain(
      '<p data-slot="reduced-motion-notice" role="status">',
    );
    expect(off).not.toContain(
      '<p data-slot="reduced-motion-notice" role="status">',
    );
    expect(off).not.toContain(REDUCED_MOTION_NOTICE);
  });
});

describe("pack-stage source contract", () => {
  it("uses export-image + share-result and never codegen yaml/source-drop", async () => {
    const source = await readFile(sourceUrl(), "utf8");

    expect(source).toContain('"use client"');
    expect(source).toContain("downloadExportImage");
    expect(source).toContain("sharePreviewFile");
    expect(source).toContain("permalinkHref");
    expect(source).toContain("tweetIntentUrl");
    expect(source).toContain("CopyButton");
    expect(source).toContain("ShareResult");
    expect(source).toContain("shareResult.reason");
    expect(source).toContain(COPY_LINK_LABEL);
    expect(source).toContain("export const CARD_WIDTH");
    expect(source).toContain("480");
    expect(source).toContain("160");

    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("SourceDrop");
    expect(source).not.toContain("discoverSource");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toContain("@/src/codegen");
    expect(source).not.toContain("../codegen");
    expect(source).not.toContain("bit-samples");
    expect(source).not.toContain("@profile-bits/bits");
    expect(source).not.toContain("packages/bits");
    expect(source).not.toContain("JSZip");
    expect(source).not.toContain("widgets.zip");
    expect(source).not.toMatch(/type=["']file["']/);
    expect(source).not.toContain("textarea");
    expect(source).not.toContain("workflowYml");
    expect(source).not.toContain("Thin workflow");
  });
});

describe("generatorPermalink", () => {
  it("is the T309 permalink with no tokens", () => {
    const href = generatorPermalink(tokenBag(PLUGIN_STATE), ORIGIN);
    const expected = permalinkHref(PLUGIN_STATE, ORIGIN);

    expect(href).toBe(expected);
    expect(href).toContain("/generate/github");
    expect(href).not.toContain("/api/preview");
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(href).not.toContain(key);
    }
    expect(href).not.toContain("ghp_secret");
    expect(href).not.toContain("zip");
  });

  it("copies the permalink through CopyButton value", () => {
    const href = generatorPermalink(PLUGIN_STATE, ORIGIN);
    const html = renderStage();
    const escaped = href.replaceAll("&", "&amp;");

    expect(html).toContain(`data-permalink="${escaped}"`);
    expect(html).toContain(COPY_LINK_LABEL);
    expect(html).not.toContain("github_token");
    expect(html).not.toContain("ghp_secret");
  });
});

describe("downloadPackFile / sharePackFile", () => {
  it("downloads a single image via document.createElement", () => {
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
    vi.stubGlobal("document", {
      createElement: vi.fn(() => anchor),
      body: { appendChild },
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pack-stage");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    downloadPackFile(PNG_FILE);

    expect(anchor.download).toBe("stats.png");
    expect(anchor.href).toBe("blob:pack-stage");
    expect(anchor.download.endsWith(".zip")).toBe(false);
    expect(click).toHaveBeenCalledOnce();
  });

  it("refuses a zip download", () => {
    expect(isZipPreviewFile(ZIP_FILE)).toBe(true);
    expect(visiblePackFiles([ZIP_FILE, PNG_FILE])).toEqual([PNG_FILE]);
    expect(() => downloadPackFile(ZIP_FILE)).toThrow(/zip/i);
  });

  it("does not render zip files on the stage", () => {
    const html = renderStage({ files: [ZIP_FILE] });

    expect(html).toContain('data-slot="pack-skeleton"');
    expect(html).not.toContain("widgets.zip");
    expect(html).not.toContain("application/zip");
    expect(html).not.toContain('download="');
    expect(html).toContain(DOWNLOAD_LABEL);
    expect(html).toContain(SHARE_LABEL);
  });

  it("shares via navigator.share({ files })", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { share, canShare });

    const result = await sharePackFile(PNG_FILE);

    expect(result).toEqual({ ok: true, reason: "shared" });
    expect(share).toHaveBeenCalledTimes(1);
    const data = share.mock.calls[0]?.[0] as ShareData;
    expect(data.files).toHaveLength(1);
    expect(data.url).toBeUndefined();
  });
});

describe("ShareFallback", () => {
  it("branches on ShareResult.reason with visible text, not toast-only", () => {
    expect(shouldShowShareFallback("unsupported")).toBe(true);
    expect(shouldShowShareFallback("files_unsupported")).toBe(true);
    expect(shouldShowShareFallback("failed")).toBe(true);
    expect(shouldShowShareFallback("aborted")).toBe(false);
    expect(shouldShowShareFallback("shared")).toBe(false);

    for (const reason of [
      "unsupported",
      "files_unsupported",
      "failed",
    ] as const) {
      const html = renderToStaticMarkup(
        createElement(ShareFallback, {
          request: tokenBag(PLUGIN_STATE),
          origin: ORIGIN,
          reason,
        }),
      );
      const tweet = tweetIntentUrl(PLUGIN_STATE, ORIGIN);
      const hrefMatch = html.match(/\bhref="([^"]*)"/);
      const href = (hrefMatch?.[1] ?? "").replaceAll("&amp;", "&");

      expect(html).toContain(`data-slot="share-fallback"`);
      expect(html).toContain(`data-share-reason="${reason}"`);
      expect(html).toContain(reason);
      expect(html).toContain(SHARE_STATUS[reason]);
      expect(html).toContain(TWEET_LABEL);
      expect(href).toBe(tweet);
      expect(html).not.toContain("toast");
      expect(html.toLowerCase()).not.toContain("workflow");
      expect(html.toLowerCase()).not.toContain("yaml");
      for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
        expect(html).not.toContain(key);
      }
      expect(html).not.toContain("/api/preview");
    }
  });
});
