import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serialize } from "./permalink";
import {
  PREVIEW_TOKEN_QUERY_KEYS,
  type PreviewRequest,
  type PreviewResponse,
} from "./types";
import {
  createPreviewController,
  isAutoPreviewScope,
  PREVIEW_DEBOUNCE_MS,
  PREVIEW_ENDPOINT,
  PREVIEW_FETCH_HEADERS,
  type PreviewFetch,
  postPreview,
  prefersReducedMotion,
  previewPermalink,
  toPreviewBody,
} from "./use-preview";

const PREVIEW_RESULT: PreviewResponse = {
  files: [
    {
      id: "github-demo",
      mime: "image/svg+xml",
      bytesBase64: "PHN2Zy8+",
      filename: "demo.svg",
    },
  ],
  provenance: "fixture",
  generatedAt: "2026-08-16T00:00:00.000Z",
};

const DEMO: PreviewRequest = {
  scope: "widget",
  plugin: "github",
  widget: "demo",
  options: { demo: { text: "hello", animate: true } },
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

const STATS: PreviewRequest = {
  scope: "widget",
  plugin: "github",
  widget: "stats",
  options: { stats: { animate: true } },
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

const LANGUAGES: PreviewRequest = {
  scope: "widget",
  plugin: "github",
  widget: "languages",
  options: { languages: { animate: true } },
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

const BIT: PreviewRequest = {
  scope: "bit",
  bit: "Theme",
  options: {},
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

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

function mockFetch(result: PreviewResponse = PREVIEW_RESULT): PreviewFetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => result,
  });
}

function postedCall(fetchFn: PreviewFetch): {
  url: string;
  init: RequestInit;
  body: Record<string, unknown>;
} {
  const mocked = vi.mocked(fetchFn);
  const [url, init] = mocked.mock.calls[0] ?? [];
  expect(url).toBe(PREVIEW_ENDPOINT);
  expect(init?.body).toEqual(expect.any(String));
  return {
    url: String(url),
    init: init as RequestInit,
    body: JSON.parse(String(init?.body)) as Record<string, unknown>,
  };
}

describe("isAutoPreviewScope", () => {
  it("auto-previews demo widget and bit scope", () => {
    expect(isAutoPreviewScope(DEMO)).toBe(true);
    expect(isAutoPreviewScope(BIT)).toBe(true);
    expect(
      isAutoPreviewScope({
        ...DEMO,
        scope: "plugin",
        plugin: "github",
        widget: "demo",
      }),
    ).toBe(true);
  });

  it("does not auto-preview stats, languages, or plugin-all", () => {
    expect(isAutoPreviewScope(STATS)).toBe(false);
    expect(isAutoPreviewScope(LANGUAGES)).toBe(false);
    expect(
      isAutoPreviewScope({
        scope: "plugin",
        plugin: "github",
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      }),
    ).toBe(false);
  });
});

describe("toPreviewBody / permalink tokens", () => {
  it("drops token fields from the POST body", () => {
    const body = toPreviewBody(tokenBag(DEMO));
    const blob = JSON.stringify(body);
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(body).not.toHaveProperty(key);
      expect(blob).not.toContain(key);
      expect(blob).not.toContain("secret");
    }
    expect(body).toEqual(toPreviewBody(DEMO));
  });

  it("previewPermalink matches serialize and never includes tokens", () => {
    const params = previewPermalink(tokenBag(STATS));
    expect(params.toString()).toBe(serialize(STATS).toString());
    const query = params.toString();
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(query).not.toContain(key);
    }
    expect(query).not.toContain("secret");
  });

  it("reduced-motion coerces gif/apng to still png and disables animate", () => {
    const motion: PreviewRequest = {
      ...DEMO,
      format: "gif",
      options: { demo: { text: "hello", animate: true } },
    };
    const still = toPreviewBody(motion, true);
    expect(still.format).toBe("png");
    expect(still.options.demo?.animate).toBe(false);
    expect(toPreviewBody(motion, false).format).toBe("gif");
  });
});

