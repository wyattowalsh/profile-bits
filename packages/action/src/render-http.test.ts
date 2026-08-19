import {
  type ActionInputs,
  ActionInputsSchema,
  type Capabilities,
  parseConfig,
} from "@profile-bits/core";
import {
  chipFixture,
  createHttpClient,
  expandChipsRequest,
  type HttpFetch,
  type HttpLookup,
} from "@profile-bits/integrations";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EngineError,
  type RenderWidget,
  runEngine,
  type WidgetRenderRequest,
} from "./engine.ts";
import {
  createHttpRenderWidget,
  UnhandledHttpWidgetError,
} from "./render-http.ts";
import { composeRenderWidgets } from "./render-widgets.ts";

const TOKEN = "ghs_test_token";
const HTTP_TOKEN = "fixture-http-token-xyz";
const PUBLIC_V4 = "93.184.216.34";
const JSON_URL = "https://example.com/api.json";
const JSON_401_LINE =
  "http json fail_widget code=http_status status=401 host=example.com attempt=1";
const CHIPS_404_LINE =
  "http chips fail_widget code=http_status status=404 host=shieldcn.dev attempt=1";

const HTTP_JSON_YAML = `version: 1
format: svg
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
        headers:
          X-Profile-Bits: test
`;

const HTTP_CHIPS_YAML = `version: 1
format: svg
plugins:
  http:
    widgets:
      chips:
        preset: shieldcn
        types: [npm, stars]
        package: react
        repo: vercel/next.js
`;

const HTTP_JSON_AND_CHIPS_YAML = `version: 1
format: svg
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
        headers:
          X-Profile-Bits: test
      chips:
        preset: shieldcn
        types: [npm]
        package: react
`;

const PUBLIC_CAPABILITIES: Capabilities = {
  canPrivate: false,
  canContributions: false,
  canGist: false,
};

