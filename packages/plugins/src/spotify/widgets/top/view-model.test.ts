import { describe, expect, it, vi } from "vitest";
import { dumpTopTrackItems } from "../select-dump.js";
import { NO_TOP_TRACKS, topViewModel } from "./view-model.js";

const DUMP = {
  top_tracks: {
    items: [
      {
        name: "Alpha",
        artists: [{ name: "A" }],
        album: {
          name: "Album",
          images: [{ url: "https://img.example/a.jpg" }],
        },
        extra: true,
      },
      { name: "Beta", artists: [{ name: "B" }], album: { name: "B" } },
      { name: "Gamma", artists: [{ name: "C" }], album: { name: "C" } },
    ],
  },
  unexpected: { keep: 1 },
};

describe("topViewModel", () => {
  it("slices limit in the widget and leaves the dump intact", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const model = topViewModel(DUMP, { limit: 2 });
    expect(dumpTopTrackItems(DUMP)).toHaveLength(3);
    expect(model.empty).toBe(false);
    expect(model.tracks.map((track) => track.title)).toEqual(["Alpha", "Beta"]);
    expect(model.tracks[0]?.coverUrl).toBe("https://img.example/a.jpg");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders empty copy and does not invent a track", () => {
    const model = topViewModel({ top_tracks: { items: [] }, extra: 1 });
    expect(model).toEqual({ empty: true, title: NO_TOP_TRACKS, tracks: [] });
  });
});
