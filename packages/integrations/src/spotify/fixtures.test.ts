import { describe, expect, it, vi } from "vitest";
import { loadFixture, loadSpotifyDumpFixture } from "./loadFixture.js";
import { parseSpotifyDump } from "./payload.js";

describe("spotify fixtures", () => {
  it("keeps album art URLs and extra keys on the dump", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = parseSpotifyDump({
      ...loadSpotifyDumpFixture(),
      unexpected: { nested: true },
    });
    const playing = dump.currently_playing as {
      extra_player_flag: boolean;
      item: { album: { images: { url: string }[] } };
    };
    expect(playing.extra_player_flag).toBe(true);
    expect(playing.item.album.images[0]?.url).toMatch(/^https:\/\//);
    const recent = dump.recently_played as { extra_recent_flag: boolean };
    const top = dump.top_tracks as {
      extra_top_flag: boolean;
      items: unknown[];
    };
    expect(recent.extra_recent_flag).toBe(true);
    expect(top.extra_top_flag).toBe(true);
    expect(top.items.length).toBeGreaterThan(5);
    expect(dump).toHaveProperty("unexpected");
    expect(JSON.stringify(dump)).not.toMatch(/refresh_token|client_secret/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("loads named disk fixtures without network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(loadFixture("currently-playing.json")).toEqual(
      expect.objectContaining({ is_playing: true }),
    );
    expect(loadFixture("recently-played.json")).toEqual(
      expect.objectContaining({ extra_recent_flag: true }),
    );
    expect(loadFixture("top-tracks.json")).toEqual(
      expect.objectContaining({ extra_top_flag: true }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
