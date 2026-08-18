import type { LookupAddress } from "node:dns";
import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import type { RequestOptions } from "node:https";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RSS_ACCEPT,
  RSS_MAX_BYTES,
  RSS_TIMEOUT_MS,
  RSS_USER_AGENT,
  type RssFetch,
  type RssLookup,
  RssSsrfError,
  ssrfGet,
} from "./ssrf.js";

const httpsRequestMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("https.request is unmocked; pin-path tests must stub it");
  }),
);

vi.mock("node:https", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:https")>();
  return {
    ...actual,
    request: httpsRequestMock,
  };
});

const PUBLIC_V4 = "93.184.216.34";
const FEED_URL = "https://example.com/feed.xml";
const IP_LITERAL_URL = `https://${PUBLIC_V4}/feed.xml`;

function publicLookup(): RssLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

function textResponse(
  body: string,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: init.headers,
  });
}

function headerValue(
  headers: RequestOptions["headers"],
  name: string,
): string | undefined {
  if (headers == null || Array.isArray(headers)) {
    return undefined;
  }
  const record = headers as Record<string, unknown>;
  const value = record[name] ?? record[name.toLowerCase()];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value.join(", ");
  }
  return undefined;
}

function stubPinnedHttpsRequest(body: string): {
  firstArg: unknown;
  options: RequestOptions | undefined;
} {
  const captured: {
    firstArg: unknown;
    options: RequestOptions | undefined;
  } = { firstArg: undefined, options: undefined };

  httpsRequestMock.mockImplementation(
    (options: unknown, callback?: unknown): ClientRequest => {
      captured.firstArg = options;
      captured.options = options as RequestOptions;
      const res = new PassThrough();
      Object.assign(res, {
        statusCode: 200,
        headers: { "content-type": "application/xml" },
      });
      const req = new EventEmitter() as EventEmitter & {
        end: () => ClientRequest;
        destroy: (error?: Error) => ClientRequest;
      };
      req.end = () => {
        queueMicrotask(() => {
          if (typeof callback === "function") {
            (callback as (incoming: IncomingMessage) => void)(
              res as unknown as IncomingMessage,
            );
          }
          res.end(body);
        });
        return req as unknown as ClientRequest;
      };
      req.destroy = (error?: Error) => {
        if (error != null) {
          req.emit("error", error);
        }
        return req as unknown as ClientRequest;
      };
      return req as unknown as ClientRequest;
    },
  );

  return captured;
}

function pinnedLookupAddresses(
  options: RequestOptions | undefined,
  hostname: string,
): LookupAddress[] {
  const lookup = options?.lookup;
  expect(lookup).toEqual(expect.any(Function));
  let addresses: LookupAddress[] | undefined;
  lookup?.(hostname, { all: true }, ((
    error: NodeJS.ErrnoException | null,
    addressOrAddresses: string | LookupAddress[],
    family?: number,
  ) => {
    expect(error).toBeNull();
    addresses = Array.isArray(addressOrAddresses)
      ? addressOrAddresses
      : [{ address: addressOrAddresses, family: family ?? 4 }];
  }) as (err: Error | null, address: string, family: number) => void);
  expect(addresses).toBeDefined();
  return addresses ?? [];
}