function publicLookup(): HttpLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(text, {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

function jsonRequest(): WidgetRenderRequest {
  const config = parseConfig({ yaml: HTTP_JSON_YAML });
  const options = config.plugins.http?.widgets?.json;
  if (options === undefined) {
    throw new Error("expected json widget options");
  }
  const inputs: ActionInputs = ActionInputsSchema.parse({
    github_token: TOKEN,
    output_action: "none",
  });
  return {
    id: "json",
    options,
    config,
    inputs,
    capabilities: PUBLIC_CAPABILITIES,
  };
}

function chipsRequest(): WidgetRenderRequest {
  const config = parseConfig({ yaml: HTTP_CHIPS_YAML });
  const options = config.plugins.http?.widgets?.chips;
  if (options === undefined) {
    throw new Error("expected chips widget options");
  }
  const inputs: ActionInputs = ActionInputsSchema.parse({
    github_token: TOKEN,
    output_action: "none",
    user: "vercel",
  });
  return {
    id: "chips",
    options,
    config,
    inputs,
    capabilities: PUBLIC_CAPABILITIES,
  };
}

function chipsUrl(type: "npm" | "stars"): string {
  const request = chipsRequest();
  const options = request.options;
  if (!("preset" in options)) {
    throw new Error("expected chips options");
  }
  return expandChipsRequest({
    preset: options.preset,
    type,
    user: request.inputs.user ?? "",
    repo: options.repo,
    packageName: options.package,
    workflow: options.workflow,
  }).url.href;
}

function assertCardSvg(svg: string): void {
  expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
  expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
  expect(svg).toMatch(/<svg\b[^>]*\bviewBox="0 0 480 160"/);
  expect(svg).not.toMatch(/<text[\s>]/i);
}

function capturedWrites(spy: {
  mock: { calls: readonly unknown[][] };
}): string {
  return spy.mock.calls.map((args) => String(args[0] ?? "")).join("");
}

function expectNoSecrets(haystack: string): void {
  expect(haystack).not.toContain(TOKEN);
  expect(haystack).not.toContain(HTTP_TOKEN);
  expect(haystack).not.toContain("Bearer");
  expect(haystack).not.toContain("Authorization");
  expect(haystack).not.toContain(JSON_URL);
  expect(haystack).not.toContain("https://");
  expect(haystack).not.toContain("?");
  expect(haystack).not.toContain("#");
}

describe("createHttpRenderWidget", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_ACTIONS", "");
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("renders json from an injected client and forwards yaml headers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.headers?.["X-Profile-Bits"]).toBe("test");
      return jsonResponse({ name: "octocat", count: 3 });
    });
    const lookup = vi.fn(publicLookup());
    const client = createHttpClient({ fetch, lookup });
    const render = createHttpRenderWidget({ client });

    const result = await render(jsonRequest());

    expect(result.id).toBe("json");
    expect(result.outcome).toBe("render");
    expect(result.files).toHaveLength(1);
    expect(result.files?.[0]?.path).toBe("json.svg");
    expect(typeof result.files?.[0]?.contents).toBe("string");
    assertCardSvg(String(result.files?.[0]?.contents));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails the widget when the client token is empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse({ ok: true }));
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: "",
    });
    const render = createHttpRenderWidget({ client });

    const result = await render(jsonRequest());

    expect(result).toEqual({ id: "json", outcome: "fail_widget" });
    expect(fetch).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps HttpClientError to fail_widget and never fail_run", async () => {
    const fetch = vi.fn<HttpFetch>(async () =>
      jsonResponse({ error: true }, { status: 401 }),
    );
    const render = createHttpRenderWidget({
      client: createHttpClient({ fetch, lookup: publicLookup() }),
    });

    const result = await render(jsonRequest());

    expect(result.outcome).toBe("fail_widget");
    expect(result.outcome).not.toBe("fail_run");
    expect(capturedWrites(vi.mocked(process.stdout.write))).not.toContain(
      "::warning::",
    );
    expect(capturedWrites(vi.mocked(process.stderr.write))).toContain(
      JSON_401_LINE,
    );
  });

  it("emits ::warning:: and ::group:: for json 401 when GITHUB_ACTIONS is true", async () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    const fetch = vi.fn<HttpFetch>(async () =>
      jsonResponse({ error: true }, { status: 401 }),
    );
    const render = createHttpRenderWidget({
      client: createHttpClient({
        fetch,
        lookup: publicLookup(),
        token: HTTP_TOKEN,
      }),
    });

    const result = await render(jsonRequest());
    const stdout = capturedWrites(vi.mocked(process.stdout.write));
    const stderr = capturedWrites(vi.mocked(process.stderr.write));
    const haystack = `${stdout}${stderr}`;

    expect(result.outcome).toBe("fail_widget");
    expect(result.outcome).not.toBe("fail_run");
    expect(stdout).toContain(`::warning::${JSON_401_LINE}\n`);
    expect(stdout).toContain("::group::http json\n");
    expect(stdout).toContain(`${JSON_401_LINE}\n`);
    expect(stdout).toContain("::endgroup::\n");
    expect(stdout.match(/::warning::/g)).toHaveLength(1);
    expect(stdout.match(/::group::/g)).toHaveLength(1);
    expect(stdout).not.toContain("::error::");
    expect(stderr).toContain(`${JSON_401_LINE}\n`);
    expectNoSecrets(haystack);
  });

  it("throws UnhandledHttpWidgetError for non-json ids", async () => {
    const render = createHttpRenderWidget({
      client: createHttpClient({
        fetch: vi.fn<HttpFetch>(async () => jsonResponse({ ok: true })),
        lookup: publicLookup(),
      }),
    });
    const request = jsonRequest();

    await expect(render({ ...request, id: "stats" })).rejects.toBeInstanceOf(
      UnhandledHttpWidgetError,
    );
  });

  it("renders chips from an injected client as a 480×160 svg at chips.svg", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const npmUrl = chipsUrl("npm");
    const starsUrl = chipsUrl("stars");
    const fetch = vi.fn<HttpFetch>(async (url) => {
      if (url === npmUrl) {
        return jsonResponse(chipFixture("shieldcn", "npm"));
      }
      if (url === starsUrl) {
        return jsonResponse(chipFixture("shieldcn", "stars"));
      }
      throw new Error(`unexpected url ${url}`);
    });
    const lookup = vi.fn(publicLookup());
    const render = createHttpRenderWidget({
      client: createHttpClient({ fetch, lookup }),
    });

    const result = await render(chipsRequest());

    expect(result.id).toBe("chips");
    expect(result.outcome).toBe("render");
    expect(result.files).toHaveLength(1);
    expect(result.files?.[0]?.path).toBe("chips.svg");
    expect(result.files?.[0]?.path).not.toMatch(/-dark/);
    expect(typeof result.files?.[0]?.contents).toBe("string");
    assertCardSvg(String(result.files?.[0]?.contents));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(lookup).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps chips 404 to fail_widget and does not throw", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const npmUrl = chipsUrl("npm");
    const starsUrl = chipsUrl("stars");
    const fetch = vi.fn<HttpFetch>(async (url) => {
      if (url === starsUrl) {
        return jsonResponse({ error: true }, { status: 404 });
      }
      if (url === npmUrl) {
        return jsonResponse(chipFixture("shieldcn", "npm"));
      }
      throw new Error(`unexpected url ${url}`);
    });
    const render = createHttpRenderWidget({
      client: createHttpClient({ fetch, lookup: publicLookup() }),
    });

    const result = await render(chipsRequest());

    expect(result).toEqual({ id: "chips", outcome: "fail_widget" });
    expect(result.outcome).not.toBe("fail_run");
    expect(fetch).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(capturedWrites(vi.mocked(process.stderr.write))).toContain(
      CHIPS_404_LINE,
    );
  });

  it("forwards theme light to the chips widget", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const npmUrl = chipsUrl("npm");
    const starsUrl = chipsUrl("stars");
    const fetch = vi.fn<HttpFetch>(async (url) => {
      if (url === npmUrl) {
        return jsonResponse(chipFixture("shieldcn", "npm"));
      }
      if (url === starsUrl) {
        return jsonResponse(chipFixture("shieldcn", "stars"));
      }
      throw new Error(`unexpected url ${url}`);
    });
    const render = createHttpRenderWidget({
      client: createHttpClient({ fetch, lookup: publicLookup() }),
    });
    const base = chipsRequest();

    const light = await render({ ...base, theme: "light" });
    const dark = await render({ ...base, theme: "dark" });

    expect(light.outcome).toBe("render");
    expect(dark.outcome).toBe("render");
    expect(light.files?.[0]?.path).toBe("chips.svg");
    expect(light.files?.[0]?.contents).not.toEqual(dark.files?.[0]?.contents);
    assertCardSvg(String(light.files?.[0]?.contents));
    assertCardSvg(String(dark.files?.[0]?.contents));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not throw UnhandledHttpWidgetError for chips", async () => {
    const npmUrl = chipsUrl("npm");
    const starsUrl = chipsUrl("stars");
    const fetch = vi.fn<HttpFetch>(async (url) => {
      if (url === npmUrl) {
        return jsonResponse(chipFixture("shieldcn", "npm"));
      }
      if (url === starsUrl) {
        return jsonResponse(chipFixture("shieldcn", "stars"));
      }
      throw new Error(`unexpected url ${url}`);
    });
    const render = createHttpRenderWidget({
      client: createHttpClient({ fetch, lookup: publicLookup() }),
    });

    const result = await render(chipsRequest());

    expect(result).not.toBeInstanceOf(UnhandledHttpWidgetError);
    expect(result.id).toBe("chips");
    expect(result.outcome).toBe("render");
  });

  it("does not warn when empty successful jmespath renders", async () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse({}));
    const render = createHttpRenderWidget({
      client: createHttpClient({ fetch, lookup: publicLookup() }),
    });

    const result = await render(jsonRequest());
    const haystack = `${capturedWrites(vi.mocked(process.stdout.write))}${capturedWrites(vi.mocked(process.stderr.write))}`;

    expect(result.outcome).toBe("render");
    expect(result.files).toHaveLength(1);
    assertCardSvg(String(result.files?.[0]?.contents));
    expect(haystack).not.toContain("::warning::");
    expect(haystack).not.toContain("fail_widget");
  });
});

