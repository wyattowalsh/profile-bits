import { CODING_API_DOMAIN_DEFAULT, isMissingToken } from "@profile-bits/core";
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
  factories: ActionClientFactories = {},
): ActionClients {
  const createGithub = factories.createGithubClient ?? createGithubClient;
  const createWakatime = factories.createWakatimeClient ?? createWakatimeClient;

  return {
    github: createGithubClientIfEnabled(loaded, createGithub),
    wakatime: createWakatimeClientIfPackOn(loaded, createWakatime),
  };
}

function createGithubClientIfEnabled(
  loaded: LoadedActionConfig,
  createGithub: typeof createGithubClient,
): GithubClient | undefined {
  if (!hasEnabledGithubWidget(loaded)) {
    return undefined;
  }
  return createGithub({
    token: loaded.inputs.github_token,
    configuredUser: loaded.inputs.user ?? "",
  });
}

function createWakatimeClientIfPackOn(
  loaded: LoadedActionConfig,
  createWakatime: typeof createWakatimeClient,
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
  });
}

function hasEnabledGithubWidget(loaded: LoadedActionConfig): boolean {
  const widgets = loaded.config.plugins.github?.widgets;
  return (
    widgets?.demo !== undefined ||
    widgets?.stats !== undefined ||
    widgets?.languages !== undefined
  );
}

function wakatimeApiDomain(loaded: LoadedActionConfig): string {
  return (
    loaded.config.plugins.wakatime?.widgets?.coding?.api_domain ??
    CODING_API_DOMAIN_DEFAULT
  );
}
