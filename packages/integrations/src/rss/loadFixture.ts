import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const RSS_FIXTURE_NAMES = [
  "atom.xml",
  "rss2.xml",
  "empty.xml",
  "malformed.xml",
  "xxe.xml",
] as const;

export type RssFixtureName = (typeof RSS_FIXTURE_NAMES)[number];

export function rssFixturePath(name: RssFixtureName): string {
  return join(dirname(fileURLToPath(import.meta.url)), "fixtures", name);
}

export function loadFixture(name: RssFixtureName): string {
  return readFileSync(rssFixturePath(name), "utf8");
}
