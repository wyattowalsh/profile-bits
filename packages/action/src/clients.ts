import {
  CODING_API_DOMAIN_DEFAULT,
  isMissingToken,
  type RunLogSink,
} from "@profile-bits/core";
import {
  createGithubClient,
  createWakatimeClient,
  type GithubClient,
  type WakatimeClient,
} from "@profile-bits/integrations";
import type { LoadedActionConfig } from "./load-config.ts";

export type ActionClientFactories = {
  createGithubClient?: typeof createGithubClient;
  createWakatimeClient?: typeof createWakatimeClient;
};

export type CreateActionClientsOptions = ActionClientFactories & {
  logger?: RunLogSink;
};

export type ActionClients = {
  github?: GithubClient;
  wakatime?: WakatimeClient;
};

/**
 * At most one GitHub client and one WakaTime client per Action run.
 * Pack off or a missing WakaTime token leaves `wakatime` undefined — the
 * WakaTime constructor fail_jobs on a missing token, so this factory never
 * constructs in that case (engine owns `fail_job`). Production omits `fetch`
 * so WakaTime uses pinned HTTPS GET.
 */
export function createActionClients(
  loaded: LoadedActionConfig,
  factories: CreateActionClientsOptions = {},
): ActionClients {
  const createGithub = factories.createGithubClient ?? createGithubClient;
  const createWakatime = factories.createWakatimeClient ?? createWakatimeClient;
  const logger = factories.logger;

  return {
    github: createGithubClientIfEnabled(loaded, createGithub, logger),
    wakatime: createWakatimeClientIfPackOn(loaded, createWakatime, logger),
  };
}

function adaptRunLogSinkToGithubRateLimitLogger(logger: RunLogSink) {
  return {
    info(
      message: string,
      fields?: Readonly<{ cost: number; operation?: string }>,
    ): void {
      logger({
        v: 1,
        src: "profile-bits",
        kind: "call",
        pkg: "integrations",
        integration: "github",
        op: fields?.operation ?? message,
        outcome: "ok",
        ...(fields?.cost !== undefined ? { cost: fields.cost } : {}),
        message,
      });
    },
  };
}

function createGithubClientIfEnabled(
  loaded: LoadedActionConfig,
  createGithub: typeof createGithubClient,
  logger?: RunLogSink,
): GithubClient | undefined {
  if (!hasEnabledGithubWidget(loaded)) {
    return undefined;
  }
  return createGithub({
    token: loaded.inputs.github_token,
    configuredUser: loaded.inputs.user ?? "",
    ...(logger === undefined
      ? {}
      : {
          logger: adaptRunLogSinkToGithubRateLimitLogger(logger),
          runLog: logger,
        }),
  });
}

function createWakatimeClientIfPackOn(
  loaded: LoadedActionConfig,
  createWakatime: typeof createWakatimeClient,
  logger?: RunLogSink,
): WakatimeClient | undefined {
  if (loaded.config.plugins.wakatime === undefined) {
    return undefined;
  }
  const token = loaded.inputs.wakatime_token;
  if (typeof token !== "string" || isMissingToken(token)) {
    return undefined;
  }
  return createWakatime({
    token: token.trim(),
    apiDomain: wakatimeApiDomain(loaded),
    ...(logger === undefined ? {} : { logger }),
  });
}

function hasEnabledGithubWidget(loaded: LoadedActionConfig): boolean {
  const widgets = loaded.config.plugins.github?.widgets;
  return (
    widgets?.demo !== undefined ||
    widgets?.stats !== undefined ||
    widgets?.languages !== undefined ||
    widgets?.repo !== undefined
  );
}

function wakatimeApiDomain(loaded: LoadedActionConfig): string {
  return (
    loaded.config.plugins.wakatime?.widgets?.coding?.api_domain ??
    CODING_API_DOMAIN_DEFAULT
  );
}
