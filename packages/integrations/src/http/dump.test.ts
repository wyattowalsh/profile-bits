/**
 * W2-HTTP-06 dump tests. Json cache is the full JSON value. Chips cache is
 * raw badge JSON. Chips GET auth none. Zero live network. No Playwright in
 * the Action.
 */

import { existsSync, globSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paramsFromUrl, restCacheKey } from "../cache.js";
import {
  createHttpClient,
  HTTP_CHIPS_ALLOWED_HOSTNAMES,
  HttpClientError,
  type HttpFetch,
  type HttpLookup,
} from "./client.js";
import {
  CHIP_FIXTURE_PRESETS,
  CHIP_FIXTURE_TYPES,
  chipFixture,
} from "./fixtures/chips/index.js";
import { normalizeBadgeJson } from "./normalize.js";
import { parseHttpJsonDump, parseRawBadgeJson } from "./payload.js";
import { expandChipsRequest } from "./presets.js";

const PUBLIC_V4 = "93.184.216.34";
const JSON_URL = "https://example.com/api.json";
const TOKEN = "super-secret-token";
const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(HERE, "..");
const REPO_ROOT = join(HERE, "../../../..");
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

function chipUrl(
  preset: (typeof CHIP_FIXTURE_PRESETS)[number],
  type: (typeof CHIP_FIXTURE_TYPES)[number],
): string {
  return expandChipsRequest({
    preset,
    type,
    user: "vercel",
    repo: "next.js",
    packageName: "react",
  }).url.href;
}

function chipsBodies(): Map<string, unknown> {
  const bodies = new Map<string, unknown>();
  for (const preset of CHIP_FIXTURE_PRESETS) {
    for (const type of CHIP_FIXTURE_TYPES) {
      bodies.set(chipUrl(preset, type), chipFixture(preset, type));
    }
  }
  return bodies;
}

