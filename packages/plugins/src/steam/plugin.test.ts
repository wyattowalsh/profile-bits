import { BIT_EXPORTS } from "@profile-bits/bits";
import {
  STEAM_PACK_DEFAULT_WIDGETS,
  WIDGET_INTEGRATIONS,
} from "@profile-bits/core";
import { describe, expect, it } from "vitest";
import {
  deriveIntegrationUnion,
  STEAM_BITS_USED,
  steamPlugin,
} from "./plugin.js";

describe("steamPlugin pack registry", () => {
  it("registers player and opt-in recent", () => {
    expect(steamPlugin.id).toBe("steam");
    expect(steamPlugin.widgets).toEqual(["player", "recent"]);
    expect(steamPlugin.integrations).toEqual(["steam"]);
    expect(steamPlugin.defaults.widgets).toEqual(["player"]);
    expect(steamPlugin.defaults.widgets).toEqual([
      ...STEAM_PACK_DEFAULT_WIDGETS,
    ]);
    expect(steamPlugin.defaults.widgets).not.toContain("recent");
    expect(steamPlugin.docsPath).toBe("steam");
    expect(steamPlugin.bitsUsed).toEqual(STEAM_BITS_USED);
    expect(steamPlugin.bitsUsed).toContain("Stat");
    expect(steamPlugin.bitsUsed).toContain("Image");
    expect(steamPlugin.integrations).toEqual(
      deriveIntegrationUnion(WIDGET_INTEGRATIONS, steamPlugin.widgets),
    );
    for (const name of steamPlugin.bitsUsed) {
      expect(BIT_EXPORTS).toContain(name);
    }
  });
});
