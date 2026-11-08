import { type SolvedRow, solvedRows } from "../select-dump.js";

export const NO_SOLVED = "No solved data";

export type SolvedViewModel = {
  empty: boolean;
  title: string;
  rows: readonly SolvedRow[];
};

export function solvedViewModel(payload: unknown): SolvedViewModel {
  const rows = solvedRows(payload);
  if (rows.length === 0) {
    return { empty: true, title: NO_SOLVED, rows: [] };
  }
  return { empty: false, title: "", rows };
}
