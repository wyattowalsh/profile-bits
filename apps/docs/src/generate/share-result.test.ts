import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canShareFiles,
  permalinkHref,
  previewFileToShareFile,
  shareFilename,
  shareMime,
  sharePreviewFile,
  tweetIntentUrl,
} from "@/src/generate/share-result";
import { serialize } from "@/src/preview/permalink";
import {
  PREVIEW_TOKEN_QUERY_KEYS,
  type PreviewFile,
  type PreviewRequest,
} from "@/src/preview/types";

const PNG_BYTES = "fake-png-bytes";

const PNG_FILE: PreviewFile = {
  id: "stats",
  mime: "image/png",
  bytesBase64: btoa(PNG_BYTES),
  filename: "stats.png",
};

const APNG_FILE: PreviewFile = {
  id: "demo",
  mime: "image/apng",
  bytesBase64: btoa("fake-apng-bytes"),
  filename: "demo.apng",
};

const PLUGIN_STATE: PreviewRequest = {
  scope: "plugin",
  plugin: "github",
  options: { demo: { text: "profile-bits", animate: true } },
  format: "apng",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

const WIDGET_STATE: PreviewRequest = {
  scope: "widget",
  plugin: "github",
  widget: "stats",
  options: {},
  format: "png",
  theme: "light",
  output_pair: true,
  user: "hubot",
};

const BIT_STATE: PreviewRequest = {
  scope: "bit",
  bit: "Theme",
  options: {},
  format: "svg",
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

function intentSharedUrl(tweet: string): URL {
  const intent = new URL(tweet);
  const shared = intent.searchParams.get("url");
  expect(shared).toBeTruthy();
  return new URL(shared as string);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("APNG file name", () => {
  it("renames .apng to .png and uses image/png", () => {
    expect(shareFilename(APNG_FILE)).toBe("demo.png");
    expect(shareMime(APNG_FILE)).toBe("image/png");
    const file = previewFileToShareFile(APNG_FILE);
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("demo.png");
    expect(file.type).toBe("image/png");
    expect(file.name.endsWith(".apng")).toBe(false);
  });

  it("keeps an already-.png APNG filename", () => {
    const preview: PreviewFile = {
      ...APNG_FILE,
      filename: "languages.png",
    };
    expect(shareFilename(preview)).toBe("languages.png");
    expect(previewFileToShareFile(preview).name).toBe("languages.png");
  });
});

describe("previewFileToShareFile", () => {
  it("builds an image File from PreviewFile bytes (not zip)", () => {
    const file = previewFileToShareFile(PNG_FILE);
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("stats.png");
    expect(file.type).toBe("image/png");
    expect(file.type).not.toContain("zip");
    expect(file.name.endsWith(".zip")).toBe(false);
  });

  it("refuses zip PreviewFiles", () => {
    const zip: PreviewFile = {
      id: "pack",
      mime: "application/zip",
      bytesBase64: btoa("PK"),
      filename: "widgets.zip",
    };
    expect(() => previewFileToShareFile(zip)).toThrow(/zip/i);
  });
});

describe("sharePreviewFile", () => {
  it("calls navigator.share({ files: [file] }) when canShare files is true", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { share, canShare });

    const result = await sharePreviewFile(PNG_FILE);

    expect(result).toEqual({ ok: true, reason: "shared" });
    expect(canShare).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledTimes(1);
    const data = share.mock.calls[0]?.[0] as ShareData;
    expect(data).toEqual({ files: [expect.any(File)] });
    expect(data.files).toHaveLength(1);
    expect(data.files?.[0]?.name).toBe("stats.png");
    expect(data.files?.[0]?.type).toBe("image/png");
    expect(data.url).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain("zip");
  });

  it("shares APNG as a .png File", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { share, canShare });

    const result = await sharePreviewFile(APNG_FILE);
    const data = share.mock.calls[0]?.[0] as ShareData;

    expect(result.ok).toBe(true);
    expect(data.files?.[0]?.name).toBe("demo.png");
    expect(data.files?.[0]?.type).toBe("image/png");
  });

  it("returns { ok: false, reason: unsupported } when share is missing", async () => {
    vi.stubGlobal("navigator", {});
    const result = await sharePreviewFile(PNG_FILE);
    expect(result).toEqual({ ok: false, reason: "unsupported" });
  });

  it("returns { ok: false, reason: files_unsupported } when canShare files is false", async () => {
    const share = vi.fn();
    const canShare = vi.fn().mockReturnValue(false);
    vi.stubGlobal("navigator", { share, canShare });

    const result = await sharePreviewFile(PNG_FILE);

    expect(result).toEqual({ ok: false, reason: "files_unsupported" });
    expect(share).not.toHaveBeenCalled();
    expect(canShareFiles(previewFileToShareFile(PNG_FILE))).toBe(false);
  });

  it("returns { ok: false, reason: aborted } on AbortError (no toast-only path)", async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException("canceled", "AbortError"));
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { share, canShare });

    const result = await sharePreviewFile(PNG_FILE);
    expect(result).toEqual({ ok: false, reason: "aborted" });
  });

  it("returns { ok: false, reason: failed } on other share errors", async () => {
    const share = vi.fn().mockRejectedValue(new Error("boom"));
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { share, canShare });

    const result = await sharePreviewFile(PNG_FILE);
    expect(result).toEqual({ ok: false, reason: "failed" });
  });

  it("does not call navigator.share for a zip", async () => {
    const share = vi.fn();
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { share, canShare });

    const result = await sharePreviewFile({
      id: "pack",
      mime: "application/zip",
      bytesBase64: btoa("PK"),
      filename: "widgets.zip",
    });

    expect(result).toEqual({ ok: false, reason: "failed" });
    expect(share).not.toHaveBeenCalled();
  });
});

