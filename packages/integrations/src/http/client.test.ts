import { HTTP_RESPONSE_MAX_BYTES } from "@profile-bits/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHttpClient,
  HTTP_ACCEPT,
  HTTP_USER_AGENT,
  HttpClientError,
  type HttpFetch,
  type HttpLookup,
} from "./client.js";

const PUBLIC_V4 = "93.184.216.34";
const JSON_URL = "https://example.com/api.json";

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

describe("createHttpClient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces two 200 GETs on one instance", async () => {
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse({ ok: true }));
    const lookup = vi.fn(publicLookup());
    const client = createHttpClient({ fetch, lookup });
    const [first, second] = await Promise.all([
      client.fetchJson({ url: JSON_URL }),
      client.fetchJson({ url: JSON_URL }),
    ]);
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry 401 or 404", async () => {
    for (const status of [401, 404]) {
      const fetch = vi.fn<HttpFetch>(async () =>
        jsonResponse({ error: true }, { status }),
      );
      const client = createHttpClient({ fetch, lookup: publicLookup() });
      await expect(client.fetchJson({ url: JSON_URL })).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof HttpClientError &&
          error.outcome === "fail_widget" &&
          error.status === status,
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });

  it("retries 403 429 and 5xx then fail_widget", async () => {
    vi.useFakeTimers();
    for (const status of [403, 429, 503]) {
      const fetch = vi.fn<HttpFetch>(async () =>
        jsonResponse({ error: true }, { status }),
      );
      const client = createHttpClient({
        fetch,
        lookup: publicLookup(),
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      });
      const pending = client.fetchJson({ url: JSON_URL });
      const assertion = expect(pending).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof HttpClientError && error.outcome === "fail_widget",
      );
      await vi.runAllTimersAsync();
      await assertion;
      expect(fetch).toHaveBeenCalledTimes(3);
    }
  });

  it("fails 2xx non-JSON without retry", async () => {
    const fetch = vi.fn<HttpFetch>(async () =>
      jsonResponse("not-json", { status: 200 }),
    );
    const client = createHttpClient({ fetch, lookup: publicLookup() });
    await expect(client.fetchJson({ url: JSON_URL })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError && error.outcome === "fail_widget",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fails oversized Content-Length before reading", async () => {
    const fetch = vi.fn<HttpFetch>(async () =>
      jsonResponse(
        { ok: true },
        {
          headers: { "content-length": String(HTTP_RESPONSE_MAX_BYTES + 1) },
        },
      ),
    );
    const client = createHttpClient({ fetch, lookup: publicLookup() });
    await expect(client.fetchJson({ url: JSON_URL })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError && error.outcome === "fail_widget",
    );
  });

  it("fails when Content-Length lies and accumulated bytes exceed 1 MiB", async () => {
    const huge = "x".repeat(HTTP_RESPONSE_MAX_BYTES + 8);
    const fetch = vi.fn<HttpFetch>(async () =>
      jsonResponse(huge, { headers: { "content-length": "10" } }),
    );
    const client = createHttpClient({ fetch, lookup: publicLookup() });
    await expect(client.fetchJson({ url: JSON_URL })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError && error.outcome === "fail_widget",
    );
  });

  it("fails the widget when token is empty or whitespace", async () => {
    for (const token of ["", "  \n"]) {
      const fetch = vi.fn<HttpFetch>(async () => jsonResponse({ ok: true }));
      const client = createHttpClient({
        fetch,
        lookup: publicLookup(),
        token,
      });
      await expect(client.fetchJson({ url: JSON_URL })).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof HttpClientError && error.outcome === "fail_widget",
      );
      expect(fetch).not.toHaveBeenCalled();
    }
  });

  it("forwards yaml headers on GET", async () => {
    const fetch = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.headers?.["X-Profile-Bits"]).toBe("test");
      return jsonResponse({ ok: true });
    });
    const client = createHttpClient({ fetch, lookup: publicLookup() });
    await client.fetchJson({
      url: JSON_URL,
      headers: { "X-Profile-Bits": "test" },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not reuse cache across different yaml headers", async () => {
    const fetch = vi.fn<HttpFetch>(async (_url, init) =>
      jsonResponse({ h: init?.headers?.["X-Custom"] ?? "none" }),
    );
    const client = createHttpClient({ fetch, lookup: publicLookup() });
    const first = await client.fetchJson({
      url: JSON_URL,
      headers: { "X-Custom": "a" },
    });
    const second = await client.fetchJson({
      url: JSON_URL,
      headers: { "X-Custom": "b" },
    });
    expect(first).toEqual({ h: "a" });
    expect(second).toEqual({ h: "b" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("sends no Authorization when token is unset", async () => {
    const fetch = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.headers?.Authorization).toBeUndefined();
      expect(init?.headers?.["User-Agent"]).toBe(HTTP_USER_AGENT);
      expect(init?.headers?.Accept).toBe(HTTP_ACCEPT);
      expect(init?.redirect).toBe("manual");
      return jsonResponse({ ok: true });
    });
    const client = createHttpClient({ fetch, lookup: publicLookup() });
    await client.fetchJson({ url: JSON_URL });
  });

  it("sends Bearer vs raw scheme", async () => {
    const fetchBearer = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.headers?.Authorization).toBe("Bearer secret");
      return jsonResponse({ ok: true });
    });
    await createHttpClient({
      fetch: fetchBearer,
      lookup: publicLookup(),
      token: "secret",
    }).fetchJson({ url: JSON_URL });

    const fetchRaw = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.headers?.Authorization).toBe("Basic abc");
      return jsonResponse({ ok: true });
    });
    await createHttpClient({
      fetch: fetchRaw,
      lookup: publicLookup(),
      token: "Basic abc",
    }).fetchJson({ url: JSON_URL });
  });

  it("keeps secrets out of error messages", async () => {
    const fetch = vi.fn<HttpFetch>(async () => {
      throw new Error("Authorization: Bearer super-secret boom");
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: "super-secret",
    });
    await expect(client.fetchJson({ url: JSON_URL })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError &&
        !error.message.includes("super-secret"),
    );
  });

  it("fails redirect to a private address", async () => {
    const fetch = vi.fn<HttpFetch>(async (input) => {
      if (input === JSON_URL) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://127.0.0.1/api.json" },
        });
      }
      return jsonResponse({ ok: true });
    });
    const client = createHttpClient({ fetch, lookup: publicLookup() });
    await expect(client.fetchJson({ url: JSON_URL })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError && error.outcome === "fail_widget",
    );
  });

  it("maps http:// to fail_widget before fetch", async () => {
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse({ ok: true }));
    const client = createHttpClient({ fetch, lookup: publicLookup() });
    await expect(
      client.fetchJson({ url: "http://example.com/api.json" }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError && error.outcome === "fail_widget",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps a literal private IP to fail_widget before fetch", async () => {
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse({ ok: true }));
    const lookup = vi.fn(publicLookup());
    const client = createHttpClient({ fetch, lookup });
    await expect(
      client.fetchJson({ url: "https://192.168.1.1/api.json" }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError && error.outcome === "fail_widget",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("maps DNS to a private address to fail_widget before fetch", async () => {
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse({ ok: true }));
    const lookup = vi.fn<HttpLookup>(async () => [
      { address: "10.0.0.1", family: 4 },
    ]);
    const client = createHttpClient({ fetch, lookup });
    await expect(client.fetchJson({ url: JSON_URL })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError && error.outcome === "fail_widget",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).toHaveBeenCalled();
  });

  it("strips BOM before JSON.parse", async () => {
    const fetch = vi.fn<HttpFetch>(async () =>
      jsonResponse('\uFEFF{"ok":true}'),
    );
    const client = createHttpClient({ fetch, lookup: publicLookup() });
    await expect(client.fetchJson({ url: JSON_URL })).resolves.toEqual({
      ok: true,
    });
  });
});
