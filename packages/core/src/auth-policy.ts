import type {
  AuthDecision,
  Capabilities,
  IntegrationId,
  OutputAction,
  OutputFormat,
  SkipFailOutcome,
  TokenClass,
  WidgetId,
} from "./types.js";
import { ACTION_ALLOW_SKIPPED_DEFAULT, WIDGET_INTEGRATIONS } from "./types.js";

/** Skipped-stats field id when contributions are requested without capability. */
export const CONTRIBUTIONS_SKIP_ID = "github/stats:contributions" as const;

export type ContributionsFieldDecision = {
  include: boolean;
  skipped: readonly string[];
  renderZero: boolean;
};

export type WidgetOutputFlags = {
  write: boolean;
  dataChanged: boolean;
};

export type GithubHttpClassificationInput = {
  status: number;
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
  remaining?: number | null;
  graphql?: boolean;
  graphqlErrors?: readonly unknown[] | null;
};

export type GithubWidgetOutcome = {
  id: WidgetId;
  outcome: SkipFailOutcome;
};

/**
 * Empty, `""`, and whitespace tokens are missing. Never treat them as a
 * default or as an unauthenticated GitHub client.
 */
export function isMissingToken(token: string | undefined | null): boolean {
  return token == null || token.trim() === "";
}

/** Action surface: a missing token fails the job (never unauthenticated 60/h). */
export function decideActionToken(
  token: string | undefined | null,
): AuthDecision {
  return isMissingToken(token) ? "fail_job" : "render";
}

export function loginsMatch(
  probeLogin: string,
  configuredUser: string,
): boolean {
  return (
    probeLogin.trim().toLowerCase() === configuredUser.trim().toLowerCase()
  );
}

/**
 * Identity-probe → capability flags. Probe login ≠ configured user disables
 * private and contributions (do not invent `0`). Gist write follows token class:
 * only a user PAT can create gists.
 */
export function capabilitiesFromProbe(input: {
  probeLogin: string;
  configuredUser: string;
  tokenClass: TokenClass;
}): Capabilities {
  const sameUser = loginsMatch(input.probeLogin, input.configuredUser);
  const privileged =
    input.tokenClass === "user_pat" ||
    input.tokenClass === "github_app_install";
  return {
    canPrivate: sameUser && privileged,
    canContributions: sameUser && privileged,
    canGist: input.tokenClass === "user_pat",
  };
}

/** Force public-only when the probe identity is not the configured user. */
export function restrictCapabilitiesForUser(
  capabilities: Capabilities,
  probeLogin: string,
  configuredUser: string,
): Capabilities {
  if (loginsMatch(probeLogin, configuredUser)) {
    return capabilities;
  }
  return {
    ...capabilities,
    canPrivate: false,
    canContributions: false,
  };
}

export function usesGithubIntegration(widgetId: WidgetId): boolean {
  const integrations: readonly IntegrationId[] = WIDGET_INTEGRATIONS[widgetId];
  return integrations.includes("github");
}

/** `include_private: true` without `canPrivate` fails the widget (no silent public chart). */
export function decideIncludePrivate(input: {
  includePrivate: boolean;
  canPrivate: boolean;
}): AuthDecision {
  return input.includePrivate && !input.canPrivate ? "fail_widget" : "render";
}

/** Gist output needs `canGist` and svg; otherwise fail the run. */
export function decideGistOutput(input: {
  outputAction: OutputAction;
  format: OutputFormat;
  canGist: boolean;
}): AuthDecision {
  if (input.outputAction !== "gist") {
    return "render";
  }
  if (!input.canGist || input.format !== "svg") {
    return "fail_run";
  }
  return "render";
}

/**
 * Contributions without capability: skip the field (`github/stats:contributions`),
 * never render `0`.
 */
export function decideContributionsField(input: {
  requested: boolean;
  canContributions: boolean;
}): ContributionsFieldDecision {
  if (!input.requested) {
    return { include: false, skipped: [], renderZero: false };
  }
  if (!input.canContributions) {
    return {
      include: false,
      skipped: [CONTRIBUTIONS_SKIP_ID],
      renderZero: false,
    };
  }
  return { include: true, skipped: [], renderZero: false };
}

