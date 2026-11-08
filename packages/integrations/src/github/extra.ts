/**
 * Optional extra authenticated GitHub endpoints: pinned items (GraphQL)
 * and public events (REST). Probe stays capability-only. Missing scopes
 * or capability omit fields and MUST NOT invent `0`. Empty token
 * `fail_job`. Never REST `/languages`. Never unauthenticated.
 */

import { isMissingToken } from "@profile-bits/core";
import type { GithubRequestCache } from "./cache.js";
import { GITHUB_GRAPHQL_URL, GithubGraphqlError } from "./graphql.js";
import type { GithubPinnedItem, GithubPublicEvent } from "./payload.js";
import { logGraphqlRateLimitCost, type RateLimitLogger } from "./rate-limit.js";
import {
  GITHUB_API_ORIGIN,
  GITHUB_API_VERSION,
  GithubRestError,
  type GithubRestFetch,
} from "./rest.js";

export type GithubExtraDump = {
  pinnedItems?: readonly GithubPinnedItem[];
  publicEvents?: readonly GithubPublicEvent[];
};

export type GithubExtraFetchInput = {
  login: string;
  token: string | undefined | null;
  cache: GithubRequestCache;
  fetchImpl?: GithubRestFetch;
  logger?: RateLimitLogger;
};

export const GITHUB_PUBLIC_EVENTS_PER_PAGE = 30;

export const PINNED_ITEMS_QUERY = `query PinnedItems($login: String!) {
  user(login: $login) {
    pinnedItems(first: 6, types: [REPOSITORY, GIST]) {
      nodes {
        __typename
        ... on Repository {
          name
          nameWithOwner
          description
          url
          stargazerCount
          forkCount
          isPrivate
          primaryLanguage { name color }
        }
        ... on Gist {
          name
          description
          url
        }
      }
    }
  }
  rateLimit { cost remaining }
}`;

/**
 * Fetch pinned items + public events. Failures other than empty-token
 * `fail_job` omit that field. Probe identity is not the dump source.
 */
export async function fetchGithubExtraEndpoints(
  input: GithubExtraFetchInput,
): Promise<GithubExtraDump> {
  assertToken(input.token);
  const login = input.login.trim();
  if (login === "") {
    return {};
  }
  const [pinnedItems, publicEvents] = await Promise.all([
    fetchGithubPinnedItems(input),
    fetchGithubPublicEvents(input),
  ]);
  return {
    ...(pinnedItems === undefined ? {} : { pinnedItems }),
    ...(publicEvents === undefined ? {} : { publicEvents }),
  };
}

export async function fetchGithubPinnedItems(
  input: GithubExtraFetchInput,
): Promise<readonly GithubPinnedItem[] | undefined> {
  assertToken(input.token);
  const login = input.login.trim();
  if (login === "") {
    return undefined;
  }
  const token = input.token.trim();
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const body = await extraGraphqlPost({
      cache: input.cache,
      token,
      fetchImpl,
      query: PINNED_ITEMS_QUERY,
      variables: { login },
      logger: input.logger,
    });
    if (body === undefined) {
      return undefined;
    }
    return parseGithubPinnedItems(body);
  } catch (error) {
    rethrowFailJob(error);
    return undefined;
  }
}

export async function fetchGithubPublicEvents(
  input: GithubExtraFetchInput,
): Promise<readonly GithubPublicEvent[] | undefined> {
  assertToken(input.token);
  const login = input.login.trim();
  if (login === "") {
    return undefined;
  }
  const token = input.token.trim();
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = publicEventsUrl(login);
  try {
    const body = await extraRestGet({
      cache: input.cache,
      url,
      params: { per_page: String(GITHUB_PUBLIC_EVENTS_PER_PAGE) },
      token,
      fetchImpl,
    });
    if (body === undefined) {
      return undefined;
    }
    return parseGithubPublicEvents(body);
  } catch (error) {
    rethrowFailJob(error);
    return undefined;
  }
}

export function parseGithubPinnedItems(
  body: unknown,
): readonly GithubPinnedItem[] | undefined {
  const data = asRecord(asRecord(body)?.data);
  const user = asRecord(data?.user);
  if (user == null) {
    return undefined;
  }
  const pinned = asRecord(user.pinnedItems);
  if (pinned == null || !Array.isArray(pinned.nodes)) {
    return undefined;
  }
  const items: GithubPinnedItem[] = [];
  for (const node of pinned.nodes) {
    const item = parsePinnedNode(node);
    if (item != null) {
      items.push(item);
    }
  }
  return items;
}

export function parseGithubPublicEvents(
  value: unknown,
): readonly GithubPublicEvent[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const events: GithubPublicEvent[] = [];
  for (const entry of value) {
    const event = parsePublicEvent(entry);
    if (event != null) {
      events.push(event);
    }
  }
  return events;
}

