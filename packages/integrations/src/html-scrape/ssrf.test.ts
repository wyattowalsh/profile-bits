import type { LookupAddress } from "node:dns";
import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import type { RequestOptions } from "node:https";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HTML_ACCEPT,
  HTML_MAX_BYTES,
  HTML_TIMEOUT_MS,
  HTML_USER_AGENT,
  type HtmlFetch,
  type HtmlLookup,
  HtmlScrapeSsrfError,
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
const PAGE_URL = "https://example.com/page";
const IP_LITERAL_URL = `https://${PUBLIC_V4}/page`;

function publicLookup(): HtmlLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

function htmlResponse(
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
        headers: { "content-type": "text/html" },
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
    const fetch = vi.fn<HtmlFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("http://example.com/page", { fetch, lookup }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HtmlScrapeSsrfError && error.message === "https only",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects https://127.0.0.1/ before fetch", async () => {
    const fetch = vi.fn<HtmlFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://127.0.0.1/page", { fetch, lookup }),
    ).rejects.toBeInstanceOf(HtmlScrapeSsrfError);
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects https://169.254.169.254/ before fetch", async () => {
    const fetch = vi.fn<HtmlFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://169.254.169.254/latest/meta-data/", { fetch, lookup }),
    ).rejects.toBeInstanceOf(HtmlScrapeSsrfError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects https://[::1]/ before fetch", async () => {
    const fetch = vi.fn<HtmlFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://[::1]/page", { fetch, lookup }),
    ).rejects.toBeInstanceOf(HtmlScrapeSsrfError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects IPv4-mapped IPv6 loopback", async () => {
    const fetch = vi.fn<HtmlFetch>();
    const lookup = vi.fn(async () => [
      { address: "::ffff:127.0.0.1", family: 6 },
    ]);
    await expect(ssrfGet(PAGE_URL, { fetch, lookup })).rejects.toBeInstanceOf(
      HtmlScrapeSsrfError,
    );
    expect(fetch).not.toHaveBeenCalled();

    const literalFetch = vi.fn<HtmlFetch>();
    const literalLookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://[::ffff:127.0.0.1]/page", {
        fetch: literalFetch,
        lookup: literalLookup,
      }),
    ).rejects.toBeInstanceOf(HtmlScrapeSsrfError);
    expect(literalFetch).not.toHaveBeenCalled();
  });

  it("rejects a private hostname via mocked DNS", async () => {
    const fetch = vi.fn<HtmlFetch>();
    const lookup = vi.fn(async () => [{ address: "10.0.0.1", family: 4 }]);
    await expect(
      ssrfGet("https://internal.example/page", { fetch, lookup }),
    ).rejects.toBeInstanceOf(HtmlScrapeSsrfError);
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).toHaveBeenCalledWith("internal.example", { all: true });
  });

  it("rejects a redirect to a private address", async () => {
    const lookup = vi.fn<HtmlLookup>(async (hostname) => {
      if (hostname === "example.com") {
        return [{ address: PUBLIC_V4, family: 4 }];
      }
      return [{ address: "192.168.1.10", family: 4 }];
    });
    const fetch = vi.fn<HtmlFetch>(async () =>
      htmlResponse("", {
        status: 302,
        headers: { Location: "https://evil.internal/page" },
      }),
    );
    await expect(ssrfGet(PAGE_URL, { fetch, lookup })).rejects.toBeInstanceOf(
      HtmlScrapeSsrfError,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a redirect to http", async () => {
    const fetch = vi.fn<HtmlFetch>(async () =>
      htmlResponse("", {
        status: 302,
        headers: { Location: "http://example.com/page" },
      }),
    );
    await expect(
      ssrfGet(PAGE_URL, { fetch, lookup: publicLookup() }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HtmlScrapeSsrfError && error.message === "https only",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[1]?.redirect).toBe("manual");
  });

  it("rejects an oversize body", async () => {
    const oversize = "x".repeat(HTML_MAX_BYTES + 1);
    const fetch = vi.fn<HtmlFetch>(async () => htmlResponse(oversize));
    await expect(
      ssrfGet(PAGE_URL, { fetch, lookup: publicLookup() }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HtmlScrapeSsrfError &&
        error.message === "body exceeds 1 MiB",
    );
  });

  it("rejects a lying Content-Length over 1 MiB", async () => {
    const fetch = vi.fn<HtmlFetch>(async () => ({
      status: 200,
      headers: {
        get(name: string) {
          return name.toLowerCase() === "content-length"
            ? String(HTML_MAX_BYTES + 1)
            : null;
        },
      },
      body: null,
    }));
    await expect(
      ssrfGet(PAGE_URL, { fetch, lookup: publicLookup() }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HtmlScrapeSsrfError &&
        error.message === "body exceeds 1 MiB",
    );
  });

  it("aborts after a 10s timeout", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetch = vi.fn<HtmlFetch>(async (_input, init) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return htmlResponse("<html></html>");
    });
    await ssrfGet(PAGE_URL, { fetch, lookup: publicLookup() });
    expect(timeout).toHaveBeenCalledWith(HTML_TIMEOUT_MS);
  });

  it("sends a non-auth User-Agent and HTML Accept", async () => {
    const fetch = vi.fn<HtmlFetch>(async (_input, init) => {
      expect(init?.headers?.["User-Agent"]).toBe(HTML_USER_AGENT);
      expect(init?.headers?.Accept).toBe(HTML_ACCEPT);
      expect(init?.headers?.Authorization).toBeUndefined();
      expect(init?.redirect).toBe("manual");
      return htmlResponse("<html></html>");
    });
    const result = await ssrfGet(PAGE_URL, { fetch, lookup: publicLookup() });
    expect(result.status).toBe(200);
    expect(result.body).toBe("<html></html>");
  });

  it("pins https.request to an options bag without Authorization", async () => {
    const captured = stubPinnedHttpsRequest("<html></html>");
    const lookup = vi.fn(publicLookup());
    const result = await ssrfGet(PAGE_URL, { lookup });
    expect(result.status).toBe(200);
    expect(result.body).toBe("<html></html>");
    expect(httpsRequestMock).toHaveBeenCalledTimes(1);
    expect(captured.firstArg).not.toBeInstanceOf(URL);
    expect(captured.options?.hostname).toBe("example.com");
    expect(captured.options?.servername).toBe(captured.options?.hostname);
    expect(headerValue(captured.options?.headers, "User-Agent")).toBe(
      HTML_USER_AGENT,
    );
    expect(headerValue(captured.options?.headers, "Accept")).toBe(HTML_ACCEPT);
    expect(
      headerValue(captured.options?.headers, "Authorization"),
    ).toBeUndefined();
    expect(pinnedLookupAddresses(captured.options, "example.com")).toEqual([
      { address: PUBLIC_V4, family: 4 },
    ]);
  });

  it("pins an IPv4-literal URL with matching servername", async () => {
    const captured = stubPinnedHttpsRequest("<html></html>");
    const lookup = vi.fn(publicLookup());
    const result = await ssrfGet(IP_LITERAL_URL, { lookup });
    expect(result.status).toBe(200);
    expect(result.body).toBe("<html></html>");
    expect(lookup).not.toHaveBeenCalled();
    expect(httpsRequestMock).toHaveBeenCalledTimes(1);
    expect(captured.firstArg).not.toBeInstanceOf(URL);
    expect(captured.options?.hostname).toBe(PUBLIC_V4);
    expect(captured.options?.servername).toBe(PUBLIC_V4);
    expect(headerValue(captured.options?.headers, "User-Agent")).toBe(
      HTML_USER_AGENT,
    );
    expect(headerValue(captured.options?.headers, "Accept")).toBe(HTML_ACCEPT);
    expect(
      headerValue(captured.options?.headers, "Authorization"),
    ).toBeUndefined();
    expect(pinnedLookupAddresses(captured.options, PUBLIC_V4)).toEqual([
      { address: PUBLIC_V4, family: 4 },
    ]);
  });

  it("rejects userinfo before fetch", async () => {
    const fetch = vi.fn<HtmlFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://user:pass@example.com/page", { fetch, lookup }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HtmlScrapeSsrfError &&
        error.message === "ssrf-unsafe url",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
    expect(httpsRequestMock).not.toHaveBeenCalled();
  });

  it.each([
    ["https://[fd00:ec2::254]/page", "ULA"],
    ["https://100.64.0.1/page", "CGNAT"],
    ["https://[2001:db8::1]/page", "reserved docs"],
    ["https://localhost/page", "localhost"],
    ["https://2130706433/page", "decimal IPv4"],
    ["https://metadata.google.internal/computeMetadata/v1/", "GCP metadata"],
    ["https://metadata.internal/latest/meta-data/", "metadata.internal"],
  ] as const)("rejects %s (%s) before fetch", async (url) => {
    const fetch = vi.fn<HtmlFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(ssrfGet(url, { fetch, lookup })).rejects.toBeInstanceOf(
      HtmlScrapeSsrfError,
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(httpsRequestMock).not.toHaveBeenCalled();
  });

  it("rejects github.com before fetch", async () => {
    const fetch = vi.fn<HtmlFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://github.com/octocat", { fetch, lookup }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HtmlScrapeSsrfError &&
        error.message === "github-owned host",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a redirect to github.com", async () => {
    const fetch = vi.fn<HtmlFetch>(async (input) => {
      expect(String(input)).not.toContain("github.com");
      return htmlResponse("", {
        status: 302,
        headers: { Location: "https://github.com/octocat" },
      });
    });
    await expect(
      ssrfGet(PAGE_URL, { fetch, lookup: publicLookup() }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HtmlScrapeSsrfError &&
        error.message === "github-owned host",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("cancels an oversize redirect body without reading it", async () => {
    const cancel = vi.fn(async () => {});
    const fetch = vi.fn<HtmlFetch>(async (input) => {
      if (input === PAGE_URL) {
        return {
          status: 302,
          headers: {
            get(name: string) {
              return name.toLowerCase() === "location"
                ? "https://example.com/final"
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
      return htmlResponse("<html></html>");
    });
    const result = await ssrfGet(PAGE_URL, { fetch, lookup: publicLookup() });
    expect(cancel).toHaveBeenCalled();
    expect(result.status).toBe(200);
    expect(result.body).toBe("<html></html>");
    expect(result.url).toBe("https://example.com/final");
  });

  it("fails closed on mixed public A + private AAAA", async () => {
    const fetch = vi.fn<HtmlFetch>();
    const lookup = vi.fn(async () => [
      { address: PUBLIC_V4, family: 4 },
      { address: "fd00::1", family: 6 },
    ]);
    await expect(ssrfGet(PAGE_URL, { fetch, lookup })).rejects.toBeInstanceOf(
      HtmlScrapeSsrfError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
