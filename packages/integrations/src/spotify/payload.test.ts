import { describe, expect, it } from "vitest";
import { loadSpotifyDumpFixture } from "./loadFixture.js";
import { parseSpotifyDump, parseSpotifyTokenResponse } from "./payload.js";

describe("spotify payload", () => {
  it("keeps extra keys on dump parse", () => {
    const dump = parseSpotifyDump({
      ...loadSpotifyDumpFixture(),
      leftover: 1,
    });
    expect(dump.leftover).toBe(1);
  });

  it("requires access_token on the token response and keeps extra keys", () => {
    expect(() => parseSpotifyTokenResponse({})).toThrow();
    expect(
      parseSpotifyTokenResponse({
        access_token: "tok",
        extra: true,
      }),
    ).toMatchObject({ access_token: "tok", extra: true });
  });
});
