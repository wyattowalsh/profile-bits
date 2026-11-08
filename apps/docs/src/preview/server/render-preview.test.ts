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

const REPO_REQUEST: PreviewRequest = {
  scope: "widget",
  plugin: "github",
  widget: "repo",
  options: { repo: { repo: "octocat/Hello-World" } },
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

function packWidgetRequest(
  plugin: "wakatime" | "rss" | "http",
  widget: "coding" | "feed" | "json" | "chips",
): PreviewRequest {
  return {
    scope: "widget",
    plugin,
    widget,
    options: {},
    format: "svg",
    theme: "dark",
    output_pair: false,
    user: "octocat",
  };
}

const CODING_REQUEST = packWidgetRequest("wakatime", "coding");
const FEED_REQUEST = packWidgetRequest("rss", "feed");
const JSON_REQUEST = packWidgetRequest("http", "json");
const CHIPS_REQUEST = packWidgetRequest("http", "chips");

function decodeSvg(file: PreviewFile | undefined): string {
  expect(file).toBeDefined();
  return Buffer.from(file?.bytesBase64 ?? "", "base64").toString("utf8");
}

const HELLO_WORLD_REPO = {
  name: "Hello-World",
  fullName: "octocat/Hello-World",
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
  vi.stubEnv("WAKATIME_PREVIEW_TOKEN", "");
  vi.stubEnv("WAKATIME_APP", "");
  vi.stubEnv("WAKATIME_TOKEN", "");
  vi.stubEnv("PREVIEW_HTTP_LIVE", "");
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

  it("renders a custom theme object as the selected mix", async () => {
    const themes: unknown[] = [];
    const result = await renderPreview(
      {
        ...STATS_REQUEST,
        theme: {
          custom: {
            bg: "catppuccin-mocha.bg",
            card: "catppuccin-mocha.card",
            text: "catppuccin-mocha.text",
            muted: "catppuccin-mocha.muted",
            accent: "catppuccin-mocha.accent",
            border: "catppuccin-mocha.border",
            pair: "catppuccin-latte",
          },
        },
        output_pair: true,
      },
      {
        now: () => FIXED_NOW,
        renderStill: async (input) => {
          themes.push(input.theme);
          return STILL_BYTES;
        },
      },
    );
    expect(themes[0]).toBe("catppuccin-latte");
    expect(themes[1]).toMatchObject({ bg: "#1e1e2e" });
    expect(result.files.map((file) => file.filename)).toEqual([
      "stats.svg",
      "stats-dark.svg",
    ]);
    expect(result.files.map((file) => file.filename)).not.toContain(
      "stats-light.svg",
    );
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
    expect(source).toContain("usesGithubIntegration");
    expect(source).toContain("githubPreviewNode");
    expect(source).toContain("codingTemplate");
    expect(source).toContain("feedTemplate");
    expect(source).toContain("jsonTemplate");
    expect(source).toContain("chipFixture");
    expect(source).toContain("loadRssPreviewItems");
    expect(source).toContain("last_7_days.json");
    expect(source).toContain("createWakatimeClient");
    expect(source).toContain("createRssClient");
    expect(source).toContain("createHttpClient");
    expect(source).toContain("createHtmlScrapeClient");
    expect(source).toContain("WAKATIME_PREVIEW_TOKEN");
    expect(source).toContain("WAKATIME_APP");
    expect(source).toContain("PREVIEW_HTTP_LIVE");
    expect(source).toContain("isGithubOwnedHost");
  });

  it("plugin scope without a widget id does not auto-render repo", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const seen: string[] = [];
    const loadPayload = vi.fn(async () => ({ login: "octocat" }));
    const request: PreviewRequest = {
      scope: "plugin",
      plugin: "github",
      options: {},
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    };

    const result = await renderPreview(request, {
      now: () => FIXED_NOW,
      createGithubClient: async () => publicClient({ loadPayload }),
      renderStill: async (input) => {
        if (input.widget !== undefined) {
          seen.push(input.widget);
        }
        return STILL_BYTES;
      },
    });

    expect(seen).toEqual(["demo", "stats", "languages"]);
    expect(result.files.map((file) => file.id)).toEqual([
      "demo",
      "stats",
      "languages",
    ]);
    expect(loadPayload).not.toHaveBeenCalledWith(
      expect.objectContaining({ widget: "repo" }),
    );
    assertNoUnauthGithub(fetchMock);
  });

  it("explicit widget=repo loads github payload with include flags false", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const loadPayload = vi.fn(async () => ({
      repository: HELLO_WORLD_REPO,
    }));

    const result = await renderPreview(REPO_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient: async () => publicClient({ loadPayload }),
      renderStill: async () => STILL_BYTES,
    });

    expect(result.provenance).toBe("live");
    expect(result.files.map((file) => file.id)).toEqual(["repo"]);
    expect(result.files[0]?.filename).toBe("repo.svg");
    expect(loadPayload).toHaveBeenCalledOnce();
    expect(loadPayload).toHaveBeenCalledWith({
      user: "octocat",
      widget: "repo",
      includePrivate: false,
      includeForks: false,
      includeArchived: false,
      repo: "octocat/Hello-World",
    });
    assertNoUnauthGithub(fetchMock);
  });

  it("maps fixture repos[0] Hello-World onto payload.repository", async () => {
    fixtures.loadPreviewFixtures.mockResolvedValue({
      repos: [HELLO_WORLD_REPO, { name: "Spoon-Knife" }],
    });
    const seen: unknown[] = [];

    const result = await renderPreview(REPO_REQUEST, {
      now: () => FIXED_NOW,
      renderStill: async (input) => {
        seen.push(input.payload);
        return STILL_BYTES;
      },
    });

    expect(result.provenance).toBe("fixture");
    expect(seen).toEqual([
      {
        repos: [HELLO_WORLD_REPO, { name: "Spoon-Knife" }],
        repository: HELLO_WORLD_REPO,
      },
    ]);
    expect(fixtures.loadPreviewFixtures).toHaveBeenCalledOnce();
    assertNoUnauthGithub(fetchMock);
  });

  it("keeps loadPayload.repository when fixtures already include it", async () => {
    const existing = { name: "already-present" };
    fixtures.loadPreviewFixtures.mockResolvedValue({
      repository: existing,
      repos: [HELLO_WORLD_REPO],
    });
    const seen: unknown[] = [];

    await renderPreview(REPO_REQUEST, {
      now: () => FIXED_NOW,
      renderStill: async (input) => {
        seen.push(input.payload);
        return STILL_BYTES;
      },
    });

    expect(seen).toEqual([
      {
        repository: existing,
        repos: [HELLO_WORLD_REPO],
      },
    ]);
    assertNoUnauthGithub(fetchMock);
  });

  it("animated webp for repo uses renderAnimation when repo.animate is true", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const renderStill = vi.fn(async () => STILL_BYTES);
    const renderMotion = vi.fn(async () => MOTION_BYTES);

    const result = await renderPreview(
      {
        ...REPO_REQUEST,
        format: "webp",
        options: { repo: { animate: true, repo: "octocat/Hello-World" } },
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
    expect(result.files[0]?.filename).toBe("repo.webp");
  });

  it("maps loadPayload repos[0] onto repository when omitted", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const loadPayload = vi.fn(async () => ({
      repos: [HELLO_WORLD_REPO],
    }));
    const seen: unknown[] = [];

    await renderPreview(REPO_REQUEST, {
      now: () => FIXED_NOW,
      createGithubClient: async () => publicClient({ loadPayload }),
      renderStill: async (input) => {
        seen.push(input.payload);
        return STILL_BYTES;
      },
    });

    expect(seen).toEqual([
      {
        repos: [HELLO_WORLD_REPO],
        repository: HELLO_WORLD_REPO,
      },
    ]);
    assertNoUnauthGithub(fetchMock);
  });

  it("uses options.repo.filename for the preview file stem", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");

    const result = await renderPreview(
      {
        ...REPO_REQUEST,
        options: {
          repo: { filename: "hello-world", repo: "octocat/Hello-World" },
        },
      },
      {
        now: () => FIXED_NOW,
        createGithubClient: async () => publicClient(),
        renderStill: async () => STILL_BYTES,
      },
    );

    expect(result.files[0]?.filename).toBe("hello-world.svg");
  });

  it.each([
    ["coding", CODING_REQUEST, "wakatime.svg"],
    ["feed", FEED_REQUEST, "feed.svg"],
    ["json", JSON_REQUEST, "json.svg"],
    ["chips", CHIPS_REQUEST, "chips.svg"],
  ] as const)(
    "dispatches %s from non-empty fixtures with no GitHub HTTP",
    async (widget, request, filename) => {
      const seen: unknown[] = [];
      const createGithubClient = vi.fn(async () => publicClient());

      const result = await renderPreview(request, {
        now: () => FIXED_NOW,
        createGithubClient,
        renderStill: async (input) => {
          expect(input.widget).toBe(widget);
          seen.push(input.payload);
          return STILL_BYTES;
        },
      });

      expect(result.provenance).toBe("fixture");
      expect(result.generatedAt).toBe(FIXED_NOW.toISOString());
      expect(result.files).toEqual([
        {
          id: widget,
          mime: "image/svg+xml",
          bytesBase64: Buffer.from(STILL_BYTES).toString("base64"),
          filename,
        },
      ]);
      expect(seen).toHaveLength(1);
      expect(seen[0]).not.toEqual({ wrapped: "t110-static" });
      expect(createGithubClient).not.toHaveBeenCalled();
      assertNoUnauthGithub(fetchMock);
    },
  );

  it("coding fixture payload is last_7_days, not empty-state", async () => {
    const seen: unknown[] = [];

    await renderPreview(CODING_REQUEST, {
      now: () => FIXED_NOW,
      renderStill: async (input) => {
        seen.push(input.payload);
        return STILL_BYTES;
      },
    });

    const payload = seen[0] as {
      human_readable_total?: string;
      languages?: { name: string }[];
      editors?: { name: string }[];
    };
    expect(payload.human_readable_total).toBe("3 hrs 25 mins");
    expect(payload.languages?.map((row) => row.name)).toEqual([
      "TypeScript",
      "Python",
      "Go",
    ]);
    expect(payload.editors?.map((row) => row.name)).toEqual([
      "VS Code",
      "Neovim",
    ]);
    assertNoUnauthGithub(fetchMock);
  });

  it("feed fixture payload is the Atom items, not empty", async () => {
    const seen: unknown[] = [];

    await renderPreview(FEED_REQUEST, {
      now: () => FIXED_NOW,
      renderStill: async (input) => {
        seen.push(input.payload);
        return STILL_BYTES;
      },
    });

    const items = seen[0] as { title?: string }[];
    expect(Array.isArray(items)).toBe(true);
    expect(items.map((item) => item.title)).toEqual([
      "Atom Item 1",
      "Atom Item 2",
      "Atom Item 3",
      "Atom Item 4",
      "Atom Item 5",
    ]);
    assertNoUnauthGithub(fetchMock);
  });

  it("json fixture payload is the committed sample", async () => {
    const seen: unknown[] = [];

    await renderPreview(JSON_REQUEST, {
      now: () => FIXED_NOW,
      renderStill: async (input) => {
        seen.push(input.payload);
        return STILL_BYTES;
      },
    });

    expect(seen).toEqual([{ name: "octocat", count: 3 }]);
    assertNoUnauthGithub(fetchMock);
  });

  it("chips fixture payload is chipFixture shieldcn/npm", async () => {
    const seen: unknown[] = [];

    await renderPreview(CHIPS_REQUEST, {
      now: () => FIXED_NOW,
      renderStill: async (input) => {
        seen.push(input.payload);
        return STILL_BYTES;
      },
    });

    const payloads = seen[0] as { label?: string; value?: string }[];
    expect(Array.isArray(payloads)).toBe(true);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.label).toBe("npm");
    expect(payloads[0]?.value).toBe("19.1.1");
    assertNoUnauthGithub(fetchMock);
  });

  it("App token does not live-fetch coding/feed/json/chips", async () => {
    vi.stubEnv("GITHUB_APP", "ghs_preview_test");
    const createGithubClient = vi.fn(async () => publicClient());

    for (const request of [
      CODING_REQUEST,
      FEED_REQUEST,
      JSON_REQUEST,
      CHIPS_REQUEST,
    ]) {
      const result = await renderPreview(request, {
        now: () => FIXED_NOW,
        createGithubClient,
        renderStill: async () => STILL_BYTES,
      });
      expect(result.provenance).toBe("fixture");
    }

    expect(createGithubClient).not.toHaveBeenCalled();
    assertNoUnauthGithub(fetchMock);
  });

  it("plugin-scope wakatime renders coding only", async () => {
    const seen: string[] = [];
    const request: PreviewRequest = {
      scope: "plugin",
      plugin: "wakatime",
      options: {},
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    };

    const result = await renderPreview(request, {
      now: () => FIXED_NOW,
      renderStill: async (input) => {
        if (input.widget !== undefined) {
          seen.push(input.widget);
        }
        return STILL_BYTES;
      },
    });

    expect(result.provenance).toBe("fixture");
    expect(seen).toEqual(["coding"]);
    expect(result.files.map((file) => file.id)).toEqual(["coding"]);
    assertNoUnauthGithub(fetchMock);
  });

  it("plugin-scope http renders json and chips", async () => {
    const seen: string[] = [];
    const request: PreviewRequest = {
      scope: "plugin",
      plugin: "http",
      options: {},
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    };

    const result = await renderPreview(request, {
      now: () => FIXED_NOW,
      renderStill: async (input) => {
        if (input.widget !== undefined) {
          seen.push(input.widget);
        }
        return STILL_BYTES;
      },
    });

    expect(result.provenance).toBe("fixture");
    expect(seen).toEqual(["json", "chips"]);
    expect(result.files.map((file) => file.id)).toEqual(["json", "chips"]);
    assertNoUnauthGithub(fetchMock);
  });

  it("plugin-scope rss renders feed only", async () => {
    const seen: string[] = [];
    const request: PreviewRequest = {
      scope: "plugin",
      plugin: "rss",
      options: {},
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    };

    const result = await renderPreview(request, {
      now: () => FIXED_NOW,
      renderStill: async (input) => {
        if (input.widget !== undefined) {
          seen.push(input.widget);
        }
        return STILL_BYTES;
      },
    });

    expect(seen).toEqual(["feed"]);
    expect(result.files.map((file) => file.id)).toEqual(["feed"]);
  });

  it("honors coding/feed/json/chips filename options", async () => {
    const cases: [PreviewRequest, string][] = [
      {
        ...CODING_REQUEST,
        options: { coding: { filename: "hours" } },
      },
      {
        ...FEED_REQUEST,
        options: { feed: { filename: "blog" } },
      },
      {
        ...JSON_REQUEST,
        options: { json: { filename: "api" } },
      },
      {
        ...CHIPS_REQUEST,
        options: { chips: { filename: "badges" } },
      },
    ].map((request, index) => {
      const names = ["hours.svg", "blog.svg", "api.svg", "badges.svg"];
      return [request, names[index] ?? ""] as [PreviewRequest, string];
    });

    for (const [request, filename] of cases) {
      const result = await renderPreview(request, {
        now: () => FIXED_NOW,
        renderStill: async () => STILL_BYTES,
      });
      expect(result.files[0]?.filename).toBe(filename);
    }
  });

  it("default coding/feed/json/chips SVGs are non-empty Takumi stills", async () => {
    for (const request of [
      CODING_REQUEST,
      FEED_REQUEST,
      JSON_REQUEST,
      CHIPS_REQUEST,
    ]) {
      const result = await renderPreview(request, { now: () => FIXED_NOW });
      const svg = decodeSvg(result.files[0]);
      expect(result.provenance).toBe("fixture");
      expect(result.files[0]?.mime).toBe("image/svg+xml");
      expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
      expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
      expect(svg).not.toContain("No coding data");
      expect(svg).not.toContain("No feed items");
      expect(svg).not.toContain("No repo data");
      expect(svg).not.toContain("No language data");
    }
    assertNoUnauthGithub(fetchMock);
  });

  it("live coding uses WAKATIME_PREVIEW_TOKEN and ignores visitor api_domain", async () => {
    vi.stubEnv("WAKATIME_PREVIEW_TOKEN", "waka_preview_secret");
    const livePayload = {
      human_readable_total: "live hours",
      languages: [{ name: "Rust" }],
      editors: [{ name: "Zed" }],
    };
    const fetchStats = vi.fn(async () => livePayload);
    const createWakatimeClient = vi.fn(async () => ({ fetchStats }));
    const createGithubClient = vi.fn(async () => publicClient());
    const seen: unknown[] = [];

    const result = await renderPreview(
      {
        ...CODING_REQUEST,
        options: {
          coding: { api_domain: "wakapi.dev", range: "last_30_days" },
        },
      },
      {
        now: () => FIXED_NOW,
        createWakatimeClient,
        createGithubClient,
        renderStill: async (input) => {
          seen.push(input.payload);
          return STILL_BYTES;
        },
      },
    );

    expect(result.provenance).toBe("live");
    expect(createGithubClient).not.toHaveBeenCalled();
    expect(createWakatimeClient).toHaveBeenCalledOnce();
    expect(createWakatimeClient).toHaveBeenCalledWith(
      "waka_preview_secret",
      "wakatime.com",
    );
    expect(fetchStats).toHaveBeenCalledWith({
      range: "last_30_days",
      include: ["languages", "editors"],
      limit: 8,
    });
    expect(seen).toEqual([livePayload]);
    assertNoUnauthGithub(fetchMock);
  });

  it("live coding also accepts WAKATIME_APP and never logs the token", async () => {
    const token = "waka_MUST_NOT_APPEAR_IN_LOGS";
    vi.stubEnv("WAKATIME_APP", token);
    const lines: string[] = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      });
    }
    const createWakatimeClient = vi.fn(async () => ({
      fetchStats: async () => ({ human_readable_total: "1 hr" }),
    }));

    const result = await renderPreview(CODING_REQUEST, {
      now: () => FIXED_NOW,
      createWakatimeClient,
      renderStill: async () => STILL_BYTES,
    });

    expect(result.provenance).toBe("live");
    expect(createWakatimeClient).toHaveBeenCalledWith(token, "wakatime.com");
    expect(lines.join("\n")).not.toContain(token);
    assertNoUnauthGithub(fetchMock);
  });

  it("WAKATIME_TOKEN and visitor wakatime_token do not enable live coding", async () => {
    vi.stubEnv("WAKATIME_TOKEN", "waka_action_token");
    const createWakatimeClient = vi.fn(async () => ({
      fetchStats: async () => ({ human_readable_total: "nope" }),
    }));
    const leaked = {
      ...CODING_REQUEST,
      wakatime_token: "waka_visitor_must_not_be_used",
    } as PreviewRequest & { wakatime_token: string };

    const result = await renderPreview(leaked, {
      now: () => FIXED_NOW,
      createWakatimeClient,
      renderStill: async () => STILL_BYTES,
    });

    expect(result.provenance).toBe("fixture");
    expect(createWakatimeClient).not.toHaveBeenCalled();
    assertNoUnauthGithub(fetchMock);
  });

  it("live feed uses the visitor https URL through the rss SSRF client", async () => {
    const items = [
      {
        title: "Live Item",
        url: "https://example.com/1",
        published_at: null,
      },
    ];
    const fetchFeed = vi.fn(async (url: string) => {
      expect(url).toBe("https://example.com/feed.xml");
      return items;
    });
    const createRssClient = vi.fn(async () => ({ fetchFeed }));
    const seen: unknown[] = [];

    const result = await renderPreview(
      {
        ...FEED_REQUEST,
        options: { feed: { url: "https://example.com/feed.xml" } },
      },
      {
        now: () => FIXED_NOW,
        createRssClient,
        renderStill: async (input) => {
          seen.push(input.payload);
          return STILL_BYTES;
        },
      },
    );

    expect(result.provenance).toBe("live");
    expect(createRssClient).toHaveBeenCalledOnce();
    expect(fetchFeed).toHaveBeenCalledOnce();
    expect(seen).toEqual([items]);
    assertNoUnauthGithub(fetchMock);
  });

  it("feed http URLs and GitHub-owned hosts stay on fixtures", async () => {
    const createRssClient = vi.fn(async () => ({
      fetchFeed: async () => {
        throw new Error("must not fetch");
      },
    }));

    for (const url of [
      "http://example.com/feed.xml",
      "https://github.com/octocat.atom",
      "https://raw.githubusercontent.com/octocat/feed.xml",
    ]) {
      const result = await renderPreview(
        { ...FEED_REQUEST, options: { feed: { url } } },
        {
          now: () => FIXED_NOW,
          createRssClient,
          renderStill: async () => STILL_BYTES,
        },
      );
      expect(result.provenance).toBe("fixture");
    }

    expect(createRssClient).not.toHaveBeenCalled();
    assertNoUnauthGithub(fetchMock);
  });

  it("live json uses the visitor https URL with auth none", async () => {
    const document = { live: true, n: 7 };
    const fetchJson = vi.fn(async (request: { url: string; auth?: "none" }) => {
      expect(request.url).toBe("https://example.com/data.json");
      expect(request.auth).toBe("none");
      return document;
    });
    const scrape = vi.fn(async () => ({ title: "should not scrape" }));
    const seen: unknown[] = [];

    const result = await renderPreview(
      {
        ...JSON_REQUEST,
        options: { json: { url: "https://example.com/data.json" } },
      },
      {
        now: () => FIXED_NOW,
        createHttpClient: async () => ({ fetchJson }),
        createHtmlScrapeClient: async () => ({ scrape }),
        renderStill: async (input) => {
          seen.push(input.payload);
          return STILL_BYTES;
        },
      },
    );

    expect(result.provenance).toBe("live");
    expect(fetchJson).toHaveBeenCalledOnce();
    expect(scrape).not.toHaveBeenCalled();
    expect(seen).toEqual([document]);
    assertNoUnauthGithub(fetchMock);
  });

  it("json invalid_json falls back to HTML scrape of the visitor URL", async () => {
    const dump = {
      title: "Scraped page",
      url: "https://example.com/page",
      headings: [{ level: 1, text: "Hello" }],
    };
    const fetchJson = vi.fn(async () => {
      throw Object.assign(new Error("invalid json"), {
        outcome: "fail_widget",
        code: "invalid_json",
      });
    });
    const scrape = vi.fn(async (url: string) => {
      expect(url).toBe("https://example.com/page");
      return dump;
    });
    const seen: unknown[] = [];

    const result = await renderPreview(
      {
        ...JSON_REQUEST,
        options: { json: { url: "https://example.com/page" } },
      },
      {
        now: () => FIXED_NOW,
        createHttpClient: async () => ({ fetchJson }),
        createHtmlScrapeClient: async () => ({ scrape }),
        renderStill: async (input) => {
          seen.push(input.payload);
          return STILL_BYTES;
        },
      },
    );

    expect(result.provenance).toBe("live");
    expect(fetchJson).toHaveBeenCalledOnce();
    expect(scrape).toHaveBeenCalledOnce();
    expect(seen).toEqual([dump]);
    assertNoUnauthGithub(fetchMock);
  });

  it("json GitHub-owned hosts stay on fixtures and do not scrape", async () => {
    const fetchJson = vi.fn(async () => ({ live: true }));
    const scrape = vi.fn(async () => ({ title: "nope" }));

    const result = await renderPreview(
      {
        ...JSON_REQUEST,
        options: { json: { url: "https://api.github.com/users/octocat" } },
      },
      {
        now: () => FIXED_NOW,
        createHttpClient: async () => ({ fetchJson }),
        createHtmlScrapeClient: async () => ({ scrape }),
        renderStill: async () => STILL_BYTES,
      },
    );

    expect(result.provenance).toBe("fixture");
    expect(fetchJson).not.toHaveBeenCalled();
    expect(scrape).not.toHaveBeenCalled();
    assertNoUnauthGithub(fetchMock);
  });

  it("live chips uses PREVIEW_HTTP_LIVE with auth none", async () => {
    vi.stubEnv("PREVIEW_HTTP_LIVE", "1");
    const fetchJson = vi.fn(async (request: { url: string; auth?: "none" }) => {
      expect(request.auth).toBe("none");
      expect(request.url).toContain("shieldcn.dev");
      return { label: "npm", message: "9.9.9" };
    });
    const seen: unknown[] = [];

    const result = await renderPreview(
      {
        ...CHIPS_REQUEST,
        options: { chips: { package: "profile-bits" } },
      },
      {
        now: () => FIXED_NOW,
        createHttpClient: async () => ({ fetchJson }),
        renderStill: async (input) => {
          seen.push(input.payload);
          return STILL_BYTES;
        },
      },
    );

    expect(result.provenance).toBe("live");
    expect(fetchJson).toHaveBeenCalledOnce();
    expect(seen).toEqual([[{ label: "npm", message: "9.9.9" }]]);
    assertNoUnauthGithub(fetchMock);
  });

  it("chips without PREVIEW_HTTP_LIVE stay on fixtures", async () => {
    const fetchJson = vi.fn(async () => ({ label: "npm", message: "nope" }));

    const result = await renderPreview(
      {
        ...CHIPS_REQUEST,
        options: { chips: { package: "profile-bits" } },
      },
      {
        now: () => FIXED_NOW,
        createHttpClient: async () => ({ fetchJson }),
        renderStill: async () => STILL_BYTES,
      },
    );

    expect(result.provenance).toBe("fixture");
    expect(fetchJson).not.toHaveBeenCalled();
    assertNoUnauthGithub(fetchMock);
  });

  it("plugin-scope http can mix live json with fixture chips", async () => {
    const fetchJson = vi.fn(async () => ({ mixed: true }));
    const seen: string[] = [];
    const request: PreviewRequest = {
      scope: "plugin",
      plugin: "http",
      options: { json: { url: "https://example.com/data.json" } },
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    };

    const result = await renderPreview(request, {
      now: () => FIXED_NOW,
      createHttpClient: async () => ({ fetchJson }),
      renderStill: async (input) => {
        if (input.widget !== undefined) {
          seen.push(input.widget);
        }
        return STILL_BYTES;
      },
    });

    expect(result.provenance).toBe("live");
    expect(seen).toEqual(["json", "chips"]);
    expect(fetchJson).toHaveBeenCalledOnce();
    expect(result.files.map((file) => file.id)).toEqual(["json", "chips"]);
    assertNoUnauthGithub(fetchMock);
  });

  it("wakatime 429 falls back to fixtures with rate_limited provenance", async () => {
    vi.stubEnv("WAKATIME_PREVIEW_TOKEN", "waka_preview");
    const fetchStats = vi.fn(async () => {
      throw Object.assign(new Error("rate limited"), {
        status: 429,
        outcome: "fail_after_backoff",
      });
    });

    const result = await renderPreview(CODING_REQUEST, {
      now: () => FIXED_NOW,
      createWakatimeClient: async () => ({ fetchStats }),
      renderStill: async () => STILL_BYTES,
    });

    expect(result.provenance).toBe("rate_limited");
    expect(result.files[0]?.id).toBe("coding");
    expect(fetchStats).toHaveBeenCalledOnce();
    assertNoUnauthGithub(fetchMock);
  });

  it("live fail_widget falls back to pack fixtures", async () => {
    const fetchFeed = vi.fn(async () => {
      throw Object.assign(new Error("ssrf"), { outcome: "fail_widget" });
    });
    const seen: unknown[] = [];

    const result = await renderPreview(
      {
        ...FEED_REQUEST,
        options: { feed: { url: "https://example.com/feed.xml" } },
      },
      {
        now: () => FIXED_NOW,
        createRssClient: async () => ({ fetchFeed }),
        renderStill: async (input) => {
          seen.push(input.payload);
          return STILL_BYTES;
        },
      },
    );

    expect(result.provenance).toBe("fixture");
    expect(fetchFeed).toHaveBeenCalledOnce();
    const items = seen[0] as { title?: string }[];
    expect(items.map((item) => item.title)).toEqual([
      "Atom Item 1",
      "Atom Item 2",
      "Atom Item 3",
      "Atom Item 4",
      "Atom Item 5",
    ]);
    assertNoUnauthGithub(fetchMock);
  });

  it("bit scope stays fixtures even when live credentials and URLs are set", async () => {
    vi.stubEnv("WAKATIME_PREVIEW_TOKEN", "waka_preview");
    vi.stubEnv("PREVIEW_HTTP_LIVE", "1");
    const createWakatimeClient = vi.fn(async () => ({
      fetchStats: async () => ({ human_readable_total: "nope" }),
    }));
    const fetchJson = vi.fn(async () => ({ live: true }));
    const request: PreviewRequest = {
      scope: "bit",
      bit: "Text",
      options: {
        json: { url: "https://example.com/data.json" },
        feed: { url: "https://example.com/feed.xml" },
      },
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    };

    const result = await renderPreview(request, {
      now: () => FIXED_NOW,
      createWakatimeClient,
      createHttpClient: async () => ({ fetchJson }),
      renderStill: async () => STILL_BYTES,
    });

    expect(result.provenance).toBe("fixture");
    expect(createWakatimeClient).not.toHaveBeenCalled();
    expect(fetchJson).not.toHaveBeenCalled();
    assertNoUnauthGithub(fetchMock);
  });
});
