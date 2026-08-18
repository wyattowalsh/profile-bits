import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import type { ClientRequest, IncomingMessage } from "node:http";
import type { RequestOptions } from "node:https";
import { dirname, join } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import {
  createWakatimeClient,
  encodeBasicAuthorization,
  isBlockedAddress,
  WAKATIME_MAX_BYTES,
  WAKATIME_TIMEOUT_MS,
  WakatimeClientError,
} from "./client.js";

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

const TOKEN = "waka_test_token";
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const last7Days = JSON.parse(
  readFileSync(join(fixturesDir, "last_7_days.json"), "utf8"),
) as unknown;

const publicLookup = (async () => [
  { address: "1.1.1.1", family: 4 as const },
]) as typeof import("node:dns/promises").lookup;

const CLOUD_STATS =
  "https://wakatime.com/api/v1/users/current/stats/last_7_days";
const WAKAPI_STATS =
  "https://wakapi.dev/api/compat/wakatime/v1/users/current/stats/last_7_days";

function spyConsole() {
  return {
    log: vi.spyOn(console, "log").mockImplementation(() => {}),
    info: vi.spyOn(console, "info").mockImplementation(() => {}),
    warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
  };
}

function loggedHaystack(spies: ReturnType<typeof spyConsole>): string {
  return JSON.stringify([
    ...spies.log.mock.calls,
    ...spies.info.mock.calls,
    ...spies.warn.mock.calls,
    ...spies.error.mock.calls,
  ]);
}

function jsonResponse(
  status: number,
  body: unknown = {},
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
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

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
    "::ffff:127.0.0.1",
    "0:0:0:0:0:0:0:1",
    "::ffff:7f00:1",
    "0:0:0:0:0:ffff:169.254.169.254",
    "fe81::1",
  ])("blocks %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it("allows a public unicast address", () => {
    expect(isBlockedAddress("1.1.1.1")).toBe(false);
  });
});

