import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { queryKeyRestCacheKey } from "../query-key/index.js";
import {
  createSteamClient,
  STEAM_ORIGIN,
  STEAM_RECENT_PATH,
  STEAM_SUMMARIES_PATH,
  STEAM_VANITY_PATH,
} from "./client.js";

const TOKEN = "fixture-token";
const STEAM_ID = "76561197960287930";
const HERE = dirname(fileURLToPath(import.meta.url));

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("steam client", () => {
  it("fails the job before any request when the token is missing", async () => {
    const fetchImpl = vi.fn();
    const client = createSteamClient({ fetch: fetchImpl, token: "  " });
    await expect(client.fetchDump("octo")).rejects.toMatchObject({
      outcome: "fail_job",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("skips ResolveVanityURL for a 17-digit steamid and applies ?key=", async () => {
    const fetchImpl = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input));
        expect(url.searchParams.get("key")).toBe(TOKEN);
        expect(init?.headers).toEqual({ Accept: "application/json" });
        expect(JSON.stringify(init?.headers ?? {})).not.toContain(
          "Authorization",
        );
        const cacheKey = queryKeyRestCacheKey({
          method: "GET",
          url: url.toString(),
        });
        expect(cacheKey).toContain("query-key");
        expect(cacheKey).not.toContain(TOKEN);
        if (url.pathname === STEAM_SUMMARIES_PATH) {
          return jsonResponse({
            response: {
              players: [
                {
                  personaname: "Octo",
                  avatarfull: "https://img.example/a.jpg",
                },
              ],
            },
          });
        }
        if (url.pathname === STEAM_RECENT_PATH) {
          return jsonResponse({
            response: {
              total_count: 1,
              games: [{ name: "Half-Life", appid: 70, playtime_forever: 12 }],
              extra: true,
            },
          });
        }
        throw new Error(`unexpected ${url.pathname}`);
      },
    );
    const client = createSteamClient({ fetch: fetchImpl, token: TOKEN });
    const dump = await client.fetchDump(STEAM_ID);
    expect(dump.ResolveVanityURL).toBeUndefined();
    expect(dump.GetRecentlyPlayedGames.response).toMatchObject({ extra: true });
    const paths = fetchImpl.mock.calls.map(
      (call) => new URL(String(call[0])).pathname,
    );
    expect(paths).toContain(STEAM_SUMMARIES_PATH);
    expect(paths).toContain(STEAM_RECENT_PATH);
    expect(paths).not.toContain(STEAM_VANITY_PATH);
    expect(
      paths.every(
        (path) => path.startsWith("/") && STEAM_ORIGIN.startsWith("https://"),
      ),
    ).toBe(true);
  });

  it("resolves a vanity name and keeps the full recent list", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === STEAM_VANITY_PATH) {
        expect(url.searchParams.get("vanityurl")).toBe("octo");
        return jsonResponse({ response: { steamid: STEAM_ID, success: 1 } });
      }
      if (url.pathname === STEAM_SUMMARIES_PATH) {
        expect(url.searchParams.get("steamids")).toBe(STEAM_ID);
        return jsonResponse({
          response: { players: [{ personaname: "Octo" }] },
        });
      }
      return jsonResponse({
        response: { games: [{ name: "A" }, { name: "B" }] },
      });
    });
    const client = createSteamClient({ fetch: fetchImpl, token: TOKEN });
    const dump = await client.fetchDump("octo");
    const games = (dump.GetRecentlyPlayedGames.response as { games: unknown[] })
      .games;
    expect(games).toHaveLength(2);
    expect(dump.ResolveVanityURL).toBeDefined();
  });

  it("fixture files contain no key", () => {
    const fixture = readFileSync(join(HERE, "fixtures/summaries.json"), "utf8");
    expect(fixture).not.toContain(TOKEN);
    expect(fixture).not.toContain("?key=");
    expect(fixture).toContain(
      "GetPlayerSummaries".replace("GetPlayerSummaries", "personaname"),
    );
  });
});
