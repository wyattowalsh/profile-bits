import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHttpClient,
  HTTP_CHIPS_ALLOWED_HOSTNAMES,
  HttpClientError,
  type HttpFetch,
  type HttpLookup,
  isHttpChipsOrigin,
} from "./client.js";
import { chipFixture } from "./fixtures/chips/index.js";
import { normalizeBadgeJson } from "./normalize.js";

const PUBLIC_V4 = "93.184.216.34";
const SHIELDCN_NPM = "https://shieldcn.dev/npm/react.json";
const SHIELDS_NPM = "https://img.shields.io/npm/v/react.json";
const JSON_URL = "https://example.com/api.json";
const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(HERE, "..");
const CLIENT_SOURCE = readFileSync(join(HERE, "client.ts"), "utf8");

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

describe("W2-HTTP-03 http client chips origins", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows only shieldcn.dev and img.shields.io", () => {
    expect(HTTP_CHIPS_ALLOWED_HOSTNAMES).toEqual([
      "shieldcn.dev",
      "img.shields.io",
    ]);
    expect(isHttpChipsOrigin("shieldcn.dev")).toBe(true);
    expect(isHttpChipsOrigin("img.shields.io")).toBe(true);
    expect(isHttpChipsOrigin("SHIELDCN.DEV.")).toBe(true);
    expect(isHttpChipsOrigin("www.shieldcn.dev")).toBe(false);
    expect(isHttpChipsOrigin("shields.io")).toBe(false);
    expect(isHttpChipsOrigin("example.com")).toBe(false);
  });

  it("extends live client.ts with no extra vendor client, octokit, or author-integration add", () => {
    expect(existsSync(join(HERE, "client.ts"))).toBe(true);
    expect(existsSync(join(SRC_ROOT, "shieldcn"))).toBe(false);
    expect(existsSync(join(SRC_ROOT, "shields"))).toBe(false);
    expect(CLIENT_SOURCE).toContain("MUST NOT import octokit");
    expect(CLIENT_SOURCE).not.toMatch(/from ["']octokit["']/);
    expect(CLIENT_SOURCE).not.toMatch(/\bplaywright\b/i);
    expect(CLIENT_SOURCE).not.toMatch(/plugin_[a-z]+_[a-z]+_/);
    expect(CLIENT_SOURCE).not.toContain("author-integration");
    expect(CLIENT_SOURCE).not.toContain("normalizeBadgeJson");
    expect(CLIENT_SOURCE).not.toMatch(/\bjmespath\b/i);
    expect(CLIENT_SOURCE).not.toContain("createShieldcnClient");
    expect(CLIENT_SOURCE).not.toContain("createShieldsClient");
    expect(CLIENT_SOURCE.match(/export function createHttpClient/g)).toEqual([
      "export function createHttpClient",
    ]);
  });

  it("caches raw shieldcn badge JSON without mapping value to message", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const body = chipFixture("shieldcn", "npm");
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse(body));
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: "secret",
    });

    const dump = await client.fetchJson({ url: SHIELDCN_NPM });

    expect(dump).toEqual({
      label: "npm",
      value: "19.1.1",
      link: "https://www.npmjs.com/package/react",
    });
    expect(dump).not.toHaveProperty("message");
    expect(dump).not.toHaveProperty("color");
    expect(normalizeBadgeJson(dump)).toEqual({
      label: "npm",
      message: "19.1.1",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[1]?.headers?.Authorization).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("caches raw shields badge JSON including name and value", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<HttpFetch>(async () =>
      jsonResponse(chipFixture("shields", "npm")),
    );
    const client = createHttpClient({ fetch, lookup: publicLookup() });

    await expect(client.fetchJson({ url: SHIELDS_NPM })).resolves.toEqual({
      label: "npm",
      message: "v19.1.1",
      color: "blue",
      name: "npm",
      value: "v19.1.1",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps extra vendor keys on chips dumps and does not strip to six fields", async () => {
    const body = {
      schemaVersion: 1,
      label: "npm",
      value: "19.0.0",
      link: "https://example.com",
      href: "https://example.com/href",
    };
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse(body));
    const client = createHttpClient({ fetch, lookup: publicLookup() });

    await expect(client.fetchJson({ url: SHIELDCN_NPM })).resolves.toEqual(
      body,
    );
  });

  it("forces chips GET auth none even when the shared client has a token", async () => {
    const fetch = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.headers?.Authorization).toBeUndefined();
      return jsonResponse(chipFixture("shieldcn", "npm"));
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: "secret",
    });

    const first = await client.fetchJson({ url: SHIELDCN_NPM });
    const second = await client.fetchJson({
      url: SHIELDCN_NPM,
      auth: "none",
    });

    expect(first).toEqual(second);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("still GETs chips origins when the named token is empty", async () => {
    for (const token of ["", "  \n"]) {
      const fetch = vi.fn<HttpFetch>(async (_url, init) => {
        expect(init?.headers?.Authorization).toBeUndefined();
        return jsonResponse(chipFixture("shieldcn", "npm"));
      });
      const client = createHttpClient({
        fetch,
        lookup: publicLookup(),
        token,
      });
      await expect(
        client.fetchJson({ url: SHIELDCN_NPM }),
      ).resolves.toMatchObject({ label: "npm", value: "19.1.1" });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });

  it("json omit-auth still requires a token and still sends Bearer", async () => {
    const missingFetch = vi.fn<HttpFetch>(async () =>
      jsonResponse({ ok: true }),
    );
    const missing = createHttpClient({
      fetch: missingFetch,
      lookup: publicLookup(),
      token: "",
    });
    await expect(missing.fetchJson({ url: JSON_URL })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError &&
        error.outcome === "fail_widget" &&
        error.code === "missing_token",
    );
    expect(missingFetch).not.toHaveBeenCalled();

    const fetch = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.headers?.Authorization).toBe("Bearer secret");
      return jsonResponse({ keep: true, extra: 1 });
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: "secret",
    });
    await expect(client.fetchJson({ url: JSON_URL })).resolves.toEqual({
      keep: true,
      extra: 1,
    });
  });

  it("fails chips redirects off shieldcn.dev and img.shields.io before the next hop", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<HttpFetch>(async (input) => {
      if (input === SHIELDCN_NPM) {
        return new Response(null, {
          status: 302,
          headers: { location: JSON_URL },
        });
      }
      throw new Error(`unexpected fetch ${input}`);
    });
    const client = createHttpClient({ fetch, lookup: publicLookup() });

    await expect(client.fetchJson({ url: SHIELDCN_NPM })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError &&
        error.outcome === "fail_widget" &&
        error.message.includes("forbidden chips origin") &&
        !error.message.includes(JSON_URL),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows chips hops between shieldcn.dev and img.shields.io with auth none", async () => {
    const fetch = vi.fn<HttpFetch>(async (input, init) => {
      expect(init?.headers?.Authorization).toBeUndefined();
      if (input === SHIELDCN_NPM) {
        return new Response(null, {
          status: 302,
          headers: { location: SHIELDS_NPM },
        });
      }
      if (input === SHIELDS_NPM) {
        return jsonResponse(chipFixture("shields", "npm"));
      }
      throw new Error(`unexpected fetch ${input}`);
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: "secret",
    });

    await expect(
      client.fetchJson({ url: SHIELDCN_NPM }),
    ).resolves.toMatchObject({
      name: "npm",
      value: "v19.1.1",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects www and apex shields hosts as chips origins and still SSRF-checks json", async () => {
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse({ ok: true }));
    const client = createHttpClient({ fetch, lookup: publicLookup() });

    await expect(
      client.fetchJson({ url: "https://www.shieldcn.dev/npm/react.json" }),
    ).resolves.toEqual({ ok: true });
    await expect(
      client.fetchJson({
        url: "http://shieldcn.dev/npm/react.json",
        auth: "none",
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError && error.outcome === "fail_widget",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fails chips dumps that are not badge objects", async () => {
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse(["not", "object"]));
    const client = createHttpClient({ fetch, lookup: publicLookup() });
    await expect(client.fetchJson({ url: SHIELDCN_NPM })).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError &&
        error.outcome === "fail_widget" &&
        error.code === "invalid_json",
    );
  });
});
