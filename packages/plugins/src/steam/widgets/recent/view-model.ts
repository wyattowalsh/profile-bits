import { RECENT_LIMIT_DEFAULT, type RecentOptions } from "@profile-bits/core";
import { recentGames, type SteamGame } from "../select-dump.js";

export const NO_RECENT = "No recent games";

export type RecentViewModel = {
  empty: boolean;
  title: string;
  games: readonly SteamGame[];
};

export function recentViewModel(
  payload: unknown,
  options: Partial<RecentOptions> = {},
): RecentViewModel {
  const limit = options.limit ?? RECENT_LIMIT_DEFAULT;
  const games = recentGames(payload, limit);
  if (games.length === 0) {
    return { empty: true, title: NO_RECENT, games: [] };
  }
  return { empty: false, title: "", games };
}
