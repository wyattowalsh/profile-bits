/**
 * Destination: packages/integrations/src/steam/auth.ts
 * Scheme query-key. Catalog auth required. Missing token fails the job.
 * Inject `?key=` at send time. Never an Authorization header. Never cache the secret.
 */
import type { AuthRequirement } from "@profile-bits/core";
import { isMissingToken } from "@profile-bits/core";

export const STEAM_AUTH = "required" as const satisfies AuthRequirement;
export const STEAM_QUERY_KEY_PARAM = "key" as const;
export const STEAM_CACHE_AUTH = "query-key" as const;

export type SteamToken = string;

export function isSteamTokenMissing(token: string | undefined | null): boolean {
  return isMissingToken(token);
}

/**
 * Missing token fails construct (fail_job). Do not send without `?key=`.
 */
export function assertSteamActionToken(token: string | undefined | null): void {
  if (isSteamTokenMissing(token)) {
    throw new Error(
      "steam: missing token — fail_job; refusing requests without ?key=",
    );
  }
}

/** Query-key never emits Authorization — always `{}`. */
export function steamAuthorizationHeader(
  token: string | undefined | null,
): Readonly<Record<string, string>> {
  assertSteamActionToken(token);
  return {};
}

export function applySteamQueryKey(
  url: string,
  token: string | undefined | null,
): string {
  assertSteamActionToken(token);
  const parsed = new URL(url);
  parsed.searchParams.set(STEAM_QUERY_KEY_PARAM, token?.trim() ?? "");
  return parsed.toString();
}

export function steamRequiresAuthorization(): boolean {
  return true;
}
