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
    const customTheme = {
      custom: {
        bg: "#1e1e2e",
        card: "#181825",
        text: "#cdd6f4",
        muted: "#a6adc8",
        accent: "#cba6f7",
        border: "#6c7086",
      },
    };
    const body = {
      ...PREVIEW_BODY,
      theme: customTheme,
      github_token: "ghp_secret",
      token: "secret-token",
    };
    const response = await POST(postRequest(body));
    const forwarded = mocks.renderPreview.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(PREVIEW_CACHE_CONTROL);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.renderPreview).toHaveBeenCalledOnce();
    expect(forwarded.theme).toEqual(customTheme);
    expect(forwarded).not.toHaveProperty("github_token");
    expect(forwarded).not.toHaveProperty("token");
    expect(JSON.stringify(forwarded)).not.toContain("ghp_secret");
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

  it("does not forward token fields to renderPreview", async () => {
    const response = await POST(
      postRequest({
        ...PREVIEW_BODY,
        github_token: "ghp_secret",
        committer_token: "ghs_secret",
        token: "secret-token",
      }),
    );
    const forwarded = mocks.renderPreview.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(forwarded).toEqual(PREVIEW_BODY);
    expect(forwarded).not.toHaveProperty("github_token");
    expect(forwarded).not.toHaveProperty("committer_token");
    expect(forwarded).not.toHaveProperty("token");
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
        plugin: "wakatime",
      }),
    );
    const unknownWidget = await POST(
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

    expect(unknownPlugin.status).toBe(400);
    expect(unknownWidget.status).toBe(400);
    expect(mocks.renderPreview).not.toHaveBeenCalled();
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
});

describe("GET /api/preview", () => {
  beforeEach(() => {
    mocks.assertPreviewOrigin.mockReset();
    mocks.renderPreview.mockReset();
  });

  it("rejects GET with 405", () => {
    const response = GET(new Request("https://docs.local/api/preview"));

    expect(response.status).toBe(405);
    expect(mocks.renderPreview).not.toHaveBeenCalled();
  });

  it("sends no-store and noindex on GET 405", () => {
    const response = GET(new Request("https://docs.local/api/preview"));

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  });
});
