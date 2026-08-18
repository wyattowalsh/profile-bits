import {
  type ActionInputs,
  ActionInputsSchema,
  type Capabilities,
  parseConfig,
} from "@profile-bits/core";
import {
  createRssClient,
  loadFixture,
  type RssFetch,
  type RssLookup,
} from "@profile-bits/integrations";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runEngine, type WidgetRenderRequest } from "./engine.ts";
import {
  createFeedRenderWidget,
  UnhandledFeedWidgetError,
} from "./render-feed.ts";

const TOKEN = "ghs_test_token";
const PUBLIC_V4 = "93.184.216.34";

const RSS_FEED_YAML = `version: 1
format: svg
plugins:
  rss:
    widgets:
      feed:
        url: https://example.com/feed.xml
`;

const PUBLIC_CAPABILITIES: Capabilities = {
  canPrivate: false,
  canContributions: false,
  canGist: false,
};

function publicLookup(): RssLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

function xmlResponse(
  body: string,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/atom+xml",
      ...init.headers,
    },
  });
}

function feedRequest(): WidgetRenderRequest {
  const config = parseConfig({ yaml: RSS_FEED_YAML });
  const options = config.plugins.rss?.widgets.feed;
  if (options === undefined) {
    throw new Error("expected feed widget options");
  }
  const inputs: ActionInputs = ActionInputsSchema.parse({
    github_token: TOKEN,
    output_action: "none",
  });
  return {
    id: "feed",
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
  expect(svg).not.toMatch(/<style[\s>]/i);
  expect(svg).not.toContain("@keyframes");
  expect(svg).not.toMatch(/<(animate|animateTransform|animateMotion|set)\b/i);
  expect(svg).not.toMatch(/<foreignObject[\s>]/i);
}

function assertNoAuthorization(
  init: { headers?: Record<string, string> } | undefined,
): void {
  const headers = init?.headers ?? {};
  for (const key of Object.keys(headers)) {
    expect(key.toLowerCase()).not.toBe("authorization");
  }
}

describe("createFeedRenderWidget", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders rss-only feed from an injected client as a 480×160 baked-still svg", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<RssFetch>(async (_url, init) => {
      assertNoAuthorization(init);
      return xmlResponse(loadFixture("atom.xml"));
    });
    const lookup = vi.fn(publicLookup());
    const client = createRssClient({ fetch, lookup });
    const render = createFeedRenderWidget({ client });

    const result = await render(feedRequest());

    expect(result.id).toBe("feed");
    expect(result.outcome).toBe("render");
    expect(result.files).toHaveLength(1);
    expect(result.files?.[0]?.path).toBe("feed.svg");
    expect(typeof result.files?.[0]?.contents).toBe("string");
    assertCardSvg(String(result.files?.[0]?.contents));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps RssClientError HTTP 404 to fail_widget and never fail_run", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<RssFetch>(async () => xmlResponse("", { status: 404 }));
    const render = createFeedRenderWidget({
      client: createRssClient({ fetch, lookup: publicLookup() }),
    });

    const result = await render(feedRequest());

    expect(result).toEqual({ id: "feed", outcome: "fail_widget" });
    expect(result.outcome).not.toBe("fail_run");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws UnhandledFeedWidgetError for non-feed ids", async () => {
    const render = createFeedRenderWidget({
      client: createRssClient({
        fetch: vi.fn<RssFetch>(async () =>
          xmlResponse(loadFixture("atom.xml")),
        ),
        lookup: publicLookup(),
      }),
    });
    const request = feedRequest();

    await expect(render({ ...request, id: "stats" })).rejects.toBeInstanceOf(
      UnhandledFeedWidgetError,
    );
  });
});

describe("runEngine with createFeedRenderWidget", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes feed.svg for rss-only yaml when the adapter renders", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<RssFetch>(async (_url, init) => {
      assertNoAuthorization(init);
      return xmlResponse(loadFixture("atom.xml"));
    });
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );
    const client = createRssClient({ fetch, lookup: publicLookup() });

    const result = await runEngine(
      {
        inputs: ActionInputsSchema.parse({
          github_token: TOKEN,
          output_action: "none",
          allow_skipped: false,
        }),
        yaml: RSS_FEED_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: createFeedRenderWidget({ client }),
        writeFiles,
      },
    );

    expect(result.files).toEqual(["profile-bits/feed.svg"]);
    expect(result.did_commit).toBe(false);
    expect(writeFiles).toHaveBeenCalledOnce();
    const written = writeFiles.mock.calls[0]?.[0];
    expect(written).toHaveLength(1);
    expect(written?.[0]?.path).toBe("profile-bits/feed.svg");
    assertCardSvg(String(written?.[0]?.contents));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("succeeds with no files when rss-only feed is HTTP 404", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<RssFetch>(async () => xmlResponse("", { status: 404 }));
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );
    const client = createRssClient({ fetch, lookup: publicLookup() });

    const result = await runEngine(
      {
        inputs: ActionInputsSchema.parse({
          github_token: TOKEN,
          output_action: "none",
          allow_skipped: false,
        }),
        yaml: RSS_FEED_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: createFeedRenderWidget({ client }),
        writeFiles,
      },
    );

    expect(result).toEqual({
      files: [],
      did_commit: false,
      skipped: [],
    });
    expect(writeFiles).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
