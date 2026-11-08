/**
 * Spotify widgets select from the cached dump. Extra keys MUST NOT fail.
 * Widgets MUST NOT perform HTTP. limit stays in the view-model.
 */

export type DumpTrack = {
  title: string;
  artists: string;
  album: string;
  coverUrl: string;
};

export function asDumpRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function dumpCurrentlyPlaying(payload: unknown): unknown {
  return asDumpRecord(payload)?.currently_playing;
}

export function dumpRecentlyPlayedItems(payload: unknown): readonly unknown[] {
  const recent = asDumpRecord(asDumpRecord(payload)?.recently_played);
  const items = recent?.items;
  return Array.isArray(items) ? items : [];
}

export function dumpTopTrackItems(payload: unknown): readonly unknown[] {
  const top = asDumpRecord(asDumpRecord(payload)?.top_tracks);
  const items = top?.items;
  return Array.isArray(items) ? items : [];
}

export function readTrack(value: unknown): DumpTrack | null {
  const record = asDumpRecord(value);
  if (record == null) {
    return null;
  }
  const nested = asDumpRecord(record.track) ?? asDumpRecord(record.item);
  const track = nested ?? record;
  const title = stringField(track.name);
  if (title === "") {
    return null;
  }
  const album = asDumpRecord(track.album);
  return {
    title,
    artists: artistNames(track.artists),
    album: stringField(album?.name),
    coverUrl: albumArtUrl(album),
  };
}

export function albumArtUrl(album: Record<string, unknown> | null): string {
  if (album == null) {
    return "";
  }
  const images = album.images;
  if (!Array.isArray(images) || images.length === 0) {
    return stringField(album.image);
  }
  const first = asDumpRecord(images[0]);
  return stringField(first?.url);
}

export function artistNames(value: unknown): string {
  if (!Array.isArray(value)) {
    return stringField(value);
  }
  return value
    .map((entry) => stringField(asDumpRecord(entry)?.name))
    .filter((name) => name.length > 0)
    .join(", ");
}

/**
 * Widget-side slice. The dump's `top_tracks.items` stay intact.
 */
export function topTracks(payload: unknown, limit: number): DumpTrack[] {
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
  const tracks: DumpTrack[] = [];
  for (const item of dumpTopTrackItems(payload)) {
    if (tracks.length >= cap) {
      break;
    }
    const track = readTrack(item);
    if (track != null) {
      tracks.push(track);
    }
  }
  return tracks;
}

export function nowPlayingTrack(payload: unknown): DumpTrack | null {
  const current = dumpCurrentlyPlaying(payload);
  if (current != null) {
    const fromCurrent = readTrack(current);
    if (fromCurrent != null) {
      return fromCurrent;
    }
  }
  for (const item of dumpRecentlyPlayedItems(payload)) {
    const track = readTrack(item);
    if (track != null) {
      return track;
    }
  }
  return null;
}
