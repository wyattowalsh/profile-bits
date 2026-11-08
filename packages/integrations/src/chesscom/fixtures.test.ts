import { describe, expect, it } from "vitest";
import { loadFixture } from "./loadFixture.js";

describe("chesscom fixtures", () => {
  it("player fixture keeps extra keys beyond username", () => {
    const player = loadFixture("player.json") as Record<string, unknown>;
    expect(player.username).toBe("hikaru");
    expect(player.extra_player_key).toBe("keep-me");
    expect(player.fide).toBe(2736);
  });

  it("stats fixture keeps puzzle_rush and extra keys", () => {
    const stats = loadFixture("stats.json") as Record<string, unknown>;
    expect(stats.extra_stats_key).toBe("keep-stats");
    expect(stats.puzzle_rush).toBeDefined();
  });

  it("recent games fixture keeps fen pgn and extra game keys", () => {
    const recent = loadFixture("games-month.json") as {
      games: Record<string, unknown>[];
      extra_recent_key: string;
    };
    expect(recent.extra_recent_key).toBe("keep-recent");
    expect(recent.games[0]?.fen).toEqual(expect.any(String));
    expect(recent.games[0]?.pgn).toContain("[Event");
    expect(recent.games[0]?.extra_game_key).toBe("keep-game");
  });
});
