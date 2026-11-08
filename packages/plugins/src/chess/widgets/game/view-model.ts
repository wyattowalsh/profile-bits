import { gameFen, gameNames } from "../select-dump.js";

export const NO_GAME = "No game data";

export type GameViewModel = {
  empty: boolean;
  title: string;
  fen?: string;
};

export function gameViewModel(payload: unknown): GameViewModel {
  const fen = gameFen(payload);
  const names = gameNames(payload);
  if (fen === undefined && names === "") {
    return { empty: true, title: NO_GAME };
  }
  if (fen === undefined) {
    return { empty: false, title: names };
  }
  return { empty: false, title: names, fen };
}