describe("createPreviewController debounce", () => {
  let fetchFn: PreviewFetch;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchFn = mockFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it(`debounces demo POST by ${PREVIEW_DEBOUNCE_MS}ms`, async () => {
    const controller = createPreviewController({
      fetch: fetchFn,
      reducedMotion: () => false,
    });

    controller.observe(DEMO);
    expect(fetchFn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS - 1);
    expect(fetchFn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledOnce();
    const { init, body } = postedCall(fetchFn);
    expect(init.method).toBe("POST");
    expect(init.method).not.toBe("GET");
    expect(body.scope).toBe("widget");
    expect(body.widget).toBe("demo");
    expect(body).not.toHaveProperty("token");
    controller.dispose();
  });

  it("resets the debounce window when demo state changes", async () => {
    const controller = createPreviewController({
      fetch: fetchFn,
      reducedMotion: () => false,
    });

    controller.observe(DEMO);
    await vi.advanceTimersByTimeAsync(150);
    controller.observe({
      ...DEMO,
      options: { demo: { text: "later", animate: true } },
    });
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS - 1);
    expect(fetchFn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledOnce();
    const { body } = postedCall(fetchFn);
    expect(body).toMatchObject({
      options: { demo: { text: "later", animate: true } },
    });
    controller.dispose();
  });

  it("debounces bit-scope POST", async () => {
    const controller = createPreviewController({
      fetch: fetchFn,
      reducedMotion: () => false,
    });

    controller.observe(BIT);
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS - 1);
    expect(fetchFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(postedCall(fetchFn).body.scope).toBe("bit");
    controller.dispose();
  });

  it("does not auto POST stats until generate()", async () => {
    const controller = createPreviewController({
      fetch: fetchFn,
      reducedMotion: () => false,
    });

    controller.observe(STATS);
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS * 5);
    expect(fetchFn).not.toHaveBeenCalled();

    await controller.generate(STATS);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(postedCall(fetchFn).body.widget).toBe("stats");
    controller.dispose();
  });

  it("does not auto POST languages until generate()", async () => {
    const controller = createPreviewController({
      fetch: fetchFn,
      reducedMotion: () => false,
    });

    controller.observe(LANGUAGES);
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS * 5);
    expect(fetchFn).not.toHaveBeenCalled();

    await controller.generate(LANGUAGES);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(postedCall(fetchFn).body.widget).toBe("languages");
    controller.dispose();
  });

  it("explicit generate POSTs stats immediately and strips tokens", async () => {
    const controller = createPreviewController({
      fetch: fetchFn,
      reducedMotion: () => false,
    });

    await controller.generate(tokenBag(STATS));
    expect(fetchFn).toHaveBeenCalledOnce();
    const { init, body } = postedCall(fetchFn);
    expect(init.method).toBe("POST");
    expect(init.method).not.toBe("GET");
    expect(body.widget).toBe("stats");
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(body).not.toHaveProperty(key);
    }
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(JSON.stringify(init)).not.toContain("secret");
    controller.dispose();
  });

  it("reduced-motion generate requests still bytes, not motion", async () => {
    const controller = createPreviewController({
      fetch: fetchFn,
      reducedMotion: () => true,
    });
    const motion: PreviewRequest = {
      ...DEMO,
      format: "apng",
      options: { demo: { text: "hello", animate: true } },
    };

    await controller.generate(motion);
    const { body } = postedCall(fetchFn);
    expect(body.format).toBe("png");
    expect(body).toMatchObject({
      options: { demo: { animate: false } },
    });
    controller.dispose();
  });

  it("never reads sessionStorage for visitor tokens", async () => {
    const getItem = vi.fn(() => "ghp_secret");
    const setItem = vi.fn();
    vi.stubGlobal("sessionStorage", { getItem, setItem, removeItem: vi.fn() });
    const controller = createPreviewController({
      fetch: fetchFn,
      reducedMotion: () => false,
    });

    controller.observe(DEMO);
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);
    await controller.generate(STATS);

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(fetchFn).mock.calls)).not.toContain(
      "ghp_secret",
    );
    controller.dispose();
  });
});

describe("postPreview", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("POSTs /api/preview with Accept JSON, same-origin, and no client cache", async () => {
    const fetchFn = mockFetch();
    await postPreview(DEMO, { fetch: fetchFn, reducedMotion: false });
    const { init, body } = postedCall(fetchFn);
    expect(init.method).toBe("POST");
    expect(init.method).not.toBe("GET");
    expect(init.credentials).toBe("same-origin");
    expect(init.headers).toEqual(PREVIEW_FETCH_HEADERS);
    expect(init.cache).toBeUndefined();
    expect(JSON.stringify(init.headers ?? {})).not.toMatch(/cache/i);
    expect(body).toEqual(toPreviewBody(DEMO, false));
  });

  it("never uses GET", async () => {
    const fetchFn = mockFetch();
    await postPreview(DEMO, { fetch: fetchFn, reducedMotion: false });
    for (const [, init] of vi.mocked(fetchFn).mock.calls) {
      expect(init?.method).toBe("POST");
      expect(String(init?.method).toUpperCase()).not.toBe("GET");
    }
  });
});

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is true only when the reduced-motion media query matches", () => {
    expect(prefersReducedMotion({ matches: true })).toBe(true);
    expect(prefersReducedMotion({ matches: false })).toBe(false);
    expect(prefersReducedMotion(undefined)).toBe(false);
  });
});

describe("usePreview source contract", () => {
  it("is a client hook that owns request state and POSTs without GET or cache", async () => {
    const source = await readFile(
      new URL("./use-preview.ts", import.meta.url),
      "utf8",
    );
    expect(source.startsWith('"use client";')).toBe(true);
    expect(source).toContain(
      "export function usePreview(initial: PreviewRequest)",
    );
    expect(source).toContain("setRequest");
    expect(source).toContain("createPreviewController");
    expect(source).toContain("PREVIEW_DEBOUNCE_MS");
    expect(source).toContain("isAutoPreviewScope");
    expect(source).toContain("toPreviewBody");
    expect(source).toContain("serialize");
    expect(source).toContain('Accept: "application/json"');
    expect(source).toContain('credentials: "same-origin"');
    expect(source).toContain("window.matchMedia");
    expect(source).toContain('method: "POST"');
    expect(source).not.toMatch(/method:\s*["']GET["']/);
    expect(source).not.toContain("cache:");
    expect(source).not.toMatch(
      /sessionStorage\.(getItem|setItem|removeItem|clear)/,
    );
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("Authorization");
  });
});
