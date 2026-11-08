import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PREVIEW_CACHE_CONTROL,
  PREVIEW_ROBOTS_TAG,
  type PreviewRequest,
  type PreviewResponse,
} from "../../../src/preview/types";

const mocks = vi.hoisted(() => ({
  assertPreviewOrigin: vi.fn(),
  renderPreview: vi.fn(),
}));

vi.mock("../../../src/preview/server/origin", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/preview/server/origin")
  >("../../../src/preview/server/origin");
  return {
    ...actual,
    assertPreviewOrigin: mocks.assertPreviewOrigin,
  };
});

vi.mock("../../../src/preview/server/render-preview", () => ({
  renderPreview: mocks.renderPreview,
}));

import { GET, POST, runtime } from "./route";

const PREVIEW_BODY: PreviewRequest = {
  scope: "plugin",
  plugin: "github",
  options: { format: "svg", theme: "dark", output_pair: false },
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

const MOCHA_CUSTOM_THEME = {
  custom: {
    bg: "#1e1e2e",
    card: "#181825",
    text: "#cdd6f4",
    muted: "#a6adc8",
    accent: "#cba6f7",
    border: "#6c7086",
  },
} as const;

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

function postRequest(body: unknown): Request {
  return new Request("https://docs.local/api/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/preview", () => {
  beforeEach(() => {
    mocks.assertPreviewOrigin.mockReset();
    mocks.renderPreview.mockReset();
    mocks.assertPreviewOrigin.mockReturnValue(undefined);
    mocks.renderPreview.mockResolvedValue(PREVIEW_RESULT);
  });

  it("uses the nodejs runtime", () => {
    expect(runtime).toBe("nodejs");
  });

  it("returns 200 with preview JSON after origin allowlist", async () => {
    const request = postRequest(PREVIEW_BODY);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(PREVIEW_RESULT);
    expect(mocks.assertPreviewOrigin).toHaveBeenCalledOnce();
    expect(mocks.assertPreviewOrigin).toHaveBeenCalledWith(request);
    expect(mocks.renderPreview).toHaveBeenCalledOnce();
    expect(mocks.renderPreview).toHaveBeenCalledWith(PREVIEW_BODY);
    expect(mocks.assertPreviewOrigin.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.renderPreview.mock.invocationCallOrder[0],
    );
  });

  it("sends Cache-Control no-store and X-Robots-Tag noindex", async () => {
    const response = await POST(postRequest(PREVIEW_BODY));

    expect(response.headers.get("Cache-Control")).toBe(PREVIEW_CACHE_CONTROL);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe(PREVIEW_ROBOTS_TAG);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("accepts a custom theme object with no token fields", async () => {
    const body = {
      ...PREVIEW_BODY,
      theme: MOCHA_CUSTOM_THEME,
      github_token: "ghp_secret",
      token: "secret-token",
    };
    const response = await POST(postRequest(body));
    const forwarded = mocks.renderPreview.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(PREVIEW_CACHE_CONTROL);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.renderPreview).toHaveBeenCalledOnce();
    expect(forwarded.theme).toEqual(MOCHA_CUSTOM_THEME);
    expect(forwarded).not.toHaveProperty("github_token");
    expect(forwarded).not.toHaveProperty("token");
    expect(JSON.stringify(forwarded)).not.toContain("ghp_secret");
  });

  it("returns 400 for a custom theme with an unknown swatch", async () => {
    const response = await POST(
      postRequest({
        ...PREVIEW_BODY,
        theme: {
          custom: {
            bg: "catppuccin-mocha.bg",
            card: "catppuccin-mocha.card",
            text: "catppuccin-mocha.text",
            muted: "catppuccin-mocha.muted",
            accent: "catppuccin-mocha.mau",
            border: "catppuccin-mocha.border",
          },
        },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(response.status).not.toBe(500);
    expect(json).toEqual({ error: "Invalid preview body" });
    expect(json).not.toHaveProperty("stack");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.renderPreview).not.toHaveBeenCalled();
  });

  it("returns 400 when custom output_pair is true without pair", async () => {
    const response = await POST(
      postRequest({
        ...PREVIEW_BODY,
        theme: MOCHA_CUSTOM_THEME,
        output_pair: true,
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(response.status).not.toBe(500);
    expect(json).toEqual({ error: "Invalid preview body" });
    expect(json).not.toHaveProperty("stack");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.renderPreview).not.toHaveBeenCalled();
  });

  it("rejects the string custom as a catalog id", async () => {
    const response = await POST(
      postRequest({
        ...PREVIEW_BODY,
        theme: "custom",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.renderPreview).not.toHaveBeenCalled();
  });

  it("does not forward token fields or zip to renderPreview", async () => {
    const response = await POST(
      postRequest({
        ...PREVIEW_BODY,
        github_token: "ghp_secret",
        committer_token: "ghs_secret",
        token: "secret-token",
        wakatime_token: "waka_secret",
        http_token_env: "HTTP_TOKEN",
        http_token: "http_secret",
        zip: "widgets.zip",
      }),
    );
    const forwarded = mocks.renderPreview.mock.calls[0]?.[0];
    const serialized = JSON.stringify(forwarded);

    expect(response.status).toBe(200);
    expect(forwarded).toEqual(PREVIEW_BODY);
    expect(forwarded).not.toHaveProperty("github_token");
    expect(forwarded).not.toHaveProperty("committer_token");
    expect(forwarded).not.toHaveProperty("token");
    expect(forwarded).not.toHaveProperty("wakatime_token");
    expect(forwarded).not.toHaveProperty("http_token_env");
    expect(forwarded).not.toHaveProperty("http_token");
    expect(forwarded).not.toHaveProperty("zip");
    expect(serialized).not.toContain("ghp_secret");
    expect(serialized).not.toContain("widgets.zip");
  });

  it("returns 400 for an empty body instead of 200 empty files", async () => {
    const response = await POST(postRequest({}));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "Invalid preview body" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(mocks.assertPreviewOrigin).toHaveBeenCalledOnce();
    expect(mocks.renderPreview).not.toHaveBeenCalled();
  });

  it("returns 400 for unknown plugins and widgets", async () => {
    const unknownPlugin = await POST(
      postRequest({
        ...PREVIEW_BODY,
        plugin: "spotify",
      }),
    );
    const unknownWidget = await POST(
      postRequest({
        scope: "widget",
        plugin: "github",
        widget: "heatmap",
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      }),
    );

    expect(unknownPlugin.status).toBe(400);
    expect(unknownWidget.status).toBe(400);
    expect(mocks.renderPreview).not.toHaveBeenCalled();
  });

  it("returns 400 when widget does not belong to plugin", async () => {
    const githubChips = await POST(
      postRequest({
        scope: "widget",
        plugin: "github",
        widget: "chips",
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      }),
    );
    const githubJson = await POST(
      postRequest({
        scope: "widget",
        plugin: "github",
        widget: "json",
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      }),
    );
    const githubCoding = await POST(
      postRequest({
        scope: "widget",
        plugin: "github",
        widget: "coding",
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      }),
    );

    expect(githubChips.status).toBe(400);
    expect(githubJson.status).toBe(400);
    expect(githubCoding.status).toBe(400);
    expect(await githubChips.json()).toEqual({ error: "Invalid preview body" });
    expect(githubChips.headers.get("Cache-Control")).toBe("no-store");
    expect(githubChips.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(mocks.renderPreview).not.toHaveBeenCalled();
  });

  it.each([
    ["wakatime", "coding"],
    ["rss", "feed"],
    ["http", "json"],
    ["http", "chips"],
  ] as const)(
    "forwards POST plugin %s widget %s to renderPreview",
    async (plugin, widget) => {
      const body = {
        scope: "widget" as const,
        plugin,
        widget,
        options: {},
        format: "svg" as const,
        theme: "dark" as const,
        output_pair: false,
        user: "octocat",
      };
      const response = await POST(postRequest(body));
      const forwarded = mocks.renderPreview.mock.calls[0]?.[0];

      expect(response.status).toBe(200);
      expect(forwarded).toEqual(body);
      expect(forwarded).not.toHaveProperty("github_token");
      expect(forwarded).not.toHaveProperty("wakatime_token");
      expect(forwarded).not.toHaveProperty("http_token");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    },
  );

  it("accepts plugin-scope http/wakatime/rss", async () => {
    for (const plugin of ["wakatime", "rss", "http"] as const) {
      mocks.renderPreview.mockClear();
      const body = {
        ...PREVIEW_BODY,
        plugin,
      };
      const response = await POST(postRequest(body));
      expect(response.status).toBe(200);
      expect(mocks.renderPreview).toHaveBeenCalledWith(
        expect.objectContaining({ scope: "plugin", plugin }),
      );
    }
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await POST(
      postRequest({
        scope: "plugin",
        plugin: "github",
        user: "octocat",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.renderPreview).not.toHaveBeenCalled();
  });

  it("returns 403 no-store when origin allowlist rejects", async () => {
    const { PreviewOriginError } = await import(
      "../../../src/preview/server/origin"
    );
    mocks.assertPreviewOrigin.mockImplementation(() => {
      throw new PreviewOriginError();
    });

    const response = await POST(postRequest(PREVIEW_BODY));

    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.renderPreview).not.toHaveBeenCalled();
  });

  it("returns 422 JSON when renderPreview throws TakumiRenderError", async () => {
    const { TakumiRenderError } = await import("@profile-bits/renderer");
    mocks.renderPreview.mockRejectedValue(
      new TakumiRenderError("empty Takumi tree"),
    );

    const response = await POST(postRequest(PREVIEW_BODY));
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json).toEqual({ error: "Preview render failed" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  });
});

describe("GET /api/preview", () => {
  beforeEach(() => {
    mocks.assertPreviewOrigin.mockReset();
    mocks.renderPreview.mockReset();
  });

  it("rejects GET with 405 Allow POST", () => {
    const response = GET(new Request("https://docs.local/api/preview"));

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(mocks.renderPreview).not.toHaveBeenCalled();
    expect(mocks.assertPreviewOrigin).not.toHaveBeenCalled();
  });

  it("sends no-store and noindex on GET 405", () => {
    const response = GET(new Request("https://docs.local/api/preview"));

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  });
});
