/**
 * Typed dump of already-fetched GitHub REST/GraphQL JSON: user, owner
 * repos, repo GET, language nodes, contributions calendar when capable.
 * Widgets select fields. Secrets never belong in the dump.
 */

export type GithubRestUser = {
  login: string;
  id: number;
  nodeId: string;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  name: string | null;
  bio: string | null;
  avatarUrl: string;
  createdAt: string;
};

export type GithubOwnerRepository = {
  id: number;
  nodeId: string;
  name: string;
  fullName: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
  stargazersCount: number;
  forksCount: number;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  topics: readonly string[];
};

export type GithubRepository = {
  fullName: string;
  name: string;
  description: string | null;
  htmlUrl: string;
  stargazersCount: number;
  forksCount: number;
  subscribersCount: number;
  openIssuesCount: number;
  language: string | null;
  license: string | null;
  ownerLogin: string;
  ownerAvatarUrl: string;
  topics: readonly string[];
};

export type GithubRestCrawlResult = {
  user: GithubRestUser;
  repositories: readonly GithubOwnerRepository[];
  /** Same ordered GraphQL `node_id` list for stars and language bytes. */
  repositoryIds: readonly string[];
};

export type GithubLanguageBytes = {
  name: string;
  bytes: number;
  color?: string | null;
  id?: string;
};

export type GithubLanguageAccumulator = {
  bytes: number;
  color?: string | null;
  id?: string;
};

export type GithubContributionDay = {
  date: string;
  contributionCount: number;
  weekday: number;
};

export type GithubContributionWeek = {
  contributionDays: readonly GithubContributionDay[];
};

export type GithubContributionCalendar = {
  totalContributions: number;
  weeks: readonly GithubContributionWeek[];
};

export type GithubPinnedItem = {
  kind: "repository" | "gist";
  name: string;
  nameWithOwner?: string;
  description: string | null;
  url: string;
  stargazerCount?: number;
  forkCount?: number;
  isPrivate?: boolean;
  primaryLanguage?: {
    name: string;
    color: string | null;
  };
};

export type GithubPublicEvent = {
  id: string;
  type: string;
  actorLogin: string;
  repoName: string;
  public: boolean;
  createdAt: string;
};

/** REST crawl plus GraphQL language bytes; calendar iff capable. */
export type GithubDumpPayload = GithubRestCrawlResult & {
  languages: readonly GithubLanguageBytes[];
  contributions?: number;
  calendar?: GithubContributionCalendar;
  repository?: GithubRepository;
  pinnedItems?: readonly GithubPinnedItem[];
  publicEvents?: readonly GithubPublicEvent[];
};

export function emptyGithubUser(login: string): GithubRestUser {
  return {
    login,
    id: 0,
    nodeId: "",
    followers: 0,
    following: 0,
    publicRepos: 0,
    publicGists: 0,
    name: null,
    bio: null,
    avatarUrl: "",
    createdAt: "",
  };
}

export function emptyGithubCrawl(login: string): GithubRestCrawlResult {
  return {
    user: emptyGithubUser(login),
    repositories: [],
    repositoryIds: [],
  };
}

export function parseGithubUser(value: unknown): GithubRestUser | null {
  const record = asRecord(value);
  if (
    record == null ||
    typeof record.login !== "string" ||
    record.login === ""
  ) {
    return null;
  }
  if (typeof record.id !== "number") {
    return null;
  }
  return {
    login: record.login,
    id: record.id,
    nodeId: stringField(record.node_id),
    followers: numberField(record.followers),
    following: numberField(record.following),
    publicRepos: numberField(record.public_repos),
    publicGists: numberField(record.public_gists),
    name: nullableString(record.name),
    bio: nullableString(record.bio),
    avatarUrl: stringField(record.avatar_url),
    createdAt: stringField(record.created_at),
  };
}

export function parseGithubRepository(value: unknown): GithubRepository | null {
  const record = asRecord(value);
  if (record == null) {
    return null;
  }
  const name = stringField(record.name);
  const fullName = stringField(record.full_name);
  if (name === "" && fullName === "") {
    return null;
  }
  const owner = asRecord(record.owner);
  return {
    fullName,
    name,
    description: nullableString(record.description),
    htmlUrl: stringField(record.html_url),
    stargazersCount: numberField(record.stargazers_count),
    forksCount: numberField(record.forks_count),
    subscribersCount: numberField(record.subscribers_count),
    openIssuesCount: numberField(record.open_issues_count),
    language: nullableString(record.language),
    license: licenseField(record.license),
    ownerLogin: owner == null ? "" : stringField(owner.login),
    ownerAvatarUrl: owner == null ? "" : stringField(owner.avatar_url),
    topics: topicsField(record.topics),
  };
}

