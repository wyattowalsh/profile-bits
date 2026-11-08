import type { StatsIncludeToken, StatsOptions } from "@profile-bits/core";
import {
  asDumpRecord,
  dumpContributions,
  dumpRepositories,
  dumpUser,
  numberOrUndef,
  stringField,
} from "../select-dump.js";
import type { StatsChip } from "./widget.js";

const LABELS: Record<StatsIncludeToken, string> = {
  followers: "Followers",
  following: "Following",
  repos: "Repos",
  stars: "Stars",
  forks: "Forks",
  gists: "Gists",
  contributions: "Contributions",
};

export function statsViewModel(
  payload: unknown,
  options: Partial<StatsOptions> = {},
  canContributions = false,
): {
  login: string;
  avatarUrl?: string;
  chips: StatsChip[];
} {
  const include = options.include ?? ["followers", "repos", "stars"];
  const record = asDumpRecord(payload);
  const user = dumpUser(payload);
  const stats = asDumpRecord(record?.stats);
  const login =
    stringField(user?.login) || stringField(record?.login) || "octocat";
  const avatarUrl =
    options.avatar === false
      ? undefined
      : stringField(user?.avatarUrl) || stringField(user?.avatar_url);
  const values = valuesFromPayload(payload, stats, user);
  const chips: StatsChip[] = [];
  for (const token of include) {
    if (
      token === "contributions" &&
      !canContributions &&
      values.contributions == null
    ) {
      continue;
    }
    const value = values[token];
    if (value === undefined) {
      continue;
    }
    chips.push({ label: LABELS[token], value: formatCount(value) });
  }
  return avatarUrl !== undefined && avatarUrl !== ""
    ? { login, avatarUrl, chips }
    : { login, chips };
}

function valuesFromPayload(
  payload: unknown,
  stats: Record<string, unknown> | null,
  user: Record<string, unknown> | null,
): Partial<Record<StatsIncludeToken, number>> {
  const repos = dumpRepositories(payload);
  const stars = repos.reduce(
    (sum, repo) => sum + numberField(repo.stargazersCount),
    0,
  );
  const forks = repos.reduce(
    (sum, repo) => sum + numberField(repo.forksCount),
    0,
  );
  const values: Partial<Record<StatsIncludeToken, number>> = {};
  assignToken(
    values,
    "followers",
    numberOrUndef(stats?.followers) ?? numberOrUndef(user?.followers),
  );
  assignToken(
    values,
    "following",
    numberOrUndef(stats?.following) ?? numberOrUndef(user?.following),
  );
  assignToken(
    values,
    "repos",
    numberOrUndef(stats?.repos) ??
      numberOrUndef(user?.publicRepos) ??
      (repos.length > 0 ? repos.length : undefined),
  );
  assignToken(
    values,
    "stars",
    numberOrUndef(stats?.stars) ?? (repos.length > 0 ? stars : undefined),
  );
  assignToken(
    values,
    "forks",
    numberOrUndef(stats?.forks) ?? (repos.length > 0 ? forks : undefined),
  );
  assignToken(
    values,
    "gists",
    numberOrUndef(stats?.gists) ?? numberOrUndef(user?.publicGists),
  );
  assignToken(
    values,
    "contributions",
    dumpContributions(payload) ?? numberOrUndef(stats?.contributions),
  );
  return values;
}

function assignToken(
  values: Partial<Record<StatsIncludeToken, number>>,
  token: StatsIncludeToken,
  value: number | undefined,
): void {
  if (value !== undefined) {
    values[token] = value;
  }
}

function formatCount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return String(value);
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