describe("composeRenderWidgets", () => {
  it("routes json to the json adapter and other ids to github", async () => {
    const json = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
      files: [{ path: "json.svg", contents: "<svg />" }],
    }));
    const github = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
      files: [{ path: "stats.svg", contents: "<svg />" }],
    }));
    const render = composeRenderWidgets({ json, github });
    const base = jsonRequest();

    await render(base);
    await render({ ...base, id: "stats" });

    expect(json).toHaveBeenCalledOnce();
    expect(github).toHaveBeenCalledOnce();
    expect(github.mock.calls[0]?.[0].id).toBe("stats");
  });

  it("throws the engine not-injected error when github is omitted", () => {
    const json = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
    }));
    const render = composeRenderWidgets({ json });

    expect(() => render({ ...jsonRequest(), id: "stats" })).toThrow(
      EngineError,
    );
    expect(() => render({ ...jsonRequest(), id: "stats" })).toThrow(
      /renderWidget is not injected/,
    );
  });

  it("routes feed to the feed adapter when provided", async () => {
    const json = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
    }));
    const feed = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
      files: [{ path: "feed.svg", contents: "<svg />" }],
    }));
    const render = composeRenderWidgets({ json, feed });
    const result = await render({ ...jsonRequest(), id: "feed" });

    expect(json).not.toHaveBeenCalled();
    expect(feed).toHaveBeenCalledOnce();
    expect(result.files?.[0]?.path).toBe("feed.svg");
  });

  it("routes chips to the json adapter and stats to github", async () => {
    const json = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
      files: [{ path: `${request.id}.svg`, contents: "<svg />" }],
    }));
    const github = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
      files: [{ path: "stats.svg", contents: "<svg />" }],
    }));
    const render = composeRenderWidgets({ json, github });

    await render(chipsRequest());
    await render({ ...jsonRequest(), id: "stats" });

    expect(json).toHaveBeenCalledOnce();
    expect(json.mock.calls[0]?.[0].id).toBe("chips");
    expect(github).toHaveBeenCalledOnce();
    expect(github.mock.calls[0]?.[0].id).toBe("stats");
  });
});

