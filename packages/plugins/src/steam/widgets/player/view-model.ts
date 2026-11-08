import { steamPlayer } from "../select-dump.js";

export const NO_PLAYER = "No player";

export type PlayerViewModel = {
  empty: boolean;
  title: string;
  avatarUrl?: string;
};

export function playerViewModel(payload: unknown): PlayerViewModel {
  const player = steamPlayer(payload);
  if (player == null) {
    return { empty: true, title: NO_PLAYER };
  }
  if (player.avatarUrl === "") {
    return { empty: false, title: player.name };
  }
  return { empty: false, title: player.name, avatarUrl: player.avatarUrl };
}
