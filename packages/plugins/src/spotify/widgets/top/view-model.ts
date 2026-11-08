import { TOP_LIMIT_DEFAULT, type TopOptions } from "@profile-bits/core";
import { type DumpTrack, topTracks } from "../select-dump.js";

export const NO_TOP_TRACKS = "No top tracks";

export type TopViewModel = {
  empty: boolean;
  title: string;
  tracks: readonly DumpTrack[];
};

export function topViewModel(
  payload: unknown,
  options: Partial<TopOptions> = {},
): TopViewModel {
  const limit = options.limit ?? TOP_LIMIT_DEFAULT;
  const tracks = topTracks(payload, limit);
  if (tracks.length === 0) {
    return { empty: true, title: NO_TOP_TRACKS, tracks: [] };
  }
  return { empty: false, title: "", tracks };
}
