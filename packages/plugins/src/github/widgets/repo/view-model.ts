import type { RepoIncludeToken, RepoOptions } from "@profile-bits/core";
import type { RepoChip } from "./widget.js";

const LABELS: Record<RepoIncludeToken, string> = {
  stars: "Stars",
  forks: "Forks",
  watchers: "Watchers",
  issues: "Issues",
  license: "License",
  language: "Language",
};

export type RepoViewModel = {
  fullName: string;
  avatarUrl?: string;
  chips: RepoChip[];
  empty: boolean;
};

export function repoViewModel(
  payload: unknown,
  options: Partial<RepoOptions> = {},
): RepoViewModel {
  const include = options.include ?? ["stars", "forks", "issues", "license"];
  const record = asRecord(payload);
  const repository = asRecord(record?.repository);
  if (repository == null) {
    return { fullName: "", chips: [], empty: true };
  }
  const fullName =
    stringField(repository.fullName) || stringField(repository.full_name);
  if (fullName === "") {
    return { fullName: "", chips: [], empty: true };
  }
  const avatarUrl =
    options.avatar === false ? undefined : avatarFromRepository(repository);
  const chips: RepoChip[] = [];
  for (const token of include) {
    const value = valueForToken(token, repository);
    if (value === undefined) {
      continue;
    }
    chips.push({ label: LABELS[token], value });
  }
  return avatarUrl !== undefined && avatarUrl !== ""
    ? { fullName, avatarUrl, chips, empty: false }
    : { fullName, chips, empty: false };
}

function valueForToken(
  token: RepoIncludeToken,
  repository: Record<string, unknown>,
): string | undefined {
  switch (token) {
    case "stars":
      return formatPresentCount(
        firstNumber(repository, [
          "stargazersCount",
          "stargazers_count",
          "stars",
        ]),
      );
    case "forks":
      return formatPresentCount(
        firstNumber(repository, ["forksCount", "forks_count", "forks"]),
      );
    case "watchers":
      return formatPresentCount(
        firstNumber(repository, [
          "watchersCount",
          "watchers_count",
          "subscribersCount",
          "subscribers_count",
          "watchers",
        ]),
      );
    case "issues":
      return formatPresentCount(
        firstNumber(repository, [
          "openIssuesCount",
          "open_issues_count",
          "openIssues",
          "open_issues",
          "issues",
        ]),
      );
    case "license":
      return stringOrUndef(repository.license);
    case "language":
      return stringOrUndef(repository.language);
  }
}

function avatarFromRepository(
  repository: Record<string, unknown>,
): string | undefined {
  const owner = asRecord(repository.owner);
  const src =
    stringField(repository.avatarUrl) ||
    stringField(repository.avatar_url) ||
    stringField(repository.ownerAvatarUrl) ||
    stringField(repository.owner_avatar_url) ||
    stringField(owner?.avatarUrl) ||
    stringField(owner?.avatar_url);
  return src === "" ? undefined : src;
}

function formatPresentCount(value: number | undefined): string | undefined {
  return value === undefined ? undefined : formatCount(value);
}

function formatCount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return String(value);
}

function firstNumber(
  record: Record<string, unknown>,
  keys: readonly string[],
): number | undefined {
  for (const key of keys) {
    const value = numberOrUndef(record[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringOrUndef(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function numberOrUndef(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