describe("W2-HTTP-06 http dump", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    try {
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("caches the full JSON value without dropping keys the json card would truncate", async () => {
    const body = {
      hostname: "api.example.com",
      count: 9,
      nested: { keep: true, extra: "stay" },
      alpha: 1,
      bravo: 2,
      charlie: 3,
      delta: 4,
    };
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse(body));
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: TOKEN,
    });

    const dump = await client.fetchJson({ url: JSON_URL });
    const cached = await client.fetchJson({ url: JSON_URL });

    expect(dump).toEqual(body);
    expect(cached).toEqual(body);
    expect(parseHttpJsonDump(dump)).toEqual(body);
    expect(JSON.stringify(dump)).not.toContain(TOKEN);
    expect(fetch.mock.calls[0]?.[1]?.headers?.Authorization).toBe(
      `Bearer ${TOKEN}`,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not evaluate jmespath at fetch and keeps nested keys the widget would slice", async () => {
    const body = {
      foo: { bar: 1, leftover: "keep" },
      extra: 2,
      rows: [{ a: 1, b: 2 }],
    };
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse(body));
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: TOKEN,
    });

    await expect(client.fetchJson({ url: JSON_URL })).resolves.toEqual(body);
    expect(CLIENT_SOURCE).not.toMatch(/\bjmespath\b/i);
    expect(CLIENT_SOURCE).not.toContain("normalizeBadgeJson");
  });

  it("dumps arrays and primitives for json and keeps extra object keys", async () => {
    const fetch = vi.fn<HttpFetch>(async (input) => {
      if (input.endsWith("/arr.json")) {
        return jsonResponse([
          { a: 1, b: 2 },
          { a: 3, b: 4 },
        ]);
      }
      if (input.endsWith("/n.json")) {
        return jsonResponse(0);
      }
      return jsonResponse(false);
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: TOKEN,
    });

    await expect(
      client.fetchJson({ url: "https://example.com/arr.json" }),
    ).resolves.toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    await expect(
      client.fetchJson({ url: "https://example.com/n.json" }),
    ).resolves.toBe(0);
    await expect(
      client.fetchJson({ url: "https://example.com/f.json" }),
    ).resolves.toBe(false);
  });

  it("dumps every chip fixture as raw badge JSON with chips GET auth none", async () => {
    const bodies = chipsBodies();
    const fetch = vi.fn<HttpFetch>(async (input, init) => {
      expect(init?.headers?.Authorization).toBeUndefined();
      const body = bodies.get(input);
      if (body === undefined) {
        throw new Error(`unexpected fetch ${input}`);
      }
      return jsonResponse(body);
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: TOKEN,
    });

    const dumps = await Promise.all(
      [...bodies.entries()].map(async ([url, fixture]) => {
        const dump = await client.fetchJson({ url, auth: "none" });
        expect(dump).toEqual(fixture);
        expect(parseRawBadgeJson(dump)).toEqual(fixture);
        expect(JSON.stringify(dump)).not.toContain(TOKEN);
        return dump;
      }),
    );

    expect(dumps).toHaveLength(
      CHIP_FIXTURE_PRESETS.length * CHIP_FIXTURE_TYPES.length,
    );
    expect(fetch).toHaveBeenCalledTimes(dumps.length);
    expect(HTTP_CHIPS_ALLOWED_HOSTNAMES).toEqual([
      "shieldcn.dev",
      "img.shields.io",
    ]);
  });

  it("keeps shieldcn link/value and shields name/value on the cached dump", async () => {
    const shieldcn = chipFixture("shieldcn", "npm");
    const shields = chipFixture("shields", "npm");
    const fetch = vi.fn<HttpFetch>(async (input, init) => {
      expect(init?.headers?.Authorization).toBeUndefined();
      if (input === chipUrl("shieldcn", "npm")) {
        return jsonResponse(shieldcn);
      }
      if (input === chipUrl("shields", "npm")) {
        return jsonResponse(shields);
      }
      throw new Error(`unexpected fetch ${input}`);
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: TOKEN,
    });

    const shieldcnDump = await client.fetchJson({
      url: chipUrl("shieldcn", "npm"),
    });
    const shieldsDump = await client.fetchJson({
      url: chipUrl("shields", "npm"),
    });

    expect(shieldcnDump).toEqual({
      label: "npm",
      value: "19.1.1",
      link: "https://www.npmjs.com/package/react",
    });
    expect(shieldcnDump).not.toHaveProperty("message");
    expect(shieldcnDump).not.toHaveProperty("color");
    expect(normalizeBadgeJson(shieldcnDump)).toEqual({
      label: "npm",
      message: "19.1.1",
    });
    expect(normalizeBadgeJson(shieldcnDump)).not.toHaveProperty("link");
    expect(normalizeBadgeJson(shieldcnDump)).not.toHaveProperty("value");

    expect(shieldsDump).toEqual({
      label: "npm",
      message: "v19.1.1",
      color: "blue",
      name: "npm",
      value: "v19.1.1",
    });
    expect(normalizeBadgeJson(shieldsDump)).toEqual({
      label: "npm",
      message: "v19.1.1",
      color: "blue",
    });
  });

  it("keeps extra vendor keys on chips dumps and does not map value to message at fetch", async () => {
    const body = {
      schemaVersion: 1,
      label: "npm",
      value: "19.0.0",
      link: "https://example.com",
      href: "https://example.com/href",
      extra: true,
    };
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse(body));
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: TOKEN,
    });

    const dump = await client.fetchJson({ url: chipUrl("shieldcn", "npm") });
    expect(dump).toEqual(body);
    expect(dump).not.toHaveProperty("message");
    expect(normalizeBadgeJson(dump)).toEqual({
      label: "npm",
      message: "19.0.0",
    });
  });

  it("keys chips dumps as cache auth none and coalesces origin-forced none with request auth none", async () => {
    const body = chipFixture("shieldcn", "stars");
    const url = chipUrl("shieldcn", "stars");
    const fetch = vi.fn<HttpFetch>(async (_input, init) => {
      expect(init?.headers?.Authorization).toBeUndefined();
      return jsonResponse(body);
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: TOKEN,
    });

    const first = await client.fetchJson({ url });
    const second = await client.fetchJson({ url, auth: "none" });
    expect(first).toEqual(body);
    expect(second).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);

    const noneKey = restCacheKey({
      method: "GET",
      url,
      params: paramsFromUrl(url),
      auth: "none",
    });
    const bearerKey = restCacheKey({
      method: "GET",
      url,
      params: paramsFromUrl(url),
      auth: "bearer",
    });
    expect(JSON.parse(noneKey)).toMatchObject({ auth: "none" });
    expect(noneKey).not.toContain(TOKEN);
    expect(noneKey).not.toBe(bearerKey);
  });

  it("does not share json bearer dumps with chips none dumps", async () => {
    const jsonBody = { hostname: "api.example.com", extra: true };
    const chipsBody = chipFixture("shieldcn", "npm");
    const fetch = vi.fn<HttpFetch>(async (input, init) => {
      if (input === JSON_URL) {
        expect(init?.headers?.Authorization).toBe(`Bearer ${TOKEN}`);
        return jsonResponse(jsonBody);
      }
      if (input === chipUrl("shieldcn", "npm")) {
        expect(init?.headers?.Authorization).toBeUndefined();
        return jsonResponse(chipsBody);
      }
      throw new Error(`unexpected fetch ${input}`);
    });
    const client = createHttpClient({
      fetch,
      lookup: publicLookup(),
      token: TOKEN,
    });

    await expect(client.fetchJson({ url: JSON_URL })).resolves.toEqual(
      jsonBody,
    );
    await expect(
      client.fetchJson({ url: chipUrl("shieldcn", "npm") }),
    ).resolves.toEqual(chipsBody);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails chips dumps that are not badge objects without a live GET", async () => {
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse(["not", "object"]));
    const client = createHttpClient({ fetch, lookup: publicLookup() });

    await expect(
      client.fetchJson({ url: chipUrl("shieldcn", "npm") }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpClientError &&
        error.outcome === "fail_widget" &&
        error.code === "invalid_json",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("extends live client.ts with no extra vendor client, octokit, or Playwright", () => {
    expect(existsSync(join(HERE, "client.ts"))).toBe(true);
    expect(existsSync(join(SRC_ROOT, "shieldcn"))).toBe(false);
    expect(existsSync(join(SRC_ROOT, "shields"))).toBe(false);
    expect(CLIENT_SOURCE).toContain("MUST NOT import octokit");
    expect(CLIENT_SOURCE).not.toMatch(/from ["']octokit["']/);
    expect(CLIENT_SOURCE).not.toMatch(/\bplaywright\b/i);
    expect(CLIENT_SOURCE).not.toMatch(/plugin_[a-z]+_[a-z]+_/);
    expect(CLIENT_SOURCE).not.toContain("author-integration");
    expect(CLIENT_SOURCE).not.toContain("createShieldcnClient");
    expect(CLIENT_SOURCE).not.toContain("createShieldsClient");
  });

  it("keeps Playwright out of the Action and flattened plugin_*_*_* inputs out of action.yml", () => {
    const actionYml = readFileSync(join(REPO_ROOT, "action.yml"), "utf8");
    const actionPackage = readFileSync(
      join(REPO_ROOT, "packages/action/package.json"),
      "utf8",
    );
    const actionSources = globSync("packages/action/src/**/*.{ts,js}", {
      cwd: REPO_ROOT,
    }).map((relative: string) =>
      readFileSync(join(REPO_ROOT, relative), "utf8"),
    );
    const packager = join(REPO_ROOT, "scripts/package-action.mts");

    expect(actionSources.length).toBeGreaterThan(0);
    expect(actionYml).not.toMatch(/plugin_[a-z]+_[a-z]+_[a-z]+/);
    expect(actionYml).not.toMatch(/\bplaywright\b/i);
    expect(actionPackage).not.toMatch(/\bplaywright\b/i);
    for (const source of actionSources) {
      expect(source).not.toMatch(/\bplaywright\b/i);
    }
    if (existsSync(packager)) {
      expect(readFileSync(packager, "utf8")).not.toMatch(/\bplaywright\b/i);
    }
  });
});
