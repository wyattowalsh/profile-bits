import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PreviewFile, PreviewRequest } from "../types";
import {
  clearPreviewGithubCache,
  type PreviewGithubClient,
  renderPreview,
} from "./render-preview";

const fixtures = vi.hoisted(() => ({
  loadPreviewFixtures: vi.fn(
    async (): Promise<unknown> => ({
      wrapped: "t110-static",
    }),
  ),
}));

vi.mock("./fixtures", () => ({
  loadPreviewFixtures: fixtures.loadPreviewFixtures,
  getStaticFixtures: fixtures.loadPreviewFixtures,
}));

const GITHUB_HOSTS = [
  "api.github.com",
  "github.com",
  "raw.githubusercontent.com",
];

const FIXED_NOW = new Date("2026-08-16T00:00:00.000Z");

const FIXTURE_FILE: PreviewFile = {
  id: "stats",
  mime: "image/svg+xml",
  bytesBase64: Buffer.from("<svg></svg>").toString("base64"),
  filename: "stats.svg",
};

const STILL_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const MOTION_BYTES = new Uint8Array([0x47, 0x49, 0x46]);

const STATS_REQUEST: PreviewRequest = {
  scope: "widget",
  plugin: "github",
  widget: "stats",
  options: {},
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

const PRIVATE_STATS_REQUEST: PreviewRequest = {
  ...STATS_REQUEST,
  options: { stats: { include_private: true } },
};

function assertNoUnauthGithub(fetchMock: ReturnType<typeof vi.fn>): void {
  expect(fetchMock).not.toHaveBeenCalled();
  for (const call of fetchMock.mock.calls) {
    const target = String(call[0]);
    for (const host of GITHUB_HOSTS) {
      expect(target).not.toContain(host);
    }
    const init = call[1] as { headers?: HeadersInit } | undefined;
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBeNull();
  }
}

function clearTokenEnv(): void {
  vi.stubEnv("GITHUB_APP", "");
  vi.stubEnv("GITHUB_APP_TOKEN", "");
  vi.stubEnv("GITHUB_TOKEN", "");
}

function publicClient(
  overrides: Partial<PreviewGithubClient> = {},
): PreviewGithubClient {
  return {
    capabilities: { canPrivate: false },
    loadPayload: vi.fn(async () => ({ login: "octocat" })),
    ...overrides,
  };
}

describe("renderPreview", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearPreviewGithubCache();
    fixtures.loadPreviewFixtures.mockReset();
    fixtures.loadPreviewFixtures.mockResolvedValue({ wrapped: "t110-static" });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    clearTokenEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("missing token uses fixtures and sends zero GitHub", async () => {
    fixtures.loadPreviewFixtures.mockResolvedValue([FIXTURE_FILE]);

    const result = await renderPreview(STATS_REQUEST, { now: () => FIXED_NOW });

    expect(result.provenance).toBe("fixture");
    expect(result.generatedAt).toBe(FIXED_NOW.toISOString());
    expect(result.files).toEqual([FIXTURE_FILE]);
    expect(fixtures.loadPreviewFixtures).toHaveBeenCalledOnce();
    assertNoUnauthGithub(fetchMock);
  });

  it("empty and whitespace App tokens use fixtures (never unauth)", async () => {
    fixtures.loadPreviewFixtures.mockResolvedValue([FIXTURE_FILE]);

    for (const value of ["", "   ", "\t\n"]) {
      vi.stubEnv("GITHUB_APP", value);
      vi.stubEnv("GITHUB_APP_TOKEN", value);
      const result = await renderPreview(STATS_REQUEST, {
        now: () => FIXED_NOW,
      });
      expect(result.provenance).toBe("fixture");
      expect(result.files).toEqual([FIXTURE_FILE]);
    }

    assertNoUnauthGithub(fetchMock);
  });

  it("does not treat GITHUB_TOKEN as an App token", async () => {
    fixtures.loadPreviewFixtures.mockResolvedValue([FIXTURE_FILE]);
    vi.stubEnv("GITHUB_TOKEN", "ghp_not_an_app_token");
    const createGithubClient = vi.fn(async () => publicClient());

    const result = await renderPreview(STATS_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient,
    });

    expect(result.provenance).toBe("fixture");
    expect(result.files).toEqual([FIXTURE_FILE]);
    expect(createGithubClient).not.toHaveBeenCalled();
    assertNoUnauthGithub(fetchMock);
  });

  it("ignores visitor token fields on the body", async () => {
    fixtures.loadPreviewFixtures.mockResolvedValue([FIXTURE_FILE]);
    const leaked: PreviewRequest & { github_token: string; token: string } = {
      ...STATS_REQUEST,
      github_token: "ghp_visitor_must_not_be_used",
      token: "pat_visitor_must_not_be_used",
    };
    const createGithubClient = vi.fn(async () => publicClient());

    const result = await renderPreview(leaked, {
      now: () => FIXED_NOW,
      createGithubClient,
    });

    expect(result.provenance).toBe("fixture");
    expect(createGithubClient).not.toHaveBeenCalled();
    assertNoUnauthGithub(fetchMock);
  });

  it("include_private without canPrivate fails that widget", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const loadPayload = vi.fn(async () => ({ login: "octocat" }));
    const createGithubClient = vi.fn(async () => publicClient({ loadPayload }));
    const renderStill = vi.fn(async () => STILL_BYTES);

    const result = await renderPreview(PRIVATE_STATS_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient,
      renderStill,
    });

    expect(result.provenance).toBe("live");
    expect(result.files).toEqual([]);
    expect(loadPayload).toHaveBeenCalledOnce();
    expect(renderStill).not.toHaveBeenCalled();
    expect(createGithubClient).toHaveBeenCalledOnce();
    expect(createGithubClient).toHaveBeenCalledWith(
      "ghs_preview_test",
      "octocat",
    );
    assertNoUnauthGithub(fetchMock);
  });

  it("include_private without canPrivate fails languages and still renders demo", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const loadPayload = vi.fn(async () => ({ login: "octocat" }));
    const request: PreviewRequest = {
      scope: "plugin",
      plugin: "github",
      options: {
        languages: { include_private: true },
      },
      format: "png",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    };

    const result = await renderPreview(request, {
      now: () => FIXED_NOW,
      createGithubClient: async () => publicClient({ loadPayload }),
      renderStill: async (input) =>
        input.widget === "demo" ? STILL_BYTES : STILL_BYTES,
    });

    expect(result.files.map((file) => file.id)).toEqual(["demo", "stats"]);
    expect(result.files.some((file) => file.id === "languages")).toBe(false);
    expect(loadPayload).toHaveBeenCalledTimes(2);
    expect(loadPayload).toHaveBeenCalledWith(
      expect.objectContaining({ widget: "stats", includePrivate: false }),
    );
    expect(loadPayload).toHaveBeenCalledWith(
      expect.objectContaining({ widget: "languages", includePrivate: true }),
    );
    assertNoUnauthGithub(fetchMock);
  });

  it("never sends unauthenticated GitHub when a server token exists", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const createGithubClient = vi.fn(async (token: string, user: string) => {
      expect(token).toBe("ghs_preview_test");
      expect(user).toBe("octocat");
      expect(token.includes("?")).toBe(false);
      return publicClient();
    });

    await renderPreview(STATS_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient,
      renderStill: async () => STILL_BYTES,
    });

    expect(createGithubClient).toHaveBeenCalledOnce();
    assertNoUnauthGithub(fetchMock);
  });

  it("uses one github client per preview request", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const createGithubClient = vi.fn(async () => publicClient());
    const request: PreviewRequest = {
      scope: "plugin",
      plugin: "github",
      options: {},
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    };

    await renderPreview(request, {
      now: () => FIXED_NOW,
      createGithubClient,
      renderStill: async () => STILL_BYTES,
    });

    expect(createGithubClient).toHaveBeenCalledOnce();
  });

  it("rate limit / 403 falls back to fixtures with rate_limited provenance", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    fixtures.loadPreviewFixtures.mockResolvedValue([FIXTURE_FILE]);
    const loadPayload = vi.fn(async () => {
      throw Object.assign(new Error("github request failed"), {
        status: 403,
        body: { message: "API rate limit exceeded" },
      });
    });

    const result = await renderPreview(STATS_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient: async () => publicClient({ loadPayload }),
      renderStill: async () => STILL_BYTES,
    });

    expect(result.provenance).toBe("rate_limited");
    expect(result.files).toEqual([FIXTURE_FILE]);
    assertNoUnauthGithub(fetchMock);
  });

  it("429 falls back to fixtures with rate_limited provenance", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    fixtures.loadPreviewFixtures.mockResolvedValue([FIXTURE_FILE]);
    const loadPayload = vi.fn(async () => {
      throw Object.assign(new Error("github request failed"), { status: 429 });
    });

    const result = await renderPreview(STATS_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient: async () => publicClient({ loadPayload }),
    });

    expect(result.provenance).toBe("rate_limited");
    expect(result.files).toEqual([FIXTURE_FILE]);
    assertNoUnauthGithub(fetchMock);
  });

  it("missing T111e client falls back to fixtures without unauth HTTP", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    fixtures.loadPreviewFixtures.mockResolvedValue([FIXTURE_FILE]);

    const result = await renderPreview(STATS_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient: async () => null,
    });

    expect(result.provenance).toBe("fixture");
    expect(result.files).toEqual([FIXTURE_FILE]);
    assertNoUnauthGithub(fetchMock);
  });

  it("gif uses renderAnimation bytes, not ImageResponse stills", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const renderStill = vi.fn(async () => STILL_BYTES);
    const renderMotion = vi.fn(async () => MOTION_BYTES);

    const result = await renderPreview(
      { ...STATS_REQUEST, format: "gif" },
      {
        now: () => FIXED_NOW,
        createGithubClient: async () => publicClient(),
        renderStill,
        renderMotion,
      },
    );

    expect(renderMotion).toHaveBeenCalledOnce();
    expect(renderStill).not.toHaveBeenCalled();
    expect(result.files).toEqual([
      {
        id: "stats",
        mime: "image/gif",
        bytesBase64: Buffer.from(MOTION_BYTES).toString("base64"),
        filename: "stats.gif",
      },
    ]);
  });

  it("apng is image/png named .png from renderAnimation", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const renderStill = vi.fn(async () => STILL_BYTES);
    const renderMotion = vi.fn(async () => MOTION_BYTES);

    const result = await renderPreview(
      { ...STATS_REQUEST, format: "apng" },
      {
        now: () => FIXED_NOW,
        createGithubClient: async () => publicClient(),
        renderStill,
        renderMotion,
      },
    );

    expect(renderMotion).toHaveBeenCalledOnce();
    expect(renderStill).not.toHaveBeenCalled();
    expect(result.files).toEqual([
      {
        id: "stats",
        mime: "image/png",
        bytesBase64: Buffer.from(MOTION_BYTES).toString("base64"),
        filename: "stats.png",
      },
    ]);
  });

  it("animated webp uses renderAnimation", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const renderStill = vi.fn(async () => STILL_BYTES);
    const renderMotion = vi.fn(async () => MOTION_BYTES);

    const result = await renderPreview(
      {
        ...STATS_REQUEST,
        format: "webp",
        options: { stats: { animate: true } },
      },
      {
        now: () => FIXED_NOW,
        createGithubClient: async () => publicClient(),
        renderStill,
        renderMotion,
      },
    );

    expect(renderMotion).toHaveBeenCalledOnce();
    expect(renderStill).not.toHaveBeenCalled();
    expect(result.files[0]?.mime).toBe("image/webp");
    expect(result.files[0]?.filename).toBe("stats.webp");
  });

  it("never logs the App token", async () => {
    const token = "ghs_MUST_NOT_APPEAR_IN_LOGS";
    vi.stubEnv("GITHUB_APP", token);
    const lines: string[] = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      });
    }

    await renderPreview(PRIVATE_STATS_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient: async () => publicClient(),
      renderStill: async () => STILL_BYTES,
    });

    expect(lines.join("\n")).not.toContain(token);
  });

  it("plugin-scope stats 404 still renders demo", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const request: PreviewRequest = {
      scope: "plugin",
      plugin: "github",
      options: {},
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    };
    const loadPayload = vi.fn(async (input: { widget: string }) => {
      if (input.widget === "stats") {
        throw Object.assign(new Error("Not Found"), {
          outcome: "fail_widget",
          status: 404,
        });
      }
      return { login: "octocat" };
    });

    const result = await renderPreview(request, {
      now: () => FIXED_NOW,
      createGithubClient: async () => publicClient({ loadPayload }),
      renderStill: async () => STILL_BYTES,
    });

    expect(result.provenance).toBe("live");
    expect(result.files.map((file) => file.id)).toEqual(["demo", "languages"]);
    expect(result.files.some((file) => file.id === "stats")).toBe(false);
  });

  it("fail_widget without status skips that widget instead of fixtures", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    fixtures.loadPreviewFixtures.mockResolvedValue([FIXTURE_FILE]);
    const loadPayload = vi.fn(async () => {
      throw Object.assign(new Error("include_private requires canPrivate"), {
        outcome: "fail_widget",
      });
    });

    const result = await renderPreview(PRIVATE_STATS_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient: async () => ({
        capabilities: { canPrivate: true },
        loadPayload,
      }),
      renderStill: async () => STILL_BYTES,
    });

    expect(result.provenance).toBe("live");
    expect(result.files).toEqual([]);
    expect(fixtures.loadPreviewFixtures).not.toHaveBeenCalled();
  });

  it("include_private with user PAT and mismatched user fails the widget, not fixtures", async () => {
    vi.stubEnv("GITHUB_APP", "ghp_user_pat_not_a_secret");
    fixtures.loadPreviewFixtures.mockResolvedValue([FIXTURE_FILE]);
    const loadPayload = vi.fn(async () => {
      throw Object.assign(new Error("include_private requires canPrivate"), {
        outcome: "fail_widget",
      });
    });
    const createGithubClient = vi.fn(
      async (_token: string, configuredUser: string) => {
        expect(configuredUser).toBe("hubot");
        return publicClient({ loadPayload });
      },
    );

    const result = await renderPreview(
      { ...PRIVATE_STATS_REQUEST, user: "hubot" },
      {
        now: () => FIXED_NOW,
        createGithubClient,
        renderStill: async () => STILL_BYTES,
      },
    );

    expect(createGithubClient).toHaveBeenCalledWith(
      "ghp_user_pat_not_a_secret",
      "hubot",
    );
    expect(result.provenance).toBe("live");
    expect(result.files).toEqual([]);
    expect(fixtures.loadPreviewFixtures).not.toHaveBeenCalled();
  });

  it("does not reuse include_private cache across token identities", async () => {
    const payloadA = { login: "octocat", mark: "token-a" };
    const payloadB = { login: "octocat", mark: "token-b" };
    const loadA = vi.fn(async () => payloadA);
    const loadB = vi.fn(async () => payloadB);
    const seen: unknown[] = [];

    vi.stubEnv("GITHUB_APP", "ghs_token_a");
    await renderPreview(PRIVATE_STATS_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient: async () => ({
        capabilities: { canPrivate: true },
        loadPayload: loadA,
      }),
      renderStill: async (input) => {
        seen.push(input.payload);
        return STILL_BYTES;
      },
    });

    vi.stubEnv("GITHUB_APP", "ghs_token_b");
    await renderPreview(PRIVATE_STATS_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient: async () => ({
        capabilities: { canPrivate: true },
        loadPayload: loadB,
      }),
      renderStill: async (input) => {
        seen.push(input.payload);
        return STILL_BYTES;
      },
    });

    expect(loadA).toHaveBeenCalledOnce();
    expect(loadB).toHaveBeenCalledOnce();
    expect(seen).toEqual([payloadA, payloadB]);
  });

  it("fixture demo without a host renderer returns Takumi files", async () => {
    fixtures.loadPreviewFixtures.mockResolvedValue({
      demo: { text: "profile-bits", animate: true },
    });

    const result = await renderPreview(
      {
        scope: "widget",
        plugin: "github",
        widget: "demo",
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      },
      { now: () => FIXED_NOW },
    );

    expect(result.provenance).toBe("fixture");
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files[0]?.bytesBase64.length).toBeGreaterThan(0);
    expect(result.files[0]?.mime).toBe("image/svg+xml");
    assertNoUnauthGithub(fetchMock);
  });

  it("passes mocha as the resolved theme and keeps Primer off the request", async () => {
    const themes: unknown[] = [];
    const result = await renderPreview(
      { ...STATS_REQUEST, theme: "catppuccin-mocha" },
      {
        now: () => FIXED_NOW,
        renderStill: async (input) => {
          themes.push(input.theme);
          return STILL_BYTES;
        },
      },
    );
    expect(themes).toEqual(["catppuccin-mocha"]);
    expect(result.files[0]?.filename).toBe("stats.svg");
  });

  it("writes polarity files when output_pair is true", async () => {
    const themes: unknown[] = [];
    const result = await renderPreview(
      { ...STATS_REQUEST, theme: "catppuccin-mocha", output_pair: true },
      {
        now: () => FIXED_NOW,
        renderStill: async (input) => {
          themes.push(input.theme);
          return STILL_BYTES;
        },
      },
    );
    expect(themes).toEqual(["catppuccin-latte", "catppuccin-mocha"]);
    expect(result.files.map((file) => file.filename)).toEqual([
      "stats.svg",
      "stats-dark.svg",
    ]);
  });

  it("source does not construct GitHub URLs, zip, embeds, or log tokens", async () => {
    const source = await readFile(
      new URL("./render-preview.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("api.github.com");
    expect(source).not.toContain("?token=");
    expect(source).not.toContain("console.log");
    expect(source).not.toContain("application/zip");
    expect(source).not.toContain("/api/preview");
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).toContain("loadPreviewFixtures");
    expect(source).toContain("decideIncludePrivate");
    expect(source).toContain("isMissingToken");
    expect(source).toContain("classifyGithubHttp");
  });
});
