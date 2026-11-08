import { nowPlayingTrack } from "../select-dump.js";

export const NO_NOW_PLAYING = "No now playing";

export type NowPlayingViewModel = {
  empty: boolean;
  title: string;
  artists: string;
  album: string;
  coverUrl?: string;
};

export function nowPlayingViewModel(payload: unknown): NowPlayingViewModel {
  const track = nowPlayingTrack(payload);
  if (track == null) {
    return { empty: true, title: NO_NOW_PLAYING, artists: "", album: "" };
  }
  return {
    empty: false,
    title: track.title,
    artists: track.artists,
    album: track.album,
    ...(track.coverUrl !== "" ? { coverUrl: track.coverUrl } : {}),
  };
}
