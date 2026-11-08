/**
 * Scheme oauth-refresh for integration id spotify.
 * Resource Authorization is Bearer access token after grant_type=refresh_token.
 * Client id/secret are named env, not yaml. Never decideActionToken.
 */
import type { AuthDecision, AuthRequirement } from "@profile-bits/core";
import { isMissingToken } from "@profile-bits/core";

export const SPOTIFY_AUTH = "required" as const satisfies AuthRequirement;
export const SPOTIFY_CACHE_AUTH = "bearer" as const;
export const SPOTIFY_CLIENT_ID_ENV = "SPOTIFY_CLIENT_ID" as const;
export const SPOTIFY_CLIENT_SECRET_ENV = "SPOTIFY_CLIENT_SECRET" as const;
export const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
export const SPOTIFY_API_ORIGIN = "https://api.spotify.com";

export type SpotifyToken = string;

export function isSpotifyTokenMissing(
  token: string | undefined | null,
): boolean {
  return isMissingToken(token);
}

export function isSpotifyClientIdMissing(
  clientId: string | undefined | null,
): boolean {
  return isMissingToken(clientId);
}

export function isSpotifyClientSecretMissing(
  clientSecret: string | undefined | null,
): boolean {
  return isMissingToken(clientSecret);
}

/**
 * Refresh token is required only when the pack is on. Pack absent does
 * not require credentials.
 */
export function decideSpotifyToken(input: {
  token: string | undefined | null;
  clientId?: string | undefined | null;
  clientSecret?: string | undefined | null;
  packEnabled: boolean;
}): AuthDecision {
  if (!input.packEnabled) {
    return "render";
  }
  if (
    isSpotifyTokenMissing(input.token) ||
    isSpotifyClientIdMissing(input.clientId) ||
    isSpotifyClientSecretMissing(input.clientSecret)
  ) {
    return "fail_job";
  }
  return "render";
}

export function assertSpotifyActionToken(
  token: string | undefined | null,
): void {
  if (isSpotifyTokenMissing(token)) {
    throw new Error(
      "spotify_token is required when the spotify pack is enabled",
    );
  }
}

export function assertSpotifyClientCredentials(
  clientId: string | undefined | null,
  clientSecret: string | undefined | null,
): void {
  if (isSpotifyClientIdMissing(clientId)) {
    throw new Error(
      "SPOTIFY_CLIENT_ID is required when the spotify pack is enabled",
    );
  }
  if (isSpotifyClientSecretMissing(clientSecret)) {
    throw new Error(
      "SPOTIFY_CLIENT_SECRET is required when the spotify pack is enabled",
    );
  }
}

export function spotifyClientBasicAuthorization(
  clientId: string | undefined | null,
  clientSecret: string | undefined | null,
): Readonly<Record<string, string>> {
  assertSpotifyClientCredentials(clientId, clientSecret);
  const id = clientId?.trim() ?? "";
  const secret = clientSecret?.trim() ?? "";
  return {
    Authorization: `Basic ${Buffer.from(`${id}:${secret}`, "utf8").toString("base64")}`,
  };
}

export function spotifyTokenRequestBody(
  refreshToken: string | undefined | null,
): string {
  assertSpotifyActionToken(refreshToken);
  const token = refreshToken?.trim() ?? "";
  return new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token,
  }).toString();
}

/** Resource Authorization is Bearer **access** token. Never the refresh token. */
export function spotifyAuthorizationHeader(
  accessToken: string | undefined | null,
): Readonly<Record<string, string>> {
  if (isMissingToken(accessToken)) {
    return {};
  }
  return { Authorization: `Bearer ${accessToken?.trim() ?? ""}` };
}

export function spotifyRequiresAuthorization(): boolean {
  return true;
}

export function spotifySecrets(input: {
  refreshToken?: string | undefined | null;
  accessToken?: string | undefined | null;
  clientSecret?: string | undefined | null;
}): readonly string[] {
  const secrets: string[] = [];
  for (const value of [
    input.refreshToken,
    input.accessToken,
    input.clientSecret,
  ]) {
    if (!isMissingToken(value)) {
      secrets.push(value?.trim() ?? "");
    }
  }
  return secrets;
}

export function readSpotifyClientId(
  explicit?: string | undefined | null,
): string | undefined {
  if (!isSpotifyClientIdMissing(explicit)) {
    return explicit?.trim();
  }
  const fromEnv = process.env[SPOTIFY_CLIENT_ID_ENV];
  return isSpotifyClientIdMissing(fromEnv) ? undefined : fromEnv?.trim();
}

export function readSpotifyClientSecret(
  explicit?: string | undefined | null,
): string | undefined {
  if (!isSpotifyClientSecretMissing(explicit)) {
    return explicit?.trim();
  }
  const fromEnv = process.env[SPOTIFY_CLIENT_SECRET_ENV];
  return isSpotifyClientSecretMissing(fromEnv) ? undefined : fromEnv?.trim();
}
