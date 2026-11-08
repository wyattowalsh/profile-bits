import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Disk fixtures of already-fetched Spotify JSON. Never network. */
export const SPOTIFY_FIXTURE_NAMES = [
  "currently-playing.json",
  "recently-played.json",
  "top-tracks.json",
] as const;

export type SpotifyFixtureName = (typeof SPOTIFY_FIXTURE_NAMES)[number];

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const NAME_SET = new Set<string>(SPOTIFY_FIXTURE_NAMES);

export function spotifyFixturePath(name: SpotifyFixtureName): string {
  return join(fixturesDir, name);
}

export function loadFixture(name: SpotifyFixtureName): unknown {
  if (!NAME_SET.has(name)) {
    throw new Error(`unknown spotify fixture: ${String(name)}`);
  }
  const path = spotifyFixturePath(name);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to load spotify fixture ${name}: ${detail}`);
  }
}

export function loadSpotifyDumpFixture(): {
  currently_playing: unknown;
  recently_played: unknown;
  top_tracks: unknown;
} {
  return {
    currently_playing: loadFixture("currently-playing.json"),
    recently_played: loadFixture("recently-played.json"),
    top_tracks: loadFixture("top-tracks.json"),
  };
}
