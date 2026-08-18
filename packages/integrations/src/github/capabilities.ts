/**
 * Map an identity-probe result + token class to capability flags.
 * No HTTP crawl. Policy lives in `@profile-bits/core` auth-policy.
 */
import type { Capabilities, TokenClass } from "@profile-bits/core";
import { capabilitiesFromProbe, loginsMatch } from "@profile-bits/core";

/** REST `GET /user` or GraphQL `viewer { login }` identity, capability-only. */
export type GithubProbeResult = {
  login: string;
};

export type GithubCapabilityInput = {
  probe: GithubProbeResult;
  configuredUser: string;
  tokenClass: TokenClass;
};

/**
 * Probe login ≠ configured `user` ⇒ `canPrivate` and `canContributions` false
 * (public REST only; do not invent `0`). `user_pat` may set `canGist`;
 * `actions_installation` typically cannot.
 */
export function mapGithubCapabilities(
  input: GithubCapabilityInput,
): Capabilities {
  return capabilitiesFromProbe({
    probeLogin: input.probe.login,
    configuredUser: input.configuredUser,
    tokenClass: input.tokenClass,
  });
}

/** Mismatch forces public owner listing; private and contributions are unavailable. */
export function isProbeUserMismatch(
  probe: GithubProbeResult,
  configuredUser: string,
): boolean {
  return !loginsMatch(probe.login, configuredUser);
}