describe("createWakatimeClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    httpsRequestMock.mockReset();
    httpsRequestMock.mockImplementation(() => {
      throw new Error("https.request is unmocked; pin-path tests must stub it");
    });
  });

  it("refuses a missing token before fetch", () => {
    expect(() =>
      createWakatimeClient({ token: "", apiDomain: "wakatime.com" }),
    ).toThrow(WakatimeClientError);
  });

  it("GETs the Cloud URL with RFC Basic and fixture last_7_days", async () => {
    const spies = spyConsole();
    const fetchImpl = vi.fn(async () => jsonResponse(200, last7Days));
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    const payload = await client.fetchStats({
      range: "last_7_days",
      include: ["languages", "editors"],
      limit: 8,
    });
    expect(payload.languages).toBeDefined();
    expect(payload.editors).toBeDefined();
    expect(payload).not.toHaveProperty("projects");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(requestUrl(url as RequestInfo | URL)).toBe(CLOUD_STATS);
    expect(requestUrl(url as RequestInfo | URL)).not.toContain("api_key");
    expect(init).toMatchObject({
      method: "GET",
      redirect: "error",
      headers: {
        Authorization: encodeBasicAuthorization(TOKEN),
        Accept: "application/json",
      },
    });
    expect(loggedHaystack(spies)).not.toContain(TOKEN);
    expect(encodeBasicAuthorization(TOKEN)).toBe(
      `Basic ${Buffer.from(`${TOKEN}:`, "utf8").toString("base64")}`,
    );
  });

  it("GETs the Wakapi compat URL", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, last7Days));
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakapi.dev",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    const payload = await client.fetchStats({
      range: "last_7_days",
      include: ["languages", "editors"],
      limit: 8,
    });
    expect(payload.languages).toBeDefined();
    const [url] = fetchImpl.mock.calls[0] ?? [];
    expect(requestUrl(url as RequestInfo | URL)).toBe(WAKAPI_STATS);
  });

  it("never sends a request without Authorization", async () => {
    const fetchImpl = vi.fn();
    expect(() =>
      createWakatimeClient({
        token: "   ",
        apiDomain: "wakatime.com",
        fetch: fetchImpl,
        lookup: publicLookup,
      }),
    ).toThrow(/wakatime_token/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed when DNS resolves to a private IP", async () => {
    const fetchImpl = vi.fn();
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: (async () => [
        { address: "127.0.0.1", family: 4 as const },
      ]) as typeof import("node:dns/promises").lookup,
    });
    await expect(
      client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      }),
    ).rejects.toMatchObject({ outcome: "fail_widget" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(["::ffff:7f00:1", "0:0:0:0:0:ffff:169.254.169.254", "fe81::1"])(
    "fails closed before fetch when DNS returns bypass address %s",
    async (address) => {
      const fetchImpl = vi.fn();
      const lookup = vi.fn(async () => [
        { address, family: 6 as const },
      ]) as typeof import("node:dns/promises").lookup;
      const client = createWakatimeClient({
        token: TOKEN,
        apiDomain: "wakapi.dev",
        fetch: fetchImpl,
        lookup,
      });
      await expect(
        client.fetchStats({
          range: "last_7_days",
          include: ["languages"],
          limit: 8,
        }),
      ).rejects.toMatchObject({
        outcome: "fail_widget",
        message: "api_domain resolved to a blocked address",
      });
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(lookup).toHaveBeenCalledWith("wakapi.dev", { all: true });
    },
  );

  it("fails closed when DNS returns no addresses", async () => {
    const fetchImpl = vi.fn();
    const lookup = vi.fn(
      async () => [],
    ) as typeof import("node:dns/promises").lookup;
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup,
    });
    await expect(
      client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      }),
    ).rejects.toMatchObject({
      outcome: "fail_widget",
      message: "api_domain resolved to no addresses",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(lookup).toHaveBeenCalledWith("wakatime.com", { all: true });
  });

  it("fails closed before fetch when DNS mixes public A and private AAAA", async () => {
    const fetchImpl = vi.fn();
    const lookup = vi.fn(async () => [
      { address: "1.1.1.1", family: 4 as const },
      { address: "fd00::1", family: 6 as const },
    ]) as typeof import("node:dns/promises").lookup;
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup,
    });
    await expect(
      client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      }),
    ).rejects.toMatchObject({
      outcome: "fail_widget",
      message: "api_domain resolved to a blocked address",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(httpsRequestMock).not.toHaveBeenCalled();
    expect(lookup).toHaveBeenCalledWith("wakatime.com", { all: true });
  });

  it("fails when Content-Length exceeds 1 MiB before reading", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        200,
        { ok: true },
        { "content-length": String(WAKATIME_MAX_BYTES + 1) },
      ),
    );
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    await expect(
      client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      }),
    ).rejects.toMatchObject({
      outcome: "fail_widget",
      message: "body exceeds 1 MiB",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("fails when accumulated body exceeds 1 MiB", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("x".repeat(WAKATIME_MAX_BYTES + 1), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "content-length": "10",
          },
        }),
    );
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    await expect(
      client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      }),
    ).rejects.toMatchObject({
      outcome: "fail_widget",
      message: "body exceeds 1 MiB",
    });
  });

  it("aborts after the http/rss request timeout", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetchImpl = vi.fn(async (_input, init) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return jsonResponse(200, last7Days);
    });
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    await client.fetchStats({
      range: "last_7_days",
      include: ["languages"],
      limit: 8,
    });
    expect(timeout).toHaveBeenCalledWith(WAKATIME_TIMEOUT_MS);
  });

  it("pins https to validated addresses without rewriting Host or servername", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const captured = stubPinnedHttpsRequest(last7Days);
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      lookup: publicLookup,
    });
    const payload = await client.fetchStats({
      range: "last_7_days",
      include: ["languages", "editors"],
      limit: 8,
    });
    expect(payload.languages).toBeDefined();
    expect(httpsRequestMock).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(10_000);
    expect(timeout).toHaveBeenCalledWith(WAKATIME_TIMEOUT_MS);
    expect(captured.url).toBeInstanceOf(URL);
    expect(captured.url?.hostname).toBe("wakatime.com");
    expect(captured.url?.href).toBe(CLOUD_STATS);
    expect(captured.url?.href).not.toContain("1.1.1.1");
    expect(captured.options?.servername).toBe("wakatime.com");
    const host =
      headerValue(captured.options?.headers, "Host") ?? captured.url?.host;
    expect(host).toBe("wakatime.com");
    expect(host).not.toBe("1.1.1.1");
  }, 8_000);

  it("reuses the REST cache on a same-run hit", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, last7Days));
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    const first = await client.fetchStats({
      range: "last_7_days",
      include: ["languages", "editors"],
      limit: 8,
    });
    const second = await client.fetchStats({
      range: "last_7_days",
      include: ["languages", "editors"],
      limit: 8,
    });
    expect(second).toEqual(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("caches the unsliced envelope so a later include set can slice independently", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, last7Days));
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    const first = await client.fetchStats({
      range: "last_7_days",
      include: ["languages"],
      limit: 8,
    });
    const second = await client.fetchStats({
      range: "last_7_days",
      include: ["languages", "editors"],
      limit: 8,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second.editors).toBeDefined();
    expect(first).not.toHaveProperty("editors");
  });

  it("wraps invalid 200 JSON as fail_widget without throwing ZodError", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { not: "stats" }));
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    let thrown: unknown;
    try {
      await client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(WakatimeClientError);
    expect(thrown).not.toBeInstanceOf(ZodError);
    expect(thrown).toMatchObject({
      outcome: "fail_widget",
      status: 200,
      message: "WakaTime stats response is invalid",
    });
  });

  it("redacts token and Basic blob from fetch errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("Authorization: Basic leaked");
    });
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    let thrown: unknown;
    try {
      await client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(WakatimeClientError);
    const message = (thrown as WakatimeClientError).message;
    expect(message).not.toContain(TOKEN);
    expect(message).not.toContain(encodeBasicAuthorization(TOKEN));
    expect(message).not.toMatch(/Basic\s+\S+/i);
  });

  it("retries then fails after backoff when is_up_to_date is false", async () => {
    const stale = structuredClone(last7Days) as {
      data: { is_up_to_date: boolean };
    };
    stale.data.is_up_to_date = false;
    const fetchImpl = vi.fn(async () => jsonResponse(200, stale));
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
      sleep: async () => {},
    });
    await expect(
      client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      }),
    ).rejects.toMatchObject({
      outcome: "fail_after_backoff",
      status: 200,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("maps 401 to fail_run", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(401));
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    await expect(
      client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      }),
    ).rejects.toMatchObject({ outcome: "fail_run", status: 401 });
  });

  it("maps 404 to fail_widget", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(404));
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    await expect(
      client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      }),
    ).rejects.toMatchObject({ outcome: "fail_widget", status: 404 });
  });

  it.each([403, 429, 202, 500])(
    "retries then fails after backoff on %s",
    async (status) => {
      const fetchImpl = vi.fn(async () => jsonResponse(status));
      const client = createWakatimeClient({
        token: TOKEN,
        apiDomain: "wakatime.com",
        fetch: fetchImpl,
        lookup: publicLookup,
        sleep: async () => {},
      });
      await expect(
        client.fetchStats({
          range: "last_7_days",
          include: ["languages"],
          limit: 8,
        }),
      ).rejects.toMatchObject({
        outcome: "fail_after_backoff",
        status,
      });
      expect(fetchImpl).toHaveBeenCalledTimes(3);
    },
  );

  it("treats 302 redirect:error as fail_after_backoff", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("unexpected redirect");
    });
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
      sleep: async () => {},
    });
    await expect(
      client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      }),
    ).rejects.toMatchObject({
      outcome: "fail_after_backoff",
      status: 302,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
