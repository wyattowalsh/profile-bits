import {
  type SolvedMeter,
  type SolvedRow,
  solvedMeters,
  solvedRows,
  solvedSplit,
} from "../select-dump.js";

export const NO_SOLVED = "No solved data";

export type SolvedViewModel = {
  empty: boolean;
  title: string;
  rows: readonly SolvedRow[];
  meters: readonly SolvedMeter[];
  split: readonly SolvedRow[];
};

export function solvedViewModel(payload: unknown): SolvedViewModel {
  const rows = solvedRows(payload);
  if (rows.length === 0) {
    return { empty: true, title: NO_SOLVED, rows: [], meters: [], split: [] };
  }
  return {
    empty: false,
    title: "",
    rows,
    meters: solvedMeters(payload),
    split: solvedSplit(payload),
  };
}
