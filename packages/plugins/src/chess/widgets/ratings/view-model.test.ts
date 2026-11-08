import { describe, expect, it, vi } from "vitest";
import { NO_RATINGS, ratingsViewModel } from "./view-model.js";

describe("ratingsViewModel", () => {
  it("shows present chess.com classes and omits missing ones", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const model = ratingsViewModel({
      source: "chesscom",
      dump: {
        player: { username: "hikaru" },
        stats: {
          chess_blitz: { last: { rating: 2800 }, extra: true },
          chess_rapid: { last: { rating: 2700 } },
        },
        current: {},
        archives: {},
        recent: {},
        unused: 1,
      },
    });
    expect(model.empty).toBe(false);
    expect(model.chips).toEqual([
      { label: "Blitz", value: 2800 },
      { label: "Rapid", value: 2700 },
    ]);
    expect(model.chips.some((chip) => chip.label === "Bullet")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("reads lichess perfs and does not invent 0", () => {
    const model = ratingsViewModel({
      source: "lichess",
      dump: {
        user: { perfs: { bullet: { rating: 2600 } } },
        current: {},
        recent: {},
      },
    });
    expect(model.chips).toEqual([{ label: "Bullet", value: 2600 }]);
  });

  it("renders empty copy when no ratings exist", () => {
    expect(ratingsViewModel({ stats: { chess_blitz: {} } })).toEqual({
      empty: true,
      title: NO_RATINGS,
      chips: [],
    });
  });
});
