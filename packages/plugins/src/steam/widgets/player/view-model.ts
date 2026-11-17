import { steamPlayer } from "../select-dump.js";

export const NO_PLAYER = "No player";

export type PlayerViewModel = {
  empty: boolean;
  title: string;
  avatarUrl?: string;
  status?: string;
};

export function playerViewModel(payload: unknown): PlayerViewModel {
  const player = steamPlayer(payload);
  if (player == null) {
    return { empty: true, title: NO_PLAYER };
  }
  if (player.avatarUrl === "") {
    return player.status === undefined
      ? { empty: false, title: player.name }
      : { empty: false, title: player.name, status: player.status };
  }
  return player.status === undefined
    ? { empty: false, title: player.name, avatarUrl: player.avatarUrl }
    : {
        empty: false,
        title: player.name,
        avatarUrl: player.avatarUrl,
        status: player.status,
      };
}
