import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { redactSecrets } from "@profile-bits/core";
import { describe, expect, it } from "vitest";
import {
  applyQueryKey,
  assertQueryKeyActionToken,
  decideQueryKeyToken,
  isQueryKeyTokenMissing,
  QUERY_KEY_AUTH,
  QUERY_KEY_CACHE_AUTH,
  QUERY_KEY_PARAM,
  queryKeyAuthorizationHeader,
  queryKeyCacheParams,
  queryKeyRequiresAuthorization,
  queryKeyRestCacheKey,
  queryKeySecrets,
  stripQueryKeyFromUrl,
} from "./auth.js";

const STEAM_URL =
  "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/";
const TOKEN = "steam-secret-value";

describe("query-key token policy", () => {
  it("treats empty and whitespace tokens as missing", () => {
    expect(isQueryKeyTokenMissing(undefined)).toBe(true);
    expect(isQueryKeyTokenMissing(null)).toBe(true);
    expect(isQueryKeyTokenMissing("")).toBe(true);
    expect(isQueryKeyTokenMissing("  \n")).toBe(true);
    expect(isQueryKeyTokenMissing(TOKEN)).toBe(false);
  });

  it("fails the job when the pack is on and the token is missing", () => {
    expect(decideQueryKeyToken({ token: undefined, packEnabled: true })).toBe(
      "fail_job",
    );
    expect(decideQueryKeyToken({ token: "", packEnabled: true })).toBe(
      "fail_job",
    );
    expect(decideQueryKeyToken({ token: "  \n", packEnabled: true })).toBe(
      "fail_job",
    );
  });

  it("does not require a token when the pack is absent", () => {
    expect(decideQueryKeyToken({ token: undefined, packEnabled: false })).toBe(
      "render",
    );
    expect(decideQueryKeyToken({ token: "", packEnabled: false })).toBe(
      "render",
    );
  });

  it("allows the run when the pack is on and a token is present", () => {
    expect(decideQueryKeyToken({ token: TOKEN, packEnabled: true })).toBe(
      "render",
    );
  });

  it("throws fail_job on the pack-on construct path", () => {
    expect(() => assertQueryKeyActionToken("")).toThrow(/fail_job/);
    expect(() => assertQueryKeyActionToken(undefined)).toThrow(/\?key=/);
    expect(() => applyQueryKey(STEAM_URL, "  ")).toThrow(/fail_job/);
  });

  it("requires authorization and catalog auth required", () => {
    expect(queryKeyRequiresAuthorization()).toBe(true);
    expect(QUERY_KEY_AUTH).toBe("required");
    expect(QUERY_KEY_PARAM).toBe("key");
    expect(QUERY_KEY_CACHE_AUTH).toBe("query-key");
  });
});

describe("query-key request shape", () => {
  it("injects ?key= and never Authorization Bearer", () => {
    const sent = new URL(applyQueryKey(STEAM_URL, TOKEN));
    expect(sent.searchParams.get("key")).toBe(TOKEN);
    expect(queryKeyAuthorizationHeader(TOKEN)).toEqual({});
    expect(queryKeyAuthorizationHeader(TOKEN)).not.toHaveProperty(
      "Authorization",
    );
    expect(sent.toString()).not.toMatch(/Bearer/i);
  });

  it("does not send a Bearer header even when the token looks like http-optional", () => {
    const bearerShaped = "ghs_not_a_github_token";
    const sent = new URL(applyQueryKey(STEAM_URL, bearerShaped));
    expect(sent.searchParams.get("key")).toBe(bearerShaped);
    expect(queryKeyAuthorizationHeader(bearerShaped)).toEqual({});
  });

  it("preserves other query params and overwrites a caller key", () => {
    const sent = new URL(
      applyQueryKey(`${STEAM_URL}?steamids=1&key=attacker`, `  ${TOKEN}  `),
    );
    expect(sent.searchParams.get("steamids")).toBe("1");
    expect(sent.searchParams.get("key")).toBe(TOKEN);
  });
});

describe("query-key cache and logs", () => {
  it("omits the secret from the cache key and uses auth query-key", () => {
    const sent = applyQueryKey(`${STEAM_URL}?steamids=1`, TOKEN);
    const cacheKey = queryKeyRestCacheKey({
      method: "GET",
      url: sent,
      params: { steamids: "1", key: TOKEN },
    });
    expect(cacheKey).not.toContain(TOKEN);
    expect(cacheKey).toContain(`"auth":"${QUERY_KEY_CACHE_AUTH}"`);
    expect(queryKeyCacheParams({ steamids: "1", key: TOKEN })).toEqual({
      steamids: "1",
    });
    expect(new URL(stripQueryKeyFromUrl(sent)).searchParams.has("key")).toBe(
      false,
    );
  });

  it("distinguishes other params after stripping key", () => {
    const first = queryKeyRestCacheKey({
      method: "GET",
      url: applyQueryKey(`${STEAM_URL}?steamids=1`, TOKEN),
      params: { steamids: "1" },
    });
    const second = queryKeyRestCacheKey({
      method: "GET",
      url: applyQueryKey(`${STEAM_URL}?steamids=2`, TOKEN),
      params: { steamids: "2" },
    });
    expect(first).not.toBe(second);
  });

  it("redacts the token from logged URLs", () => {
    const sent = applyQueryKey(STEAM_URL, TOKEN);
    expect(redactSecrets(sent, queryKeySecrets(TOKEN))).not.toContain(TOKEN);
    expect(queryKeySecrets("")).toEqual([]);
  });
});

describe("auth.query-key.ts.template", () => {
  const templatePath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../.agents/profile-bits/skills/author-integration/assets/templates/auth.query-key.ts.template",
  );
  const template = readFileSync(templatePath, "utf8");

  it("is a literal scheme filename, not an interpolated path", () => {
    expect(templatePath.endsWith("auth.query-key.ts.template")).toBe(true);
    expect(template).not.toContain("auth.{{scheme}}.ts.template");
    expect(template).toContain("{{id}}AuthorizationHeader");
    expect(template).toContain("{{id}}RequiresAuthorization");
    expect(template).toContain("return {};");
    expect(template).toContain("return true;");
    expect(template).toContain("searchParams.set({{ID}}_QUERY_KEY_PARAM");
    expect(template).toContain("fail_job");
    expect(template).not.toMatch(/Authorization:\s*`?Bearer/);
    expect(template).not.toContain("decideActionToken");
  });
});