describe("ssrfGet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    httpsRequestMock.mockReset();
    httpsRequestMock.mockImplementation(() => {
      throw new Error("https.request is unmocked; pin-path tests must stub it");
    });
  });

  it("rejects http:// before fetch", async () => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("http://example.com/feed.xml", { fetch, lookup }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssSsrfError && error.message === "https only",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects https://127.0.0.1/ before fetch", async () => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://127.0.0.1/feed.xml", { fetch, lookup }),
    ).rejects.toBeInstanceOf(RssSsrfError);
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects https://169.254.169.254/ before fetch", async () => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://169.254.169.254/latest/meta-data/", { fetch, lookup }),
    ).rejects.toBeInstanceOf(RssSsrfError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects https://[::1]/ before fetch", async () => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://[::1]/feed.xml", { fetch, lookup }),
    ).rejects.toBeInstanceOf(RssSsrfError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects IPv4-mapped IPv6 loopback", async () => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(async () => [
      { address: "::ffff:127.0.0.1", family: 6 },
    ]);
    await expect(ssrfGet(FEED_URL, { fetch, lookup })).rejects.toBeInstanceOf(
      RssSsrfError,
    );
    expect(fetch).not.toHaveBeenCalled();

    const literalFetch = vi.fn<RssFetch>();
    const literalLookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://[::ffff:127.0.0.1]/feed.xml", {
        fetch: literalFetch,
        lookup: literalLookup,
      }),
    ).rejects.toBeInstanceOf(RssSsrfError);
    expect(literalFetch).not.toHaveBeenCalled();
  });

  it("rejects a private hostname via mocked DNS", async () => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(async () => [{ address: "10.0.0.1", family: 4 }]);
    await expect(
      ssrfGet("https://internal.example/feed.xml", { fetch, lookup }),
    ).rejects.toBeInstanceOf(RssSsrfError);
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).toHaveBeenCalledWith("internal.example", { all: true });
  });

  it("rejects a redirect to a private address", async () => {
    const lookup = vi.fn<RssLookup>(async (hostname) => {
      if (hostname === "example.com") {
        return [{ address: PUBLIC_V4, family: 4 }];
      }
      return [{ address: "192.168.1.10", family: 4 }];
    });
    const fetch = vi.fn<RssFetch>(async () =>
      textResponse("", {
        status: 302,
        headers: { Location: "https://evil.internal/feed.xml" },
      }),
    );
    await expect(ssrfGet(FEED_URL, { fetch, lookup })).rejects.toBeInstanceOf(
      RssSsrfError,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a redirect to http", async () => {
    const fetch = vi.fn<RssFetch>(async () =>
      textResponse("", {
        status: 302,
        headers: { Location: "http://example.com/feed.xml" },
      }),
    );
    await expect(
      ssrfGet(FEED_URL, { fetch, lookup: publicLookup() }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssSsrfError && error.message === "https only",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[1]?.redirect).toBe("manual");
  });

  it("rejects an oversize body", async () => {
    const oversize = "x".repeat(RSS_MAX_BYTES + 1);
    const fetch = vi.fn<RssFetch>(async () => textResponse(oversize));
    await expect(
      ssrfGet(FEED_URL, { fetch, lookup: publicLookup() }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssSsrfError && error.message === "body exceeds 1 MiB",
    );
  });

  it("rejects a lying Content-Length over 1 MiB", async () => {
    const fetch = vi.fn<RssFetch>(async () => ({
      status: 200,
      headers: {
        get(name: string) {
          return name.toLowerCase() === "content-length"
            ? String(RSS_MAX_BYTES + 1)
            : null;
        },
      },
      body: null,
    }));
    await expect(
      ssrfGet(FEED_URL, { fetch, lookup: publicLookup() }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssSsrfError && error.message === "body exceeds 1 MiB",
    );
  });

  it("aborts after a 10s timeout", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetch = vi.fn<RssFetch>(async (_input, init) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return textResponse("<rss/>");
    });
    await ssrfGet(FEED_URL, { fetch, lookup: publicLookup() });
    expect(timeout).toHaveBeenCalledWith(RSS_TIMEOUT_MS);
  });

  it("sends a non-auth User-Agent and XML Accept", async () => {
    const fetch = vi.fn<RssFetch>(async (_input, init) => {
      expect(init?.headers?.["User-Agent"]).toBe(RSS_USER_AGENT);
      expect(init?.headers?.Accept).toBe(RSS_ACCEPT);
      expect(init?.headers?.Authorization).toBeUndefined();
      expect(init?.redirect).toBe("manual");
      return textResponse("<rss/>");
    });
    const result = await ssrfGet(FEED_URL, { fetch, lookup: publicLookup() });
    expect(result.status).toBe(200);
    expect(result.body).toBe("<rss/>");
  });

  it("pins https.request to an options bag without Authorization", async () => {
    const captured = stubPinnedHttpsRequest("<rss/>");
    const lookup = vi.fn(publicLookup());
    const result = await ssrfGet(FEED_URL, { lookup });
    expect(result.status).toBe(200);
    expect(result.body).toBe("<rss/>");
    expect(httpsRequestMock).toHaveBeenCalledTimes(1);
    expect(captured.firstArg).not.toBeInstanceOf(URL);
    expect(captured.options?.hostname).toBe("example.com");
    expect(captured.options?.servername).toBe(captured.options?.hostname);
    expect(headerValue(captured.options?.headers, "User-Agent")).toBe(
      RSS_USER_AGENT,
    );
    expect(headerValue(captured.options?.headers, "Accept")).toBe(RSS_ACCEPT);
    expect(
      headerValue(captured.options?.headers, "Authorization"),
    ).toBeUndefined();
    expect(pinnedLookupAddresses(captured.options, "example.com")).toEqual([
      { address: PUBLIC_V4, family: 4 },
    ]);
  });

  it("pins an IPv4-literal URL with matching servername", async () => {
    const captured = stubPinnedHttpsRequest("<rss/>");
    const lookup = vi.fn(publicLookup());
    const result = await ssrfGet(IP_LITERAL_URL, { lookup });
    expect(result.status).toBe(200);
    expect(result.body).toBe("<rss/>");
    expect(lookup).not.toHaveBeenCalled();
    expect(httpsRequestMock).toHaveBeenCalledTimes(1);
    expect(captured.firstArg).not.toBeInstanceOf(URL);
    expect(captured.options?.hostname).toBe(PUBLIC_V4);
    expect(captured.options?.servername).toBe(PUBLIC_V4);
    expect(headerValue(captured.options?.headers, "User-Agent")).toBe(
      RSS_USER_AGENT,
    );
    expect(headerValue(captured.options?.headers, "Accept")).toBe(RSS_ACCEPT);
    expect(
      headerValue(captured.options?.headers, "Authorization"),
    ).toBeUndefined();
    expect(pinnedLookupAddresses(captured.options, PUBLIC_V4)).toEqual([
      { address: PUBLIC_V4, family: 4 },
    ]);
  });

  it("rejects userinfo before fetch", async () => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://user:pass@example.com/feed.xml", { fetch, lookup }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssSsrfError && error.message === "ssrf-unsafe url",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
    expect(httpsRequestMock).not.toHaveBeenCalled();
  });

  it.each([
    ["https://[fd00:ec2::254]/feed.xml", "ULA"],
    ["https://100.64.0.1/feed.xml", "CGNAT"],
    ["https://[2001:db8::1]/feed.xml", "reserved docs"],
    ["https://localhost/feed.xml", "localhost"],
    ["https://2130706433/feed.xml", "decimal IPv4"],
  ] as const)("rejects %s (%s) before fetch", async (url) => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(ssrfGet(url, { fetch, lookup })).rejects.toBeInstanceOf(
      RssSsrfError,
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(httpsRequestMock).not.toHaveBeenCalled();
  });

  it("rejects a redirect to github.com", async () => {
    const fetch = vi.fn<RssFetch>(async (input) => {
      expect(String(input)).not.toContain("github.com");
      return textResponse("", {
        status: 302,
        headers: { Location: "https://github.com/octocat.atom" },
      });
    });
    await expect(
      ssrfGet(FEED_URL, { fetch, lookup: publicLookup() }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssSsrfError && error.message === "github-owned host",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("cancels an oversize redirect body without reading it", async () => {
    const cancel = vi.fn(async () => {});
    const fetch = vi.fn<RssFetch>(async (input) => {
      if (input === FEED_URL) {
        return {
          status: 302,
          headers: {
            get(name: string) {
              return name.toLowerCase() === "location"
                ? "https://example.com/final.xml"
                : null;
            },
          },
          body: {
            cancel,
            getReader() {
              throw new Error("oversize redirect body must not be read");
            },
          },
        };
      }
      return textResponse("<rss/>");
    });
    const result = await ssrfGet(FEED_URL, { fetch, lookup: publicLookup() });
    expect(cancel).toHaveBeenCalled();
    expect(result.status).toBe(200);
    expect(result.body).toBe("<rss/>");
    expect(result.url).toBe("https://example.com/final.xml");
  });
});