describe("runEngine with composeRenderWidgets", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_ACTIONS", "");
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not drop json writes when chips is fail_widget", async () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const jsonUrl = JSON_URL;
    const npmUrl = expandChipsRequest({
      preset: "shieldcn",
      type: "npm",
      packageName: "react",
    }).url.href;
    const fetch = vi.fn<HttpFetch>(async (url) => {
      if (url === jsonUrl) {
        return jsonResponse({ name: "octocat", count: 3 });
      }
      if (url === npmUrl) {
        return jsonResponse({ error: true }, { status: 404 });
      }
      throw new Error(`unexpected url ${url}`);
    });
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );
    const github = vi.fn<RenderWidget>((request) => {
      throw new UnhandledHttpWidgetError(request.id);
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: HTTP_TOKEN,
    });

    const result = await runEngine(
      {
        inputs: ActionInputsSchema.parse({
          github_token: TOKEN,
          output_action: "none",
          allow_skipped: false,
        }),
        yaml: HTTP_JSON_AND_CHIPS_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: composeRenderWidgets({
          json: createHttpRenderWidget({ client }),
          github,
        }),
        writeFiles,
      },
    );

    const stdout = capturedWrites(vi.mocked(process.stdout.write));
    const stderr = capturedWrites(vi.mocked(process.stderr.write));
    const haystack = `${stdout}${stderr}`;

    expect(result.files).toEqual(["profile-bits/json.svg"]);
    expect(result.did_commit).toBe(false);
    expect(writeFiles).toHaveBeenCalledOnce();
    const written = writeFiles.mock.calls[0]?.[0];
    expect(written).toHaveLength(1);
    expect(written?.[0]?.path).toBe("profile-bits/json.svg");
    assertCardSvg(String(written?.[0]?.contents));
    expect(github).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(stdout).toContain(`::warning::${CHIPS_404_LINE}\n`);
    expect(stdout).toContain("::group::http chips\n");
    expect(stdout).toContain("::endgroup::\n");
    expect(stdout).not.toContain("::warning::http json");
    expect(stdout.match(/::warning::/g)).toHaveLength(1);
    expect(stderr).toContain(`${CHIPS_404_LINE}\n`);
    expectNoSecrets(haystack);
  });
});
