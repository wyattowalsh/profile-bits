import { describe, expect, it, vi } from "vitest";
import { recentGameCount, recentGames, steamPlayer } from "./select-dump.js";

const DUMP = {
  GetPlayerSummaries: {
    response: {
      players: [
        {
          personaname: "Octo",
          avatarfull: "https://img.example/a.jpg",
          extra: true,
        },
      ],
    },
  },
  GetRecentlyPlayedGames: {
    response: {
      total_count: 2,
      games: [
        { name: "Alpha", appid: 1, img_icon_url: "aa", playtime_forever: 90 },
        { name: "Beta", appid: 2, img_icon_url: "bb", playtime_forever: 0 },
        { name: "Gamma", appid: 3 },
      ],
      extra: true,
    },
  },
};

describe("steam select-dump", () => {
  it("reads the player and slices recent games without dropping the dump", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(steamPlayer(DUMP)).toEqual({
      name: "Octo",
      avatarUrl: "https://img.example/a.jpg",
    });
    const games = recentGames(DUMP, 1);
    expect(games).toHaveLength(1);
    expect(games[0]?.name).toBe("Alpha");
    expect(games[0]?.hours).toBe(1.5);
    expect(recentGameCount(DUMP)).toBe(3);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("omits a zero playtime instead of inventing a stat", () => {
    const games = recentGames(DUMP, 3);
    expect(games[1]?.hours).toBeUndefined();
    expect(games[2]?.hours).toBeUndefined();
  });

  it("empty players are an empty card", () => {
    expect(
      steamPlayer({ GetPlayerSummaries: { response: { players: [] } } }),
    ).toBe(null);
    expect(
      recentGames({ GetRecentlyPlayedGames: { response: { games: [] } } }, 5),
    ).toEqual([]);
  });
});
