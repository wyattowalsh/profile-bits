import type { LookupAddress } from "node:dns";
import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import type { RequestOptions } from "node:https";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpClient, type HttpLookup } from "./client.js";

const httpsRequestMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("https.request is unmocked");
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
const JSON_URL = "https://example.com/api.json";
const TOKEN = "http_pin_test_token";

type PinLookup = (
  hostname: string,
  lookupOptions: { all?: boolean; family?: number },
  callback: (
    err: Error | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
) => void;

function publicLookup(): HttpLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
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

function stubPinnedHttpsRequest(body: unknown): {
  url: URL | undefined;
  options: RequestOptions | undefined;
} {
  const captured: {
    url: URL | undefined;
    options: RequestOptions | undefined;
  } = { url: undefined, options: undefined };

  httpsRequestMock.mockImplementation(
    (url: unknown, options: unknown, callback?: unknown): ClientRequest => {
      captured.url = url as URL;
      captured.options = options as RequestOptions;
      const json = JSON.stringify(body);
      const res = new PassThrough();
      Object.assign(res, {
        statusCode: 200,
        headers: { "content-type": "application/json" },
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
          res.end(json);
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

function invokePinLookup(
  options: RequestOptions | undefined,
  hostname: string,
  lookupOptions: { all: true } | { family: 4 } | { family: 6 },
): { error: Error | null; addresses: LookupAddress[] } {
  const lookup = options?.lookup as PinLookup | undefined;
  expect(lookup).toEqual(expect.any(Function));
  let error: Error | null = null;
  let addresses: LookupAddress[] = [];
  lookup?.(hostname, lookupOptions, (err, addressOrAddresses, family) => {
    error = err;
    if (err != null) {
      return;
    }
    addresses = Array.isArray(addressOrAddresses)
      ? addressOrAddresses
      : [{ address: addressOrAddresses, family: family ?? 4 }];
  });
  return { error, addresses };
}

describe("createHttpClient pin path", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    httpsRequestMock.mockReset();
    httpsRequestMock.mockImplementation(() => {
      throw new Error("https.request is unmocked");
    });
  });

  it("production GET pins DNS without global fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const captured = stubPinnedHttpsRequest({ ok: true });
    const lookup = vi.fn(publicLookup());
    const client = createHttpClient({ lookup });

    await expect(client.fetchJson({ url: JSON_URL })).resolves.toEqual({
      ok: true,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(httpsRequestMock).toHaveBeenCalledTimes(1);
    expect(httpsRequestMock.mock.calls[0]).toHaveLength(3);
    expect(httpsRequestMock.mock.calls[0]?.[0]).toBeInstanceOf(URL);
    expect(captured.url).toBeInstanceOf(URL);
    expect(captured.url?.hostname).toBe("example.com");
    expect(captured.url?.href).toBe(JSON_URL);
    expect(captured.url?.hostname).not.toBe(PUBLIC_V4);
    expect(captured.url?.href).not.toContain(PUBLIC_V4);
    expect(captured.options?.servername).toBe("example.com");

    const host =
      headerValue(captured.options?.headers, "Host") ?? captured.url?.host;
    expect(host).toBe("example.com");
    expect(host).not.toBe(PUBLIC_V4);

    const headerHaystack = JSON.stringify(captured.options?.headers ?? {});
    expect(headerHaystack).not.toContain(PUBLIC_V4);
    expect(headerHaystack).not.toContain(TOKEN);

    const all = invokePinLookup(captured.options, "example.com", {
      all: true,
    });
    expect(all.error).toBeNull();
    expect(all.addresses).toEqual([{ address: PUBLIC_V4, family: 4 }]);

    const family4 = invokePinLookup(captured.options, "example.com", {
      family: 4,
    });
    expect(family4.error).toBeNull();
    expect(family4.addresses).toEqual([{ address: PUBLIC_V4, family: 4 }]);

    const family6 = invokePinLookup(captured.options, "example.com", {
      family: 6,
    });
    expect(family6.error).toSatisfy(
      (error: unknown) =>
        error instanceof Error && error.message.includes("ENOTFOUND"),
    );

    expect(lookup).toHaveBeenCalledWith("example.com", { all: true });
  });
});
