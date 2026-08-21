/**
 * Authenticated GitHub client: one identity probe per instance, then REST
 * crawl plus GraphQL `nodes(ids:)` language bytes (T112) for stats/languages.
 * Widget demo: probe only. Widget repo: probe + GET /repos/{owner}/{repo}.
 * Never unauthenticated (60/h/IP). Empty token fails before any HTTP. Never
 * REST `/languages`. FORBIDDEN: rewriting rest.ts; implementing GraphQL
 * inside this file. `logger` is GraphQL RateLimitLogger; `runLog` is REST
 * crawl RunLogSink.
 */

import {
  type Capabilities,
  decideActionToken,
  decideIncludePrivate,
  isMissingToken,
  type RunLogSink,
  type SkipFailOutcome,
  type TokenClass,
} from "@profile-bits/core";
import { GithubRequestCache } from "./cache.js";
import {
  type GithubProbeResult,
  mapGithubCapabilities,
} from "./capabilities.js";
import {
  fetchContributionTotal,
  fetchRepositoryLanguages,
  GithubGraphqlError,
  type GithubLanguageBytes,
} from "./graphql.js";
import { classifyGithubRateLimit, type RateLimitLogger } from "./rate-limit.js";
import {
  crawlGithubRest,
  fetchGithubRepo,
  GITHUB_API_ORIGIN,
  GITHUB_API_VERSION,
  type GithubRepository,
  type GithubRestCrawlResult,
  GithubRestError,
  type GithubRestFetch,
} from "./rest.js";

export type { GithubRestCrawlResult, GithubRestFetch };

export const GITHUB_PROBE_URL = `${GITHUB_API_ORIGIN}/user`;

export type CreateGithubClientInput = {
  token: string;
  configuredUser: string;
  fetch?: GithubRestFetch;
  cache?: GithubRequestCache;
  logger?: RateLimitLogger;
  runLog?: RunLogSink;
};

export type GithubPayloadInput = {
  user: string;
  widget?: string;
  repo?: string;
  includePrivate: boolean;
  includeForks: boolean;
  includeArchived: boolean;
};

/** REST crawl plus GraphQL language bytes; contributions iff capable. */
export type GithubWidgetPayload = GithubRestCrawlResult & {
  languages: readonly GithubLanguageBytes[];
  contributions?: number;
  repository?: GithubRepository;
};

export type GithubClient = {
  readonly tokenClass: TokenClass;
  readonly capabilities: Capabilities;
  loadPayload: (input: GithubPayloadInput) => Promise<GithubWidgetPayload>;
  fetchPayload: (input: GithubPayloadInput) => Promise<GithubWidgetPayload>;
};

