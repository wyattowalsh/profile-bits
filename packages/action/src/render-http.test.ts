import {
  type ActionInputs,
  ActionInputsSchema,
  type Capabilities,
  parseConfig,
} from "@profile-bits/core";
import {
  createHttpClient,
  type HttpFetch,
  type HttpLookup,
} from "@profile-bits/integrations";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EngineError,
  type RenderWidget,
  type WidgetRenderRequest,
} from "./engine.ts";
import {
  createHttpRenderWidget,
  UnhandledHttpWidgetError,
} from "./render-http.ts";
import { composeRenderWidgets } from "./render-widgets.ts";

const TOKEN = "ghs_test_token";
const PUBLIC_V4 = "93.184.216.34";

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

function assertCardSvg(svg: string): void {
  expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
  expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
  expect(svg).toMatch(/<svg\b[^>]*\bviewBox="0 0 480 160"/);
  expect(svg).not.toMatch(/<text[\s>]/i);
}

describe("createHttpRenderWidget", () => {
  afterEach(() => {
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
});
