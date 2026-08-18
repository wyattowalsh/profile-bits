/**
 * Authenticated REST crawl: GET /users/{login} plus paginated owner repos.
 * Filter forks/archived first, then cap 500. Never unauth. Never REST
 * /languages. Identity probe (GET /user) is T111e — not this module.
 */

import {
  decideIncludePrivate,
  isMissingToken,
  type SkipFailOutcome,
} from "@profile-bits/core";
import type { GithubRequestCache } from "./cache.js";
import { classifyGithubRateLimit } from "./rate-limit.js";

export const GITHUB_API_ORIGIN = "https://api.github.com";
export const GITHUB_API_VERSION = "2022-11-28";
export const GITHUB_REST_PER_PAGE = 100;
export const GITHUB_REST_REPO_CAP = 500;
export const GITHUB_REST_DEPENDENT_WIDGETS = ["stats", "languages"] as const;

export type GithubRestDependentWidget =
  (typeof GITHUB_REST_DEPENDENT_WIDGETS)[number];

export type GithubRestFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export type GithubRestUser = {
  login: string;
  id: number;
  nodeId: string;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
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
};

export type GithubRestCrawlResult = {
  user: GithubRestUser;
  repositories: readonly GithubOwnerRepository[];
  /** Same ordered GraphQL `node_id` list for stars and language bytes. */
  repositoryIds: readonly string[];
};

export type GithubRestCrawlInput = {
  login: string;
  token: string | undefined | null;
  cache: GithubRequestCache;
  includePrivate?: boolean;
  canPrivate?: boolean;
  includeForks?: boolean;
  includeArchived?: boolean;
  fetchImpl?: GithubRestFetch;
};

export class GithubRestError extends Error {
  override readonly name = "GithubRestError";
  readonly outcome: SkipFailOutcome;
  readonly status?: number;
  readonly widgets: readonly GithubRestDependentWidget[];

  constructor(
    outcome: SkipFailOutcome,
    message: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(
      message,
      options?.cause === undefined ? undefined : { cause: options.cause },
    );
    this.outcome = outcome;
    this.status = options?.status;
    this.widgets = GITHUB_REST_DEPENDENT_WIDGETS;
  }
}

/**
 * Coalesce user + owner-repo pages through the run-scoped REST cache.
 * Stars and languages share the returned ordered id list.
 */
export async function crawlGithubRest(
  input: GithubRestCrawlInput,
): Promise<GithubRestCrawlResult> {
  const rawToken = input.token ?? "";
  if (isMissingToken(rawToken)) {
    throw new GithubRestError(
      "fail_job",
      "github_token is missing; refusing unauthenticated GitHub REST",
    );
  }

  const includePrivate = input.includePrivate === true;
  const canPrivate = input.canPrivate === true;
  const includeForks = input.includeForks === true;
  const includeArchived = input.includeArchived === true;
  const token = rawToken.trim();
  const fetchImpl = input.fetchImpl ?? fetch;

  if (decideIncludePrivate({ includePrivate, canPrivate }) === "fail_widget") {
    throw new GithubRestError(
      "fail_widget",
      "include_private requires canPrivate; refusing a silent public crawl",
    );
  }

  const user = parseUser(
    await cachedGithubGet({
      cache: input.cache,
      url: userUrl(input.login),
      params: {},
      token,
      fetchImpl,
    }),
  );
  if (user == null) {
    throw new GithubRestError("fail_run", "GitHub user response was invalid", {
      status: 200,
    });
  }

  const repositories = await listOwnerRepositories({
    login: input.login,
    token,
    cache: input.cache,
    fetchImpl,
    includePrivate,
    canPrivate,
    includeForks,
    includeArchived,
  });

  return {
    user,
    repositories,
    repositoryIds: repositories.map((repo) => repo.nodeId),
  };
}

