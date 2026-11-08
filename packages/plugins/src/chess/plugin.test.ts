import { BIT_EXPORTS } from "@profile-bits/bits";
import {
  CHESS_PACK_DEFAULT_WIDGETS,
  WIDGET_INTEGRATIONS,
} from "@profile-bits/core";
import { describe, expect, it } from "vitest";
import {
  CHESS_BITS_USED,
  chessPlugin,
  deriveIntegrationUnion,
} from "./plugin.js";

describe("chessPlugin pack registry", () => {
  it("registers ratings and game on chesscom plus lichess", () => {
    expect(chessPlugin.id).toBe("chess");
    expect(chessPlugin.widgets).toEqual(["ratings", "game"]);
    expect(chessPlugin.integrations).toEqual(["chesscom", "lichess"]);
    expect(chessPlugin.defaults.widgets).toEqual(["ratings"]);
    expect(chessPlugin.defaults.widgets).toEqual([
      ...CHESS_PACK_DEFAULT_WIDGETS,
    ]);
    expect(chessPlugin.defaults.widgets).not.toContain("demo");
    expect(chessPlugin.defaults.widgets).not.toContain("game");
    expect(chessPlugin.docsPath).toBe("chess");
    expect(chessPlugin.bitsUsed).toEqual(CHESS_BITS_USED);
    expect(chessPlugin.bitsUsed).toContain("Stat");
    expect(chessPlugin.bitsUsed).toContain("Board");
    expect(chessPlugin.integrations).toEqual(
      deriveIntegrationUnion(WIDGET_INTEGRATIONS, chessPlugin.widgets),
    );
    for (const name of chessPlugin.bitsUsed) {
      expect(BIT_EXPORTS).toContain(name);
    }
  });
});
