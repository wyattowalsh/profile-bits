import { describe, expect, it } from "vitest";
import { loadFixture, loadFixtureText } from "./loadFixture.js";

describe("lichess fixtures", () => {
  it("user fixture keeps perfs extra keys", () => {
    const user = loadFixture("user.json") as Record<string, unknown>;
    expect(user.username).toBe("DrNykterstein");
    expect(user.extra_user_key).toBe("keep-lichess-user");
    expect(user.perfs).toBeDefined();
  });

  it("current game fixture keeps fen and extra keys", () => {
    const current = loadFixture("current-game.json") as Record<string, unknown>;
    expect(current.fen).toEqual(expect.any(String));
    expect(current.extra_current_key).toBe("keep-lichess-current");
  });

  it("recent ndjson keeps extra game keys", () => {
    expect(loadFixtureText("recent-games.ndjson")).toContain(
      "keep-lichess-game",
    );
  });
});
