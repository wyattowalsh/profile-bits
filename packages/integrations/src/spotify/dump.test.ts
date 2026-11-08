import { describe, expect, it, vi } from "vitest";
import { createSpotifyClient } from "./client.js";
import { loadFixture, loadSpotifyDumpFixture } from "./loadFixture.js";
import { parseSpotifyDump } from "./payload.js";

const REFRESH = "dump-refresh-token";
const ACCESS = "dump-access-token";

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

describe("spotify dump", () => {
  it("keeps extra fixture keys after a mocked fetch", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(requestUrl(input));
      if (url.pathname.endsWith("/api/token")) {
        return jsonResponse({ access_token: ACCESS, extra_token_flag: true });
      }
      if (url.pathname.endsWith("/currently-playing")) {
        return jsonResponse(loadFixture("currently-playing.json"));
      }
      if (url.pathname.endsWith("/recently-played")) {
        return jsonResponse(loadFixture("recently-played.json"));
      }
      if (url.pathname.endsWith("/top/tracks")) {
        return jsonResponse(loadFixture("top-tracks.json"));
      }
      throw new Error(url.href);
    });
    const client = createSpotifyClient({
      token: REFRESH,
      clientId: "cid",
      clientSecret: "csecret",
      fetch: fetchMock,
    });
    const dump = await client.fetchDump();
    expect(dump.currently_playing).toEqual(
      expect.objectContaining({ extra_player_flag: true }),
    );
    expect(dump.recently_played).toEqual(
      expect.objectContaining({ extra_recent_flag: true }),
    );
    expect(dump.top_tracks).toEqual(
      expect.objectContaining({ extra_top_flag: true }),
    );
    const serialized = JSON.stringify(dump);
    expect(serialized).not.toContain(REFRESH);
    expect(serialized).not.toContain(ACCESS);
    expect(serialized).not.toContain("csecret");
  });

  it("parses a fixture dump with extra keys without dropping album art", () => {
    const dump = parseSpotifyDump({
      ...loadSpotifyDumpFixture(),
      market: "US",
    });
    expect(dump).toHaveProperty("market", "US");
    const playing = dump.currently_playing as {
      item: { album: { images: { url: string }[] } };
    };
    expect(playing.item.album.images[0]?.url).toContain("i.scdn.co");
  });
});
