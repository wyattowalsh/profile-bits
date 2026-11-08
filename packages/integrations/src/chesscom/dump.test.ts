import { describe, expect, it, vi } from "vitest";
import { createChesscomClient } from "./client.js";
import { loadFixture } from "./loadFixture.js";
import { parseChesscomDump } from "./payload.js";

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

describe("chesscom dump", () => {
  it("keeps extra player stats and game keys from fixtures", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.endsWith("/pub/player/hikaru")) {
        return jsonResponse(loadFixture("player.json"));
      }
      if (url.endsWith("/stats")) {
        return jsonResponse(loadFixture("stats.json"));
      }
      if (url.endsWith("/to-move")) {
        return jsonResponse(loadFixture("games-to-move.json"));
      }
      if (url.endsWith("/archives")) {
        return jsonResponse(loadFixture("archives.json"));
      }
      if (url.endsWith("/2026/08")) {
        return jsonResponse(loadFixture("games-month.json"));
      }
      return jsonResponse({}, 404);
    });
    const dump = await createChesscomClient({ fetch: fetchMock }).fetchDump(
      "hikaru",
    );
    expect(dump.player.username).toBe("hikaru");
    expect(dump.player.extra_player_key).toBe("keep-me");
    expect(dump.player.fide).toBe(2736);
    expect(dump.stats.extra_stats_key).toBe("keep-stats");
    expect(dump.stats.puzzle_rush).toEqual({
      best: { total_attempts: 50, score: 48 },
    });
    expect(dump.current.extra_current_key).toBe("keep-current");
    expect(dump.archives.extra_archives_key).toBe("keep-archives");
    expect(dump.recent.extra_recent_key).toBe("keep-recent");
    const games = dump.recent.games as readonly Record<string, unknown>[];
    expect(games[0]?.fen).toContain("4p3/4P3");
    expect(games[0]?.pgn).toContain("[FEN");
    expect(games[0]?.extra_game_key).toBe("keep-game");
    expect(games[0]?.accuracies).toEqual({ white: 94.2, black: 81.1 });
  });

  it("parse keeps extra keys and does not drop stats slices", () => {
    const dump = parseChesscomDump({
      player: loadFixture("player.json"),
      stats: loadFixture("stats.json"),
      current: loadFixture("games-to-move.json"),
      archives: loadFixture("archives.json"),
      recent: loadFixture("games-month.json"),
    });
    expect(dump?.player.league).toBe("Legend");
    expect(dump?.stats.chess_bullet).toBeDefined();
  });
});
