import { BIT_EXPORTS } from "@profile-bits/bits";
import {
  SPOTIFY_PACK_DEFAULT_WIDGETS,
  WIDGET_INTEGRATIONS,
} from "@profile-bits/core";
import { describe, expect, it } from "vitest";
import {
  deriveIntegrationUnion,
  SPOTIFY_BITS_USED,
  spotifyPlugin,
} from "./plugin.js";

describe("spotifyPlugin pack registry", () => {
  it("registers now-playing and top on the spotify pack", () => {
    expect(spotifyPlugin.id).toBe("spotify");
    expect(spotifyPlugin.widgets).toEqual(["now-playing", "top"]);
    expect(spotifyPlugin.integrations).toEqual(["spotify"]);
    expect(spotifyPlugin.defaults.widgets).toEqual(["now-playing"]);
    expect(spotifyPlugin.defaults.widgets).toEqual([
      ...SPOTIFY_PACK_DEFAULT_WIDGETS,
    ]);
    expect(spotifyPlugin.defaults.widgets).not.toContain("demo");
    expect(spotifyPlugin.docsPath).toBe("spotify");
    expect(spotifyPlugin.bitsUsed).toEqual(SPOTIFY_BITS_USED);
    expect(spotifyPlugin.bitsUsed).toContain("Image");
    expect(spotifyPlugin.integrations).toEqual(
      deriveIntegrationUnion(WIDGET_INTEGRATIONS, spotifyPlugin.widgets),
    );
    for (const name of spotifyPlugin.bitsUsed) {
      expect(BIT_EXPORTS).toContain(name);
    }
  });
});
