/**
 * Query-key scheme (`?key=`). Not a first-party integration id.
 * Never Authorization Bearer. Never put the secret in a cache key.
 */

import {
  type AuthDecision,
  type AuthRequirement,
  isMissingToken,
} from "@profile-bits/core";

export const QUERY_KEY_PARAM = "key" as const;
export const QUERY_KEY_CACHE_AUTH = "query-key" as const;
export const QUERY_KEY_AUTH = "required" as const satisfies AuthRequirement;

export function isQueryKeyTokenMissing(
  token: string | undefined | null,
): boolean {
  return isMissingToken(token);
}

/**
 * Query-key token is required only when the pack is on. Pack absent does
 * not require the token. Do not reuse http-optional fail_widget.
 */
export function decideQueryKeyToken(input: {
  token: string | undefined | null;
  packEnabled: boolean;
}): AuthDecision {
  if (!input.packEnabled) {
    return "render";
  }
  return isQueryKeyTokenMissing(input.token) ? "fail_job" : "render";
}

export function queryKeyRequiresAuthorization(): boolean {
  return true;
}

/**
 * Pack-on path (client construct). Missing token fails the job and MUST
 * NOT send a request without `?key=`.
 */
export function assertQueryKeyActionToken(
  token: string | undefined | null,
): void {
  if (decideQueryKeyToken({ token, packEnabled: true }) === "fail_job") {
    throw new Error(
      "query-key: missing token — fail_job; refusing requests without ?key=",
    );
  }
}

/** Query-key never emits Authorization — always `{}`, never Bearer. */
export function queryKeyAuthorizationHeader(
  token: string | undefined | null,
): Readonly<Record<string, string>> {
  assertQueryKeyActionToken(token);
  return {};
}

export function applyQueryKey(
  url: string,
  token: string | undefined | null,
): string {
  assertQueryKeyActionToken(token);
  const parsed = new URL(url);
  parsed.searchParams.set(QUERY_KEY_PARAM, token?.trim() ?? "");
  return parsed.toString();
}

export function stripQueryKeyFromUrl(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete(QUERY_KEY_PARAM);
  return parsed.toString();
}

export function queryKeyCacheParams(
  params: Readonly<Record<string, string>>,
): Record<string, string> {
  const sorted: Record<string, string> = {};
  for (const name of Object.keys(params).sort()) {
    if (name === QUERY_KEY_PARAM) {
      continue;
    }
    sorted[name] = params[name] ?? "";
  }
  return sorted;
}

export function queryKeyRestCacheKey(parts: {
  method: string;
  url: string;
  params?: Readonly<Record<string, string>>;
}): string {
  return JSON.stringify({
    method: parts.method,
    url: stripQueryKeyFromUrl(parts.url),
    params: queryKeyCacheParams(parts.params ?? {}),
    auth: QUERY_KEY_CACHE_AUTH,
  });
}

export function queryKeySecrets(
  token: string | undefined | null,
): readonly string[] {
  if (isQueryKeyTokenMissing(token)) {
    return [];
  }
  return [token?.trim() ?? ""];
}