export class GithubClientError extends Error {
  override readonly name = "GithubClientError";
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

const NOOP_RATE_LIMIT_LOGGER: RateLimitLogger = {
  info() {},
};

/**
 * One client per Action / playground request. Probe is capability-only
 * (`GET /user`). Payload is T111d `crawlGithubRest` plus T112 GraphQL
 * `nodes(ids:)` language bytes through the run cache, except demo (probe
 * only) and repo (`fetchGithubRepo`).
 */
export function createGithubClient(
  input: CreateGithubClientInput | string,
): GithubClient {
  const options: CreateGithubClientInput =
    typeof input === "string" ? { token: input, configuredUser: "" } : input;
  const rawToken = options.token;
  if (isMissingToken(rawToken) || decideActionToken(rawToken) === "fail_job") {
    throw new GithubClientError(
      "fail_job",
      "github_token is missing; refusing unauthenticated GitHub",
    );
  }

  const token = rawToken.trim();
  const configuredUser = options.configuredUser;
  const fetchImpl = options.fetch ?? fetch;
  const cache = options.cache ?? new GithubRequestCache();
  const logger = options.logger ?? NOOP_RATE_LIMIT_LOGGER;
  const runLog = options.runLog;
  let tokenClass = inferGithubTokenClass(token);
  // Probe has not run yet: never invent matching "_"/"_" logins so a
  // ghp_/github_pat_ looks like canPrivate for every requested user.
  let capabilities: Capabilities = {
    canPrivate: false,
    canContributions: false,
    canGist: tokenClass === "user_pat",
  };
  let probe: GithubProbeResult | undefined;
  let probeInFlight: Promise<GithubProbeResult> | undefined;

  const client: GithubClient = {
    get tokenClass() {
      return tokenClass;
    },
    get capabilities() {
      return capabilities;
    },
    loadPayload,
    fetchPayload: loadPayload,
  };
  return client;

  async function loadPayload(
    payloadInput: GithubPayloadInput,
  ): Promise<GithubWidgetPayload> {
    const identity = await ensureProbe();
    const login = resolveLogin(payloadInput.user, configuredUser);
    tokenClass = inferGithubTokenClass(token, identity);
    capabilities = mapGithubCapabilities({
      probe: identity,
      configuredUser: login,
      tokenClass,
    });

    if (payloadInput.widget === "demo") {
      return { ...emptyGithubCrawl(login), languages: [] };
    }

    if (payloadInput.widget === "repo") {
      try {
        const repository = await fetchGithubRepo({
          repo: payloadInput.repo ?? "",
          token,
          cache,
          fetchImpl,
          logger: runLog,
        });
        return {
          ...emptyGithubCrawl(login),
          languages: [],
          repository,
        };
      } catch (error) {
        throw wrapGithubDataError(
          error,
          "GitHub crawl failed before a classified response",
        );
      }
    }

    if (
      decideIncludePrivate({
        includePrivate: payloadInput.includePrivate,
        canPrivate: capabilities.canPrivate,
      }) === "fail_widget"
    ) {
      throw new GithubClientError(
        "fail_widget",
        "include_private requires canPrivate; refusing a silent public crawl",
      );
    }

    try {
      const crawl = await crawlGithubRest({
        login,
        token,
        cache,
        includePrivate: payloadInput.includePrivate,
        canPrivate: capabilities.canPrivate,
        includeForks: payloadInput.includeForks,
        includeArchived: payloadInput.includeArchived,
        fetchImpl,
        logger: runLog,
      });
      const languages = await fetchRepositoryLanguages({
        repositoryIds: crawl.repositoryIds,
        token,
        cache,
        fetchImpl,
        logger,
      });
      const contributions = await fetchContributionTotal({
        login,
        token,
        cache,
        canContributions: capabilities.canContributions,
        fetchImpl,
        logger,
      });
      return contributions === undefined
        ? { ...crawl, languages }
        : { ...crawl, languages, contributions };
    } catch (error) {
      throw wrapGithubDataError(
        error,
        "GitHub crawl failed before a classified response",
      );
    }
  }

  async function ensureProbe(): Promise<GithubProbeResult> {
    if (probe != null) {
      return probe;
    }
    if (probeInFlight != null) {
      return probeInFlight;
    }
    probeInFlight = cache.rest(
      { method: "GET", url: GITHUB_PROBE_URL, params: {} },
      () => fetchIdentityProbe({ token, fetchImpl }),
    );
    try {
      probe = await probeInFlight;
      return probe;
    } finally {
      probeInFlight = undefined;
    }
  }
}

export function inferGithubTokenClass(
  token: string,
  probe?: { login?: string; type?: string },
): TokenClass {
  const trimmed = token.trim();
  if (
    trimmed.startsWith("ghp_") ||
    trimmed.startsWith("github_pat_") ||
    trimmed.startsWith("gho_")
  ) {
    return "user_pat";
  }
  if (trimmed.startsWith("ghu_") || trimmed.startsWith("ghy_")) {
    return "github_app_install";
  }
  if (isBotIdentity(probe)) {
    return "github_app_install";
  }
  if (trimmed.startsWith("ghs_")) {
    return "actions_installation";
  }
  if (probe?.type?.toLowerCase() === "user") {
    return "user_pat";
  }
  return "actions_installation";
}

function isBotIdentity(probe?: { login?: string; type?: string }): boolean {
  if (probe == null) {
    return false;
  }
  if (probe.type?.toLowerCase() === "bot") {
    return true;
  }
  return (probe.login ?? "").toLowerCase().endsWith("[bot]");
}

function resolveLogin(payloadUser: string, configuredUser: string): string {
  const fromPayload = payloadUser.trim();
  if (fromPayload !== "") {
    return fromPayload;
  }
  return configuredUser.trim();
}

function emptyGithubCrawl(login: string): GithubRestCrawlResult {
  return {
    user: {
      login,
      id: 0,
      nodeId: "",
      followers: 0,
      following: 0,
      publicRepos: 0,
      publicGists: 0,
    },
    repositories: [],
    repositoryIds: [],
  };
}

async function fetchIdentityProbe(input: {
  token: string;
  fetchImpl: GithubRestFetch;
}): Promise<GithubProbeResult> {
  const url = new URL(GITHUB_PROBE_URL);
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
    if (
      error instanceof GithubClientError ||
      error instanceof GithubRestError
    ) {
      throw error;
    }
    throw new GithubClientError(
      "fail_run",
      "GitHub identity probe failed before a response",
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
    throw new GithubClientError(
      outcome,
      `GitHub identity probe ${response.status}`,
      { status: response.status },
    );
  }

  const parsed = parseProbe(body);
  if (parsed == null) {
    throw new GithubClientError(
      "fail_run",
      "GitHub identity probe response was invalid",
      { status: 200 },
    );
  }
  return parsed;
}

function parseProbe(
  value: unknown,
): (GithubProbeResult & { type: string }) | null {
  const record = asRecord(value);
  if (
    record == null ||
    typeof record.login !== "string" ||
    record.login === ""
  ) {
    return null;
  }
  return {
    login: record.login,
    type: typeof record.type === "string" ? record.type : "",
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

function wrapGithubDataError(
  error: unknown,
  fallback: string,
): GithubClientError {
  if (error instanceof GithubClientError) {
    return error;
  }
  if (error instanceof GithubGraphqlError || error instanceof GithubRestError) {
    return new GithubClientError(error.outcome, error.message, {
      status: error.status,
      cause: error,
    });
  }
  return new GithubClientError("fail_run", fallback, { cause: error });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
