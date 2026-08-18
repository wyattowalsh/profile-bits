import type { StatsIncludeToken, StatsOptions } from "@profile-bits/core";
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
  const record = asRecord(payload);
  const user = asRecord(record?.user) ?? record;
  const stats = asRecord(record?.stats);
  const login =
    stringField(user?.login) || stringField(record?.login) || "octocat";
  const avatarUrl =
    options.avatar === false
      ? undefined
      : stringField(user?.avatarUrl) || stringField(user?.avatar_url);
  const values = valuesFromPayload(record, stats, user);
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
  record: Record<string, unknown> | null,
  stats: Record<string, unknown> | null,
  user: Record<string, unknown> | null,
): Partial<Record<StatsIncludeToken, number>> {
  const repos = asArray(record?.repositories);
  const stars = repos.reduce(
    (sum, repo) => sum + numberField(asRecord(repo)?.stargazersCount),
    0,
  );
  const forks = repos.reduce(
    (sum, repo) => sum + numberField(asRecord(repo)?.forksCount),
    0,
  );
  return {
    followers:
      numberOrUndef(stats?.followers) ?? numberOrUndef(user?.followers),
    following:
      numberOrUndef(stats?.following) ?? numberOrUndef(user?.following),
    repos:
      numberOrUndef(stats?.repos) ??
      numberOrUndef(user?.publicRepos) ??
      (repos.length > 0 ? repos.length : undefined),
    stars:
      numberOrUndef(stats?.stars) ?? (repos.length > 0 ? stars : undefined),
    forks:
      numberOrUndef(stats?.forks) ?? (repos.length > 0 ? forks : undefined),
    gists: numberOrUndef(stats?.gists) ?? numberOrUndef(user?.publicGists),
    contributions:
      numberOrUndef(record?.contributions) ??
      numberOrUndef(stats?.contributions),
  };
}

function formatCount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return String(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function numberOrUndef(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
