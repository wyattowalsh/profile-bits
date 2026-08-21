import { describe, expect, it, vi } from "vitest";
import {
  createHttpClient,
  HttpClientError,
  type HttpFetch,
  type HttpFetchResponse,
  type HttpLookup,
} from "./client.js";
import { HTTP_MAX_REDIRECTS } from "./ssrf.js";

const PUBLIC_V4 = "93.184.216.34";

function publicLookup(): HttpLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

function streamResponse(
  status: number,
  body: ReadableStream<Uint8Array>,
  headers: Record<string, string> = {},
): HttpFetchResponse {
  const normalized = new Map(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return {
    status,
    headers: {
      get(name) {
        return normalized.get(name.toLowerCase()) ?? null;
      },
    },
    body,
  };
}

function hopUrl(index: number): string {
  return `https://example.com/hop-${index}.json`;
}

function redirectBody(payload: string): {
  body: ReadableStream<Uint8Array>;
  cancel: ReturnType<typeof vi.fn>;
} {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload));
    },
    cancel,
  });
  return { body, cancel };
}

describe("createHttpClient redirect max", () => {
  it("cancels six real 302 bodies then fails without a seventh fetch", async () => {
    const fetchCount = HTTP_MAX_REDIRECTS + 1;
    const hops = Array.from({ length: fetchCount }, (_, index) =>
      hopUrl(index),
    );
    const unusedUrl = hopUrl(fetchCount);
    const streams = hops.map((_, index) => redirectBody(`302-body-${index}`));
    const fetch = vi.fn<HttpFetch>(async (input) => {
      const index = hops.indexOf(input);
      if (index < 0) {
        throw new Error(`unexpected fetch ${input}`);
      }
      const stream = streams[index];
      if (stream == null) {
        throw new Error(`missing redirect body for ${input}`);
      }
      return streamResponse(302, stream.body, {
        location: hopUrl(index + 1),
      });
    });
    const client = createHttpClient({ fetch, lookup: publicLookup() });

    await expect(client.fetchJson({ url: hopUrl(0) })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError &&
        error.outcome === "fail_widget" &&
        error.message === "too many redirects",
    );
    expect(fetch).toHaveBeenCalledTimes(fetchCount);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(hops);
    expect(fetch.mock.calls.map(([url]) => url)).not.toContain(unusedUrl);
    for (const { cancel } of streams) {
      expect(cancel).toHaveBeenCalled();
    }
  });
});