export function parseGithubOwnerRepository(
  value: unknown,
): GithubOwnerRepository | null {
  const record = asRecord(value);
  if (record == null || typeof record.id !== "number") {
    return null;
  }
  if (typeof record.node_id !== "string" || record.node_id === "") {
    return null;
  }
  return {
    id: record.id,
    nodeId: record.node_id,
    name: stringField(record.name),
    fullName: stringField(record.full_name),
    fork: record.fork === true,
    archived: record.archived === true,
    private: record.private === true,
    stargazersCount: numberField(record.stargazers_count),
    forksCount: numberField(record.forks_count),
    htmlUrl: stringField(record.html_url),
    description: nullableString(record.description),
    language: nullableString(record.language),
    topics: topicsField(record.topics),
  };
}

export function mergeGithubLanguageBytes(
  totals: Map<string, GithubLanguageAccumulator>,
  body: unknown,
): void {
  const nodes = readGraphqlNodes(body);
  for (const node of nodes) {
    const languages = asRecord(node)?.languages;
    const edges = asRecord(languages)?.edges;
    if (!Array.isArray(edges)) {
      continue;
    }
    for (const edge of edges) {
      mergeLanguageEdge(totals, edge);
    }
  }
}

export function languageBytesFromTotals(
  totals: Map<string, GithubLanguageAccumulator>,
): GithubLanguageBytes[] {
  return [...totals.entries()]
    .map(([name, acc]) => languageRow(name, acc))
    .sort((a, b) => b.bytes - a.bytes);
}

export function parseGithubContributionCalendar(
  body: unknown,
): GithubContributionCalendar | undefined {
  const data = asRecord(asRecord(body)?.data);
  const user = asRecord(data?.user);
  const collection = asRecord(user?.contributionsCollection);
  const calendar = asRecord(collection?.contributionCalendar);
  const total = calendar?.totalContributions;
  if (typeof total !== "number" || !Number.isFinite(total)) {
    return undefined;
  }
  return {
    totalContributions: total,
    weeks: parseContributionWeeks(calendar?.weeks),
  };
}

function mergeLanguageEdge(
  totals: Map<string, GithubLanguageAccumulator>,
  edge: unknown,
): void {
  const record = asRecord(edge);
  if (record == null) {
    return;
  }
  const size = typeof record.size === "number" ? record.size : 0;
  const node = asRecord(record.node);
  const name = node?.name;
  if (typeof name !== "string" || name === "" || size <= 0) {
    return;
  }
  const prev = totals.get(name) ?? { bytes: 0 };
  prev.bytes += size;
  if (prev.color === undefined && node != null && "color" in node) {
    prev.color = typeof node.color === "string" ? node.color : null;
  }
  if (prev.id === undefined && typeof node?.id === "string" && node.id !== "") {
    prev.id = node.id;
  }
  totals.set(name, prev);
}

function languageRow(
  name: string,
  acc: GithubLanguageAccumulator,
): GithubLanguageBytes {
  const row: GithubLanguageBytes = { name, bytes: acc.bytes };
  if ("color" in acc) {
    row.color = acc.color;
  }
  if (acc.id !== undefined) {
    row.id = acc.id;
  }
  return row;
}

function parseContributionWeeks(value: unknown): GithubContributionWeek[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((week) => ({
    contributionDays: parseContributionDays(asRecord(week)?.contributionDays),
  }));
}

function parseContributionDays(value: unknown): GithubContributionDay[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const days: GithubContributionDay[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (record == null) {
      continue;
    }
    const date = stringField(record.date);
    const contributionCount = record.contributionCount;
    const weekday = record.weekday;
    if (
      date === "" ||
      typeof contributionCount !== "number" ||
      !Number.isFinite(contributionCount) ||
      typeof weekday !== "number" ||
      !Number.isFinite(weekday)
    ) {
      continue;
    }
    days.push({ date, contributionCount, weekday });
  }
  return days;
}

function readGraphqlNodes(body: unknown): readonly unknown[] {
  const data = asRecord(asRecord(body)?.data);
  const nodes = data?.nodes;
  return Array.isArray(nodes) ? nodes : [];
}

function topicsField(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string => typeof item === "string" && item !== "",
  );
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

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function licenseField(value: unknown): string | null {
  const record = asRecord(value);
  if (record == null) {
    return null;
  }
  if (typeof record.spdx_id === "string" && record.spdx_id !== "") {
    return record.spdx_id;
  }
  if (typeof record.name === "string" && record.name !== "") {
    return record.name;
  }
  return null;
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
