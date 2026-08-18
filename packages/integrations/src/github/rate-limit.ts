import {
  classifyGithubHttp,
  type GithubHttpClassificationInput,
  type SkipFailOutcome,
} from "@profile-bits/core";

export type { GithubHttpClassificationInput, SkipFailOutcome };

/**
 * Secret-safe logger for GraphQL `rateLimit.cost`. Callers inject this;
 * the module never prints tokens, Authorization, or query variables.
 */
export type RateLimitLogger = {
  info(
    message: string,
    fields?: Readonly<{ cost: number; operation?: string }>,
  ): void;
};

export type GraphqlClassifyInput = Omit<
  GithubHttpClassificationInput,
  "graphql"
> & {
  graphql?: boolean;
  logger?: RateLimitLogger;
  operation?: string;
};

export type GithubRateLimit = {
  classify(input: GithubHttpClassificationInput): SkipFailOutcome;
  classifyGraphql(input: GraphqlClassifyInput): SkipFailOutcome;
  logCost(body: unknown, operation?: string): void;
};

/** Wrap core skip/fail classification. Do not fork a second matrix. */
export function classifyGithubRateLimit(
  input: GithubHttpClassificationInput,
): SkipFailOutcome {
  return classifyGithubHttp(input);
}

/**
 * GraphQL HTTP classification. Forces `graphql: true` so HTTP 200 with
 * `errors[]` and/or remaining 0 is fail-after-backoff (not skip-widget).
 * Logs `rateLimit.cost` when a logger is provided.
 */
export function classifyGraphqlResponse(
  input: GraphqlClassifyInput,
): SkipFailOutcome {
  const { logger, operation, ...classification } = input;
  if (logger != null) {
    logGraphqlRateLimitCost(logger, classification.body, operation);
  }
  return classifyGithubHttp({ ...classification, graphql: true });
}

export function createGithubRateLimit(
  logger: RateLimitLogger,
): GithubRateLimit {
  return {
    classify: classifyGithubRateLimit,
    classifyGraphql(input) {
      return classifyGraphqlResponse({ ...input, logger });
    },
    logCost(body, operation) {
      logGraphqlRateLimitCost(logger, body, operation);
    },
  };
}

export function logGraphqlRateLimitCost(
  logger: RateLimitLogger,
  body: unknown,
  operation?: string,
): void {
  const cost = readGraphqlRateLimitCost(body);
  if (cost === undefined) {
    return;
  }
  logger.info(
    "github.graphql.rateLimit.cost",
    operation == null || operation === "" ? { cost } : { cost, operation },
  );
}

export function readGraphqlRateLimitCost(body: unknown): number | undefined {
  const record = asRecord(body);
  if (record == null) {
    return undefined;
  }
  const direct = costFromRateLimit(record.rateLimit);
  if (direct !== undefined) {
    return direct;
  }
  const data = asRecord(record.data);
  return data == null ? undefined : costFromRateLimit(data.rateLimit);
}

function costFromRateLimit(value: unknown): number | undefined {
  const record = asRecord(value);
  if (record == null || typeof record.cost !== "number") {
    return undefined;
  }
  return record.cost;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