/**
 * Every github-integration widget skipped and `allow_skipped` false → fail the job.
 * Demo-only runs (no github widgets) do not fail.
 */
export function decideAllGithubWidgetsSkipped(input: {
  widgets: readonly GithubWidgetOutcome[];
  allowSkipped?: boolean;
}): AuthDecision {
  const github = input.widgets.filter((widget) =>
    usesGithubIntegration(widget.id),
  );
  if (github.length === 0) {
    return "render";
  }
  const allSkipped = github.every((widget) => widget.outcome === "skip_widget");
  const allowSkipped = input.allowSkipped ?? ACTION_ALLOW_SKIPPED_DEFAULT;
  return allSkipped && !allowSkipped ? "fail_job" : "render";
}

/** Skipped widgets must not write files and must not count as `data-changed`. */
export function widgetOutputFlags(outcome: SkipFailOutcome): WidgetOutputFlags {
  const write = outcome === "render";
  return { write, dataChanged: write };
}

export function classifyGithubHttp(
  input: GithubHttpClassificationInput,
): SkipFailOutcome {
  const { status } = input;

  if (status === 401) {
    return "fail_run";
  }
  if (status === 429) {
    return "fail_after_backoff";
  }
  if (status === 403 && isSecondaryOrAbuse(input)) {
    return "fail_after_backoff";
  }
  if (status === 403) {
    return "fail_run";
  }
  if (status === 404) {
    return "fail_widget";
  }

  if (status === 200 && isGraphqlExhaustion(input)) {
    return "fail_after_backoff";
  }
  if (status === 200) {
    return "render";
  }

  return "fail_run";
}

function isSecondaryOrAbuse(input: GithubHttpClassificationInput): boolean {
  const text =
    `${bodyText(input.body)} ${header(input.headers, "retry-after") ?? ""}`.toLowerCase();
  return (
    text.includes("secondary rate limit") ||
    text.includes("abuse detection") ||
    text.includes("abuse-rate-limits") ||
    header(input.headers, "retry-after") != null
  );
}

function isGraphqlExhaustion(input: GithubHttpClassificationInput): boolean {
  const errors = input.graphqlErrors ?? graphqlErrorsFromBody(input.body);
  const hasErrors = Array.isArray(errors) && errors.length > 0;
  const graphql = input.graphql === true || hasErrors;
  if (!graphql) {
    return false;
  }
  const remaining = input.remaining ?? remainingFromBody(input.body);
  return hasErrors || remaining === 0;
}

function graphqlErrorsFromBody(body: unknown): readonly unknown[] | undefined {
  const record = asRecord(body);
  if (record == null || !("errors" in record)) {
    return undefined;
  }
  return Array.isArray(record.errors) ? record.errors : undefined;
}

function remainingFromBody(body: unknown): number | undefined {
  const record = asRecord(body);
  if (record == null) {
    return undefined;
  }
  const direct = remainingFromRateLimit(record.rateLimit);
  if (direct != null) {
    return direct;
  }
  const data = asRecord(record.data);
  return data == null ? undefined : remainingFromRateLimit(data.rateLimit);
}

function remainingFromRateLimit(value: unknown): number | undefined {
  const record = asRecord(value);
  if (record == null || typeof record.remaining !== "number") {
    return undefined;
  }
  return record.remaining;
}

function bodyText(body: unknown): string {
  if (typeof body === "string") {
    return body;
  }
  const record = asRecord(body);
  if (record == null) {
    return "";
  }
  if (typeof record.message === "string") {
    return record.message;
  }
  try {
    return JSON.stringify(body);
  } catch {
    return "";
  }
}

function header(
  headers: Readonly<Record<string, string>> | undefined,
  name: string,
): string | undefined {
  if (headers == null) {
    return undefined;
  }
  const want = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === want) {
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
