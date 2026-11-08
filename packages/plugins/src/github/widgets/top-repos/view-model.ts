import {
  TOP_REPOS_LIMIT_DEFAULT,
  type TopReposOptions,
} from "@profile-bits/core";
import {
  dumpRepositories,
  numberOrUndef,
  stringField,
} from "../select-dump.js";
import type { TopReposItem } from "./widget.js";

export type TopReposViewModel = {
  items: TopReposItem[];
  empty: boolean;
};

type RankedRepo = {
  title: string;
  stars: number;
  forks: number;
};

export function topReposViewModel(
  payload: unknown,
  options: Partial<TopReposOptions> = {},
): TopReposViewModel {
  const limit = options.limit ?? TOP_REPOS_LIMIT_DEFAULT;
  const ranked = dumpRepositories(payload)
    .map(toRanked)
    .filter((row): row is RankedRepo => row != null)
    .toSorted(compareRepos)
    .slice(0, limit);

  if (ranked.length === 0) {
    return { items: [], empty: true };
  }
  return {
    items: ranked.map((row) => ({
      title: row.title,
      meta: `${formatCount(row.stars)} stars`,
    })),
    empty: false,
  };
}

function toRanked(repo: Record<string, unknown>): RankedRepo | null {
  const name = stringField(repo.name);
  const fullName = stringField(repo.fullName) || stringField(repo.full_name);
  const title = name || fullName;
  if (title === "") {
    return null;
  }
  return {
    title,
    stars: firstNumber(repo, ["stargazersCount", "stargazers_count", "stars"]),
    forks: firstNumber(repo, ["forksCount", "forks_count", "forks"]),
  };
}

function compareRepos(a: RankedRepo, b: RankedRepo): number {
  if (b.stars !== a.stars) {
    return b.stars - a.stars;
  }
  if (b.forks !== a.forks) {
    return b.forks - a.forks;
  }
  return a.title.localeCompare(b.title);
}

function firstNumber(
  record: Record<string, unknown>,
  keys: readonly string[],
): number {
  for (const key of keys) {
    const value = numberOrUndef(record[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return 0;
}

function formatCount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return String(value);
}