async function listOwnerRepositories(input: {
  login: string;
  token: string;
  cache: GithubRequestCache;
  fetchImpl: GithubRestFetch;
  includePrivate: boolean;
  canPrivate: boolean;
  includeForks: boolean;
  includeArchived: boolean;
}): Promise<GithubOwnerRepository[]> {
  const collected: GithubOwnerRepository[] = [];
  const reposUrl = ownerReposUrl(
    input.login,
    input.includePrivate && input.canPrivate,
  );

  for (let page = 1; ; page += 1) {
    const body = await cachedGithubGet({
      cache: input.cache,
      url: reposUrl,
      params: {
        type: "owner",
        per_page: String(GITHUB_REST_PER_PAGE),
        page: String(page),
      },
      token: input.token,
      fetchImpl: input.fetchImpl,
    });
    if (!Array.isArray(body)) {
      throw new GithubRestError(
        "fail_run",
        `GitHub owner repos page ${page} was not an array`,
        { status: 200 },
      );
    }

    for (const entry of body) {
      const repo = parseRepo(entry);
      if (repo == null || !keepRepo(repo, input)) {
        continue;
      }
      collected.push(repo);
      if (collected.length >= GITHUB_REST_REPO_CAP) {
        return collected.slice(0, GITHUB_REST_REPO_CAP);
      }
    }

    if (body.length < GITHUB_REST_PER_PAGE) {
      return collected;
    }
  }
}

function keepRepo(
  repo: GithubOwnerRepository,
  options: {
    includePrivate: boolean;
    canPrivate: boolean;
    includeForks: boolean;
    includeArchived: boolean;
  },
): boolean {
  if (repo.private && !(options.includePrivate && options.canPrivate)) {
    return false;
  }
  if (repo.fork && !options.includeForks) {
    return false;
  }
  if (repo.archived && !options.includeArchived) {
    return false;
  }
  return true;
}

async function cachedGithubGet(input: {
  cache: GithubRequestCache;
  url: string;
  params: Readonly<Record<string, string>>;
  token: string;
  fetchImpl: GithubRestFetch;
}): Promise<unknown> {
  assertNotLanguagesUrl(input.url);
  return input.cache.rest(
    { method: "GET", url: input.url, params: input.params },
    () => githubGetUncached(input),
  );
}

async function githubGetUncached(input: {
  url: string;
  params: Readonly<Record<string, string>>;
  token: string;
  fetchImpl: GithubRestFetch;
}): Promise<unknown> {
  assertNotLanguagesUrl(input.url);
  const url = withSearchParams(input.url, input.params);
  let response: Response;
  try {
    response = await input.fetchImpl(url, {
      method: "GET",
      redirect: "error",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${input.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "profile-bits",
      },
    });
  } catch (error) {
    if (error instanceof GithubRestError) {
      throw error;
    }
    throw new GithubRestError(
      "fail_run",
      "GitHub REST request failed before a response",
      { cause: error },
    );
  }

  const body = await readJson(response);
  const outcome = classifyGithubRateLimit({
    status: response.status,
    body,
    headers: headersRecord(response.headers),
  });
  if (outcome !== "render") {
    throw new GithubRestError(
      outcome,
      `GitHub REST ${response.status} for ${url.pathname}`,
      { status: response.status },
    );
  }
  return body;
}

function userUrl(login: string): string {
  return `${GITHUB_API_ORIGIN}/users/${encodeURIComponent(login)}`;
}

function ownerReposUrl(login: string, privateCapable: boolean): string {
  if (privateCapable) {
    return `${GITHUB_API_ORIGIN}/user/repos`;
  }
  return `${GITHUB_API_ORIGIN}/users/${encodeURIComponent(login)}/repos`;
}

function withSearchParams(
  url: string,
  params: Readonly<Record<string, string>>,
): URL {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value);
  }
  return target;
}

function assertNotLanguagesUrl(url: string): void {
  if (url.includes("/languages")) {
    throw new GithubRestError(
      "fail_run",
      "REST /languages is forbidden; use GraphQL nodes(ids:)",
    );
  }
}

function parseUser(value: unknown): GithubRestUser | null {
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
  };
}

function parseRepo(value: unknown): GithubOwnerRepository | null {
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
  };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === "") {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function headersRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
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

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
