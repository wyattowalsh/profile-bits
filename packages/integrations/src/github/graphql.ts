/**
 * GraphQL languages via nodes(ids:) batches of 100.
 * Separate contributionsCollection iff canContributions.
 * Never REST /languages. Never unauthenticated.
 */

import { isMissingToken, type SkipFailOutcome } from "@profile-bits/core";
import type { GithubRequestCache } from "./cache.js";
import {
  type GithubContributionCalendar,
  type GithubLanguageAccumulator,
  type GithubLanguageBytes,
  languageBytesFromTotals,
  mergeGithubLanguageBytes,
  parseGithubContributionCalendar,
} from "./payload.js";
import { classifyGraphqlResponse, type RateLimitLogger } from "./rate-limit.js";
import {
  GITHUB_API_ORIGIN,
  GITHUB_API_VERSION,
  GithubRestError,
  type GithubRestFetch,
} from "./rest.js";

export type { GithubContributionCalendar, GithubLanguageBytes };

export const GITHUB_GRAPHQL_URL = `${GITHUB_API_ORIGIN}/graphql`;
export const GITHUB_GRAPHQL_NODE_BATCH = 100;

export const LANGUAGES_NODES_QUERY = `query Languages($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Repository {
      id
      languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
        edges { size node { name color id } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
  rateLimit { cost remaining }
}`;

export const CONTRIBUTIONS_QUERY = `query Contributions($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date contributionCount weekday }
        }
      }
    }
  }
  rateLimit { cost remaining }
}`;

export type GithubGraphqlFetch = GithubRestFetch;

export class GithubGraphqlError extends Error {
  override readonly name = "GithubGraphqlError";
  readonly outcome: SkipFailOutcome;
  readonly status?: number;

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
  }
}

export async function fetchRepositoryLanguages(input: {
  repositoryIds: readonly string[];
  token: string | undefined | null;
  cache: GithubRequestCache;
  fetchImpl?: GithubGraphqlFetch;
  logger?: RateLimitLogger;
}): Promise<readonly GithubLanguageBytes[]> {
  assertToken(input.token);
  if (input.repositoryIds.length === 0) {
    return [];
  }
  const token = input.token.trim();
  const fetchImpl = input.fetchImpl ?? fetch;
  const totals = new Map<string, GithubLanguageAccumulator>();

  for (
    let i = 0;
    i < input.repositoryIds.length;
    i += GITHUB_GRAPHQL_NODE_BATCH
  ) {
    const ids = input.repositoryIds.slice(i, i + GITHUB_GRAPHQL_NODE_BATCH);
    const body = await graphqlPost({
      cache: input.cache,
      token,
      fetchImpl,
      query: LANGUAGES_NODES_QUERY,
      variables: { ids },
      operation: "languages",
      logger: input.logger,
    });
    mergeGithubLanguageBytes(totals, body);
  }

  return languageBytesFromTotals(totals);
}

export async function fetchContributionCalendar(input: {
  login: string;
  token: string | undefined | null;
  cache: GithubRequestCache;
  canContributions: boolean;
  fetchImpl?: GithubGraphqlFetch;
  logger?: RateLimitLogger;
}): Promise<GithubContributionCalendar | undefined> {
  if (!input.canContributions) {
    return undefined;
  }
  assertToken(input.token);
  const body = await graphqlPost({
    cache: input.cache,
    token: input.token.trim(),
    fetchImpl: input.fetchImpl ?? fetch,
    query: CONTRIBUTIONS_QUERY,
    variables: { login: input.login },
    operation: "contributions",
    logger: input.logger,
  });
  return parseGithubContributionCalendar(body);
}

export async function fetchContributionTotal(input: {
  login: string;
  token: string | undefined | null;
  cache: GithubRequestCache;
  canContributions: boolean;
  fetchImpl?: GithubGraphqlFetch;
  logger?: RateLimitLogger;
}): Promise<number | undefined> {
  const calendar = await fetchContributionCalendar(input);
  return calendar?.totalContributions;
}

function assertToken(
  token: string | undefined | null,
): asserts token is string {
  if (isMissingToken(token)) {
    throw new GithubGraphqlError(
      "fail_job",
      "github_token is missing; refusing unauthenticated GitHub GraphQL",
    );
  }
}

async function graphqlPost(input: {
  cache: GithubRequestCache;
  token: string;
  fetchImpl: GithubGraphqlFetch;
  query: string;
  variables: unknown;
  operation: string;
  logger?: RateLimitLogger;
}): Promise<unknown> {
  return input.cache.graphql(
    { query: input.query, variables: input.variables },
    () => graphqlUncached(input),
  );
}

async function graphqlUncached(input: {
  token: string;
  fetchImpl: GithubGraphqlFetch;
  query: string;
  variables: unknown;
  operation: string;
  logger?: RateLimitLogger;
}): Promise<unknown> {
  const url = new URL(GITHUB_GRAPHQL_URL);
  let response: Response;
  try {
    response = await input.fetchImpl(url, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${input.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "profile-bits",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: input.query,
        variables: input.variables,
      }),
    });
  } catch (error) {
    if (
      error instanceof GithubGraphqlError ||
      error instanceof GithubRestError
    ) {
      throw error;
    }
    throw new GithubGraphqlError(
      "fail_run",
      "GitHub GraphQL request failed before a response",
      { cause: error },
    );
  }

  const body = await readJson(response);
  const remaining = readRemaining(body);
  const outcome = classifyGraphqlResponse({
    status: response.status,
    body,
    graphqlErrors: readGraphqlErrors(body),
    remaining,
    operation: input.operation,
    logger: input.logger,
  });
  if (outcome !== "render") {
    throw new GithubGraphqlError(
      outcome,
      `GitHub GraphQL ${response.status} (${input.operation})`,
      { status: response.status },
    );
  }
  return body;
}

function readGraphqlErrors(body: unknown): readonly unknown[] | null {
  const errors = asRecord(body)?.errors;
  return Array.isArray(errors) ? errors : null;
}

function readRemaining(body: unknown): number | null {
  const rate =
    asRecord(body)?.rateLimit ?? asRecord(asRecord(body)?.data)?.rateLimit;
  const remaining = asRecord(rate)?.remaining;
  return typeof remaining === "number" ? remaining : null;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