function parsePinnedNode(value: unknown): GithubPinnedItem | null {
  const record = asRecord(value);
  if (record == null) {
    return null;
  }
  const typename = record.__typename;
  if (typename === "Gist") {
    const name = stringField(record.name);
    const url = stringField(record.url);
    if (name === "" && url === "") {
      return null;
    }
    return {
      kind: "gist",
      name,
      description: nullableString(record.description),
      url,
    };
  }
  if (typename === "Repository" || typeof record.nameWithOwner === "string") {
    const name = stringField(record.name);
    const nameWithOwner = stringField(record.nameWithOwner);
    const url = stringField(record.url);
    if (name === "" && nameWithOwner === "" && url === "") {
      return null;
    }
    const item: GithubPinnedItem = {
      kind: "repository",
      name,
      description: nullableString(record.description),
      url,
    };
    if (nameWithOwner !== "") {
      item.nameWithOwner = nameWithOwner;
    }
    if (typeof record.stargazerCount === "number") {
      item.stargazerCount = record.stargazerCount;
    }
    if (typeof record.forkCount === "number") {
      item.forkCount = record.forkCount;
    }
    if (typeof record.isPrivate === "boolean") {
      item.isPrivate = record.isPrivate;
    }
    const language = parsePrimaryLanguage(record.primaryLanguage);
    if (language !== undefined) {
      item.primaryLanguage = language;
    }
    return item;
  }
  return null;
}

function parsePrimaryLanguage(
  value: unknown,
): GithubPinnedItem["primaryLanguage"] | undefined {
  const record = asRecord(value);
  if (record == null) {
    return undefined;
  }
  const name = stringField(record.name);
  if (name === "") {
    return undefined;
  }
  return {
    name,
    color: typeof record.color === "string" ? record.color : null,
  };
}

function parsePublicEvent(value: unknown): GithubPublicEvent | null {
  const record = asRecord(value);
  if (record == null) {
    return null;
  }
  if (typeof record.id !== "string" || record.id === "") {
    return null;
  }
  if (typeof record.type !== "string" || record.type === "") {
    return null;
  }
  const actor = asRecord(record.actor);
  const repo = asRecord(record.repo);
  return {
    id: record.id,
    type: record.type,
    actorLogin: actor == null ? "" : stringField(actor.login),
    repoName: repo == null ? "" : stringField(repo.name),
    public: record.public === true,
    createdAt: typeof record.created_at === "string" ? record.created_at : "",
  };
}

function extraGraphqlPost(input: {
  cache: GithubRequestCache;
  token: string;
  fetchImpl: GithubRestFetch;
  query: string;
  variables: unknown;
  logger?: RateLimitLogger;
}): Promise<unknown | undefined> {
  return input.cache.graphql(
    { query: input.query, variables: input.variables },
    () => extraGraphqlUncached(input),
  );
}

async function extraGraphqlUncached(input: {
  token: string;
  fetchImpl: GithubRestFetch;
  query: string;
  variables: unknown;
  logger?: RateLimitLogger;
}): Promise<unknown | undefined> {
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
    rethrowFailJob(error);
    return undefined;
  }

  const body = await readJson(response);
  if (input.logger != null) {
    logGraphqlRateLimitCost(input.logger, body, "pinnedItems");
  }
  if (response.status !== 200) {
    return undefined;
  }
  const errors = asRecord(body)?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return undefined;
  }
  return body;
}

function extraRestGet(input: {
  cache: GithubRequestCache;
  url: string;
  params: Readonly<Record<string, string>>;
  token: string;
  fetchImpl: GithubRestFetch;
}): Promise<unknown | undefined> {
  assertNotLanguagesUrl(input.url);
  return input.cache.rest(
    { method: "GET", url: input.url, params: input.params },
    () => extraRestGetUncached(input),
  );
}

async function extraRestGetUncached(input: {
  url: string;
  params: Readonly<Record<string, string>>;
  token: string;
  fetchImpl: GithubRestFetch;
}): Promise<unknown | undefined> {
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
    rethrowFailJob(error);
    return undefined;
  }
  if (response.status !== 200) {
    await response.text().catch(() => undefined);
    return undefined;
  }
  return readJson(response);
}

function assertToken(
  token: string | undefined | null,
): asserts token is string {
  if (isMissingToken(token)) {
    throw new GithubRestError(
      "fail_job",
      "github_token is missing; refusing unauthenticated GitHub extra endpoints",
    );
  }
}

function rethrowFailJob(error: unknown): void {
  if (error instanceof GithubRestError && error.outcome === "fail_job") {
    throw error;
  }
  if (error instanceof GithubGraphqlError && error.outcome === "fail_job") {
    throw error;
  }
}

function publicEventsUrl(login: string): string {
  return `${GITHUB_API_ORIGIN}/users/${encodeURIComponent(login)}/events/public`;
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
  const segments = githubPathname(url)
    .split("/")
    .filter((segment) => segment !== "");
  if (
    segments.length >= 4 &&
    segments[0] === "repos" &&
    segments[segments.length - 1] === "languages"
  ) {
    throw new GithubRestError(
      "fail_run",
      "REST /languages is forbidden; use GraphQL nodes(ids:)",
    );
  }
}

function githubPathname(url: string): string {
  try {
    return new URL(url, GITHUB_API_ORIGIN).pathname;
  } catch {
    return url;
  }
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

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}
