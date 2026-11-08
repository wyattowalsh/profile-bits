import { describe, expect, it, vi } from "vitest";
import { createLichessClient } from "./client.js";
import { loadFixture, loadFixtureText } from "./loadFixture.js";
import { parseLichessDump, parseNdjsonGames } from "./payload.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
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

describe("lichess dump", () => {
  it("keeps extra user perfs and game keys", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes("/api/games/user/DrNykterstein")) {
        return new Response(loadFixtureText("recent-games.ndjson"), {
          status: 200,
        });
      }
      if (url.endsWith("/current-game")) {
        return jsonResponse(loadFixture("current-game.json"));
      }
      return jsonResponse(loadFixture("user.json"));
    });
    const dump = await createLichessClient({ fetch: fetchMock }).fetchDump(
      "DrNykterstein",
    );
    expect(dump.user.extra_user_key).toBe("keep-lichess-user");
    expect(dump.user.playTime).toEqual({ total: 10000000, tv: 4000000 });
    expect(dump.current.extra_current_key).toBe("keep-lichess-current");
    expect(dump.current.fen).toEqual(expect.any(String));
    const games = dump.recent.games as readonly Record<string, unknown>[];
    expect(games[0]?.extra_game_key).toBe("keep-lichess-game");
    expect(games[0]?.lastFen).toEqual(expect.any(String));
  });

  it("parses ndjson games without dropping extra keys", () => {
    const recent = parseNdjsonGames(loadFixtureText("recent-games.ndjson"));
    const games = recent.games as readonly Record<string, unknown>[];
    expect(games).toHaveLength(1);
    expect(games[0]?.extra_game_key).toBe("keep-lichess-game");
    expect(
      parseLichessDump({
        user: loadFixture("user.json"),
        current: loadFixture("current-game.json"),
        recent,
      })?.user.perfs,
    ).toBeDefined();
  });
});