describe("tweetIntentUrl", () => {
  it("uses the T309 permalink query, not a hosted image URL", () => {
    const tweet = tweetIntentUrl(PLUGIN_STATE, ORIGIN);
    const params = serialize(PLUGIN_STATE);
    const shared = intentSharedUrl(tweet);

    expect(tweet.startsWith("https://twitter.com/intent/tweet?")).toBe(true);
    expect(shared.origin).toBe(ORIGIN);
    expect(shared.pathname).toBe("/generate/github");
    expect(shared.searchParams.get("scope")).toBe("plugin");
    expect(shared.searchParams.get("plugin")).toBe("github");
    expect(shared.searchParams.get("format")).toBe("apng");
    expect(shared.searchParams.get("theme")).toBe("dark");
    expect(shared.searchParams.get("user")).toBe("octocat");
    expect(shared.searchParams.toString()).toBe(params.toString());

    expect(shared.pathname.endsWith(".png")).toBe(false);
    expect(shared.pathname).not.toMatch(/\.(gif|webp|jpe?g|apng|svg|ico)$/i);
    expect(tweet).not.toContain("/api/preview");
    expect(tweet).not.toContain("camo.githubusercontent.com");
    expect(tweet).not.toContain("data:image");
    expect(tweet).not.toContain("cdn.");
    expect(tweet).not.toContain("bytesBase64");
  });

  it("embeds widget and bit permalink paths with serialize params", () => {
    const widgetShared = intentSharedUrl(tweetIntentUrl(WIDGET_STATE, ORIGIN));
    expect(widgetShared.pathname).toBe("/generate/github/stats");
    expect(widgetShared.searchParams.get("scope")).toBe("widget");
    expect(widgetShared.searchParams.get("widget")).toBe("stats");
    expect(widgetShared.searchParams.toString()).toBe(
      serialize(WIDGET_STATE).toString(),
    );

    const bitShared = intentSharedUrl(tweetIntentUrl(BIT_STATE, ORIGIN));
    expect(bitShared.pathname).toBe("/generate/bits/Theme");
    expect(bitShared.searchParams.get("scope")).toBe("bit");
    expect(bitShared.searchParams.get("bit")).toBe("Theme");
  });

  it("never includes token keys even if the caller passes them", () => {
    const tweet = tweetIntentUrl(tokenBag(PLUGIN_STATE), ORIGIN);
    const href = permalinkHref(tokenBag(PLUGIN_STATE), ORIGIN);
    const shared = intentSharedUrl(tweet);
    const blob = `${tweet}\n${href}\n${decodeURIComponent(tweet)}`;

    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(tweet).not.toContain(key);
      expect(href).not.toContain(key);
      expect(shared.searchParams.has(key)).toBe(false);
      expect(blob).not.toContain(key);
    }
    expect(blob).not.toContain("ghp_secret");
    expect(blob).not.toContain("ghs_secret");
    expect(blob).not.toContain("secret-token");
    expect(blob).not.toContain("pat_secret");
    expect(blob).not.toContain("access_secret");
    expect(blob).not.toContain("Bearer");
    expect(blob).not.toContain("gist_secret");
  });

  it("never includes zip or extra plugin ids", () => {
    const withZip = {
      ...PLUGIN_STATE,
      zip: "widgets.zip",
      embed: "https://camo.githubusercontent.com/preview.png",
    } as PreviewRequest;
    const tweet = tweetIntentUrl(withZip, ORIGIN);
    const shared = intentSharedUrl(tweet);

    expect(tweet).not.toContain("zip");
    expect(tweet).not.toContain("widgets.zip");
    expect(shared.searchParams.has("zip")).toBe(false);
    expect(shared.searchParams.get("plugin")).toBe("github");
    expect(tweet).not.toContain("wakatime");
    expect(permalinkHref(PLUGIN_STATE, ORIGIN)).not.toContain("zip");
  });
});
