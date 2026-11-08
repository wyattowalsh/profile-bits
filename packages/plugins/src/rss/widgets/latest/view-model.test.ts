import { loadFixture, parseRssXml } from "@profile-bits/integrations";
import { describe, expect, it } from "vitest";
import {
  type LatestReaderItem,
  latestAt,
  readLatestItem,
  sliceLatestItems,
} from "./view-model.js";

const OLD: LatestReaderItem = {
  title: "Old",
  url: "https://example.com/old",
  published_at: "2026-01-01T00:00:00.000Z",
  updated: null,
};

const NEW: LatestReaderItem = {
  title: "New",
  url: "https://example.com/new",
  published_at: "2026-08-01T00:00:00.000Z",
  updated: null,
};

describe("latest view-model", () => {
  it("prefers updated over published_at for Time", () => {
    const item: LatestReaderItem = {
      title: "Both",
      url: "https://example.com/both",
      published_at: "2026-08-16T11:00:00.000Z",
      updated: "2026-08-17T00:00:00.000Z",
    };
    expect(latestAt(item)).toBe("2026-08-17T00:00:00.000Z");
    expect(readLatestItem(item)).toEqual({
      title: "Both",
      url: "https://example.com/both",
      at: "2026-08-17T00:00:00.000Z",
    });
  });

  it("falls back to leftover published_at when updated is missing", () => {
    const leftover: LatestReaderItem = {
      title: "Solo",
      url: "https://example.com/solo",
      published_at: "2026-08-16T11:00:00.000Z",
    };
    expect(latestAt(leftover)).toBe("2026-08-16T11:00:00.000Z");
    expect(readLatestItem(leftover).at).toBe("2026-08-16T11:00:00.000Z");
  });

  it("orders oldest-first leftover items by recency then slices to limit 1", () => {
    const sliced = sliceLatestItems([OLD, NEW], 1);
    expect(sliced).toEqual([
      { title: "New", url: "https://example.com/new", at: NEW.published_at },
    ]);
    expect(sliceLatestItems([OLD, NEW], 2).map((item) => item.title)).toEqual([
      "New",
      "Old",
    ]);
  });

  it("reads dump items without requiring extra fields and does not mutate the dump", () => {
    const dump = parseRssXml(loadFixture("atom.xml"));
    expect(dump.items).toHaveLength(8);
    const first = dump.items[0];
    expect(first).toEqual(
      expect.objectContaining({
        id: "https://example.com/atom/1",
        content: "<p>Atom content 1</p>",
        updated: "2026-08-16T11:00:00.000Z",
      }),
    );
    const sliced = sliceLatestItems(dump, 1);
    expect(sliced).toEqual([
      {
        title: "Atom Item 1",
        url: "https://example.com/atom/1",
        at: "2026-08-16T11:00:00.000Z",
      },
    ]);
    expect(sliced[0]).not.toHaveProperty("id");
    expect(sliced[0]).not.toHaveProperty("content");
    expect(dump.items).toHaveLength(8);
    expect(dump.items[0]).toBe(first);
  });

  it("slices RSS 2.0 dump items to limit without asking the client to drop fields", () => {
    const dump = parseRssXml(loadFixture("rss2.xml"));
    expect(dump.items).toHaveLength(8);
    expect(sliceLatestItems(dump, 1)[0]?.title).toBe("RSS Item 1");
    expect(sliceLatestItems(dump, 8)).toHaveLength(8);
    expect(dump.items).toHaveLength(8);
  });
});
