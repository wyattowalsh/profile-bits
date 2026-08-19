import { CHIPS_OPTION_DEFAULTS, type ChipsOptions } from "@profile-bits/core";
import {
  chipFixture,
  createHttpClient,
  expandChipsRequest,
  type HttpClient,
  HttpClientError,
  type HttpFetch,
  type HttpLookup,
  normalizeBadgeJson,
} from "@profile-bits/integrations";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChipsWidgetError,
  loadChipsPayloads,
  toChipsWidgetError,
} from "./load.js";

const PUBLIC_V4 = "93.184.216.34";

const CHIPS_OPTIONS: ChipsOptions = {
  ...CHIPS_OPTION_DEFAULTS,
  preset: "shieldcn",
  types: ["npm", "stars"],
  package: "react",
  repo: "vercel/next.js",
};

function chipsUrl(type: ChipsOptions["types"][number]): string {
  return expandChipsRequest({
    preset: CHIPS_OPTIONS.preset,
    type,
    user: "vercel",
    repo: CHIPS_OPTIONS.repo,
    packageName: CHIPS_OPTIONS.package,
  }).url.href;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function publicLookup(): HttpLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

function assertChipsWidgetError(error: unknown): ChipsWidgetError {
  expect(error).toBeInstanceOf(ChipsWidgetError);
  expect(error).not.toBeInstanceOf(HttpClientError);
  if (!(error instanceof ChipsWidgetError)) {
    throw new Error("expected ChipsWidgetError");
  }
  expect(error.outcome).toBe("fail_widget");
  return error;
}

describe("loadChipsPayloads", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetchJson with auth none and no headers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const npmUrl = chipsUrl("npm");
    const starsUrl = chipsUrl("stars");
    const fetchJson = vi.fn<HttpClient["fetchJson"]>(async (request) => {
      if (request.url === npmUrl) {
        return chipFixture("shieldcn", "npm");
      }
      if (request.url === starsUrl) {
        return chipFixture("shieldcn", "stars");
      }
      throw new Error(`unexpected url ${request.url}`);
    });
    const badges = await loadChipsPayloads({ fetchJson }, CHIPS_OPTIONS, {
      user: "vercel",
    });
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(fetchJson.mock.calls.map(([request]) => request)).toEqual([
      {
        url: npmUrl,
        timeout_ms: CHIPS_OPTIONS.timeout_ms,
        auth: "none",
      },
      {
        url: starsUrl,
        timeout_ms: CHIPS_OPTIONS.timeout_ms,
        auth: "none",
      },
    ]);
    for (const [request] of fetchJson.mock.calls) {
      expect(request).not.toHaveProperty("headers");
      expect(request?.auth).toBe("none");
    }
    expect(badges).toEqual([
      normalizeBadgeJson(chipFixture("shieldcn", "npm")),
      normalizeBadgeJson(chipFixture("shieldcn", "stars")),
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("wraps 404 HttpClientError as ChipsWidgetError", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const httpError = new HttpClientError(
      "fail_widget",
      "HTTP JSON request failed (404)",
      404,
    );
    const fetchJson = vi.fn<HttpClient["fetchJson"]>(async () => {
      throw httpError;
    });
    let thrown: unknown;
    try {
      await loadChipsPayloads({ fetchJson }, CHIPS_OPTIONS, { user: "vercel" });
    } catch (error: unknown) {
      thrown = error;
    }
    const wrapped = assertChipsWidgetError(thrown);
    expect(wrapped).not.toBe(httpError);
    expect(wrapped.cause).toBe(httpError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("wraps expand errors as ChipsWidgetError", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetchJson = vi.fn<HttpClient["fetchJson"]>(async () => {
      throw new Error("fetchJson should not run");
    });
    const options: ChipsOptions = {
      ...CHIPS_OPTIONS,
      types: ["npm"],
      package: undefined,
    };
    let thrown: unknown;
    try {
      await loadChipsPayloads({ fetchJson }, options, { user: "vercel" });
    } catch (error: unknown) {
      thrown = error;
    }
    assertChipsWidgetError(thrown);
    expect(fetchJson).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rethrows the same ChipsWidgetError without wrapping twice", async () => {
    const original = new ChipsWidgetError("already");
    const fetchJson = vi.fn<HttpClient["fetchJson"]>(async () => {
      throw original;
    });
    await expect(
      loadChipsPayloads({ fetchJson }, CHIPS_OPTIONS, { user: "vercel" }),
    ).rejects.toBe(original);
  });

  it("omits Authorization on recorded GET when the client has a token", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const npmUrl = chipsUrl("npm");
    const starsUrl = chipsUrl("stars");
    const fetch = vi.fn<HttpFetch>(async (url, init) => {
      expect(init?.headers?.Authorization).toBeUndefined();
      if (url === npmUrl) {
        return jsonResponse(chipFixture("shieldcn", "npm"));
      }
      if (url === starsUrl) {
        return jsonResponse(chipFixture("shieldcn", "stars"));
      }
      throw new Error(`unexpected url ${url}`);
    });
    const lookup = vi.fn(publicLookup());
    const client = createHttpClient({
      fetch,
      lookup,
      token: "secret",
    });
    const badges = await loadChipsPayloads(client, CHIPS_OPTIONS, {
      user: "vercel",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [, init] of fetch.mock.calls) {
      expect(init?.headers?.Authorization).toBeUndefined();
    }
    expect(badges).toHaveLength(2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("wraps a real-client 404 as ChipsWidgetError not HttpClientError", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.headers?.Authorization).toBeUndefined();
      return jsonResponse({ error: true }, 404);
    });
    const lookup = vi.fn(publicLookup());
    const client = createHttpClient({
      fetch,
      lookup,
      token: "secret",
    });
    let thrown: unknown;
    try {
      await loadChipsPayloads(client, CHIPS_OPTIONS, { user: "vercel" });
    } catch (error: unknown) {
      thrown = error;
    }
    const wrapped = assertChipsWidgetError(thrown);
    expect(wrapped.cause).toBeInstanceOf(HttpClientError);
    expect(fetch).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("toChipsWidgetError", () => {
  it("returns the same ChipsWidgetError instance", () => {
    const original = new ChipsWidgetError("already");
    expect(toChipsWidgetError(original)).toBe(original);
  });

  it("wraps other errors once", () => {
    const cause = new HttpClientError(
      "fail_widget",
      "HTTP JSON request failed (404)",
      404,
    );
    const wrapped = toChipsWidgetError(cause);
    expect(wrapped).toBeInstanceOf(ChipsWidgetError);
    expect(wrapped).not.toBe(cause);
    expect(wrapped.cause).toBe(cause);
    expect(toChipsWidgetError(wrapped)).toBe(wrapped);
  });
});
