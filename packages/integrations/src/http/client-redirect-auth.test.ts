import { describe, expect, it, vi } from "vitest";
import {
  createHttpClient,
  HTTP_ACCEPT,
  HTTP_USER_AGENT,
  type HttpFetch,
  type HttpLookup,
} from "./client.js";

const PUBLIC_V4 = "93.184.216.34";
const FIXTURE_TOKEN = "fixture-token-s3cret";
const BEARER = `Bearer ${FIXTURE_TOKEN}`;
const API_JSON = "https://example.com/api.json";
const OTHER_JSON = "https://example.org/other.json";
const A_JSON = "https://example.com/a.json";
const B_JSON = "https://example.com/b.json";
const FOREIGN_B_JSON = "https://example.org/b.json";
const BACK_JSON = "https://example.com/back.json";

function publicLookup(): HttpLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function redirectResponse(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { location },
  });
}

describe("createHttpClient redirect auth", () => {
  it("drops Authorization on cross-origin 302 while keeping Accept, User-Agent, and X-Custom", async () => {
    const fetch = vi.fn<HttpFetch>(async (input) => {
      if (input === API_JSON) {
        return redirectResponse(OTHER_JSON);
      }
      if (input === OTHER_JSON) {
        return jsonResponse({ ok: true });
      }
      throw new Error(`unexpected fetch ${input}`);
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: FIXTURE_TOKEN,
    });

    await expect(
      client.fetchJson({
        url: API_JSON,
        headers: { "X-Custom": "keep-me" },
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0]?.[0]).toBe(API_JSON);
    expect(fetch.mock.calls[1]?.[0]).toBe(OTHER_JSON);

    const hop0 = fetch.mock.calls[0]?.[1]?.headers;
    const hop1 = fetch.mock.calls[1]?.[1]?.headers;
    expect(hop0?.Authorization).toBe(BEARER);
    expect(hop1?.Authorization).toBeUndefined();
    expect(hop1?.Accept).toBe(HTTP_ACCEPT);
    expect(hop1?.["User-Agent"]).toBe(HTTP_USER_AGENT);
    expect(hop1?.["X-Custom"]).toBe("keep-me");
  });

  it("keeps Bearer on a same-origin path 302", async () => {
    const fetch = vi.fn<HttpFetch>(async (input) => {
      if (input === A_JSON) {
        return redirectResponse(B_JSON);
      }
      if (input === B_JSON) {
        return jsonResponse({ ok: true });
      }
      throw new Error(`unexpected fetch ${input}`);
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: FIXTURE_TOKEN,
    });

    await expect(client.fetchJson({ url: A_JSON })).resolves.toEqual({
      ok: true,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0]?.[0]).toBe(A_JSON);
    expect(fetch.mock.calls[1]?.[0]).toBe(B_JSON);
    expect(fetch.mock.calls[0]?.[1]?.headers?.Authorization).toBe(BEARER);
    expect(fetch.mock.calls[1]?.[1]?.headers?.Authorization).toBe(BEARER);
  });

  it("keeps Bearer when Location is a relative same-origin path", async () => {
    const fetch = vi.fn<HttpFetch>(async (input) => {
      if (input === A_JSON) {
        return redirectResponse("/b.json");
      }
      if (input === B_JSON) {
        return jsonResponse({ ok: true });
      }
      throw new Error(`unexpected fetch ${input}`);
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: FIXTURE_TOKEN,
    });

    await expect(client.fetchJson({ url: A_JSON })).resolves.toEqual({
      ok: true,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0]?.[0]).toBe(A_JSON);
    expect(fetch.mock.calls[1]?.[0]).toBe(B_JSON);
    expect(fetch.mock.calls[0]?.[1]?.headers?.Authorization).toBe(BEARER);
    expect(fetch.mock.calls[1]?.[1]?.headers?.Authorization).toBe(BEARER);
  });

  it("does not restore Authorization on hop 2 after A → B → A", async () => {
    const fetch = vi.fn<HttpFetch>(async (input) => {
      if (input === A_JSON) {
        return redirectResponse(FOREIGN_B_JSON);
      }
      if (input === FOREIGN_B_JSON) {
        return redirectResponse(BACK_JSON);
      }
      if (input === BACK_JSON) {
        return jsonResponse({ ok: true });
      }
      throw new Error(`unexpected fetch ${input}`);
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: FIXTURE_TOKEN,
    });

    await expect(client.fetchJson({ url: A_JSON })).resolves.toEqual({
      ok: true,
    });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0]?.[0]).toBe(A_JSON);
    expect(fetch.mock.calls[1]?.[0]).toBe(FOREIGN_B_JSON);
    expect(fetch.mock.calls[2]?.[0]).toBe(BACK_JSON);
    expect(fetch.mock.calls[0]?.[1]?.headers?.Authorization).toBe(BEARER);
    expect(fetch.mock.calls[1]?.[1]?.headers?.Authorization).toBeUndefined();
    expect(fetch.mock.calls[2]?.[1]?.headers?.Authorization).toBeUndefined();
  });
});
