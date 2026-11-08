import { type RatingChip, ratingChips } from "../select-dump.js";

export const NO_RATINGS = "No ratings data";

export type RatingsViewModel = {
  empty: boolean;
  title: string;
  chips: readonly RatingChip[];
};

export function ratingsViewModel(payload: unknown): RatingsViewModel {
  const chips = ratingChips(payload);
  if (chips.length === 0) {
    return { empty: true, title: NO_RATINGS, chips: [] };
  }
  return { empty: false, title: "", chips };
}
