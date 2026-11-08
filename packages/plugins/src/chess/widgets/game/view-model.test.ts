import { describe, expect, it, vi } from "vitest";
import { gameViewModel, NO_GAME } from "./view-model.js";

const TAGGED = '[FEN "8/8/8/8/8/8/8/4K2k w - - 0 1"]';

describe("gameViewModel", () => {
  it("prefers fen over a pgn tag", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const model = gameViewModel({
      source: "chesscom",
      dump: {
        current: {
          games: [
            {
              fen: "8/8/8/8/8/8/8/K6k w - - 0 1",
              pgn: TAGGED,
              white: { username: "a" },
              black: { username: "b" },
              extra: true,
            },
          ],
        },
      },
    });
    expect(model.fen).toBe("8/8/8/8/8/8/8/K6k w - - 0 1");
    expect(model.title).toBe("a vs b");
    expect(model.empty).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("falls back to a PGN FEN tag", () => {
    const model = gameViewModel({
      recent: { games: [{ pgn: TAGGED }] },
    });
    expect(model.fen).toBe("8/8/8/8/8/8/8/4K2k w - - 0 1");
  });

  it("renders empty copy when no position exists", () => {
    expect(gameViewModel({ current: { games: [] }, extra: 1 })).toEqual({
      empty: true,
      title: NO_GAME,
    });
  });
});
