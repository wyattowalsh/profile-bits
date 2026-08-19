import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHttpClient,
  HttpClientError,
  type HttpFetch,
  type HttpFetchResponse,
  type HttpLookup,
} from "./client.js";

const PUBLIC_V4 = "93.184.216.34";
const FIXTURE_TOKEN = "fixture-token-s3cret";
const JSON_URL = `https://example.com/api.json?api_key=${FIXTURE_TOKEN}#frag`;
const HOP_A = "https://example.com/a.json";
const HOP_B = "https://example.com/b.json";
const HOP_C = "https://example.com/c.json";
const TIMEOUT_MS = 25;

type HttpClientErrorShape = HttpClientError & {
  code?: string;
  host?: string;
  attempt?: number;
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

function redirectResponse(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { location },
  });
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

function errorHaystack(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 6; depth += 1) {
    if (current == null || seen.has(current)) {
      break;
    }
    seen.add(current);
    if (current instanceof Error) {
      parts.push(current.name, current.message, current.stack ?? "");
      current = current.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  if (typeof error === "object" && error != null) {
    parts.push(JSON.stringify(error));
  }
  return parts.join("\n");
}

function expectNoSecrets(error: unknown, url: string, token: string): void {
  const haystack = errorHaystack(error);
  expect(haystack).not.toContain("Bearer");
  expect(haystack).not.toContain(token);
  expect(haystack).not.toContain(url);
}

function expectFailWidget(
  error: unknown,
): asserts error is HttpClientErrorShape {
  expect(error).toBeInstanceOf(HttpClientError);
  const clientError = error as HttpClientErrorShape;
  expect(clientError.outcome).toBe("fail_widget");
}

function expectOptionalField(
  error: HttpClientErrorShape,
  key: "code" | "host" | "attempt",
  expected: string | number,
): void {
  if (key in error) {
    expect(error[key]).toBe(expected);
  }
}

describe("createHttpClient timeout", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("times out a never-resolving lookup without calling fetch", async () => {
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse({ ok: true }));
    const lookup = vi.fn<HttpLookup>(() => new Promise(() => undefined));
    const client = createHttpClient({
      fetch,
      lookup,
      token: FIXTURE_TOKEN,
    });

    await expect(
      client.fetchJson({ url: JSON_URL, timeout_ms: TIMEOUT_MS }),
    ).rejects.toSatisfy((error: unknown) => {
      expectFailWidget(error);
      expect(error.code).toBe("timeout");
      expect(error.host).toBe("example.com");
      expect(error.message).not.toContain("?");
      expect(error.message).not.toContain("#");
      expect(error.message).not.toContain(FIXTURE_TOKEN);
      expectNoSecrets(error, JSON_URL, FIXTURE_TOKEN);
      return true;
    });
    expect(lookup).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  }, 1_500);

  it("reuses one abort signal across two 302 hops and a 200", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetch = vi.fn<HttpFetch>(async (input) => {
      if (input === HOP_A) {
        return redirectResponse(HOP_B);
      }
      if (input === HOP_B) {
        return redirectResponse(HOP_C);
      }
      return jsonResponse({ ok: true });
    });
    const client = createHttpClient({ fetch, lookup: publicLookup() });

    try {
      await expect(client.fetchJson({ url: HOP_A })).resolves.toEqual({
        ok: true,
      });
      expect(fetch).toHaveBeenCalledTimes(3);
      const signals = fetch.mock.calls.map(([, init]) => init?.signal);
      expect(signals).toHaveLength(3);
      expect(signals[0]).toBeInstanceOf(AbortSignal);
      expect(signals[1]).toBe(signals[0]);
      expect(signals[2]).toBe(signals[0]);
      expect(timeout).toHaveBeenCalledTimes(1);
    } finally {
      timeout.mockRestore();
    }
  });

  it("cancels a real 302 body before following Location", async () => {
    const cancel = vi.fn();
    const redirectBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("302-body"));
      },
      cancel,
    });
    const fetch = vi.fn<HttpFetch>(async (input) => {
      if (input === HOP_A) {
        return streamResponse(302, redirectBody, { location: HOP_B });
      }
      return jsonResponse({ ok: true });
    });
    const client = createHttpClient({ fetch, lookup: publicLookup() });

    await expect(client.fetchJson({ url: HOP_A })).resolves.toEqual({
      ok: true,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalled();
  });

  it("times out a hung 200 body during reader.read", async () => {
    let pullStarted = false;
    let releasePull: (() => void) | undefined;
    const fetch = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.signal?.aborted).toBe(false);
      return streamResponse(
        200,
        new ReadableStream<Uint8Array>({
          pull() {
            pullStarted = true;
            return new Promise<void>((resolve) => {
              releasePull = resolve;
            });
          },
          cancel() {
            releasePull?.();
          },
        }),
      );
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: FIXTURE_TOKEN,
    });

    await expect(
      client.fetchJson({ url: JSON_URL, timeout_ms: TIMEOUT_MS }),
    ).rejects.toSatisfy((error: unknown) => {
      expectFailWidget(error);
      expect(error.code).toBe("timeout");
      expect(error.host).toBe("example.com");
      expect(error.message).not.toContain("?");
      expect(error.message).not.toContain("#");
      expectNoSecrets(error, JSON_URL, FIXTURE_TOKEN);
      return true;
    });
    expect(pullStarted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  }, 1_500);

  it("records attempt 1 on 401 without leaking Bearer or href", async () => {
    const fetch = vi.fn<HttpFetch>(async () =>
      jsonResponse({ error: true }, { status: 401 }),
    );
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: FIXTURE_TOKEN,
    });

    await expect(client.fetchJson({ url: JSON_URL })).rejects.toSatisfy(
      (error: unknown) => {
        expectFailWidget(error);
        expect(error.status).toBe(401);
        expectOptionalField(error, "attempt", 1);
        expectOptionalField(error, "code", "http_status");
        expectOptionalField(error, "host", "example.com");
        expectNoSecrets(error, JSON_URL, FIXTURE_TOKEN);
        return true;
      },
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("records attempt 3 on 429 without leaking Bearer or href", async () => {
    const fetch = vi.fn<HttpFetch>(async () =>
      jsonResponse({ error: true }, { status: 429 }),
    );
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: FIXTURE_TOKEN,
      sleep: async () => undefined,
    });

    await expect(client.fetchJson({ url: JSON_URL })).rejects.toSatisfy(
      (error: unknown) => {
        expectFailWidget(error);
        expect(error.status).toBe(429);
        expectOptionalField(error, "attempt", 3);
        expectOptionalField(error, "code", "http_status");
        expectOptionalField(error, "host", "example.com");
        expectNoSecrets(error, JSON_URL, FIXTURE_TOKEN);
        return true;
      },
    );
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
