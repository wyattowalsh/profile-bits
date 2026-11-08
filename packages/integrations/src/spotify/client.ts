/**
 * Shared Spotify client for one Action / playground / generate run.
 * oauth-refresh: refresh token + named env client credentials → Bearer access.
 * REST cache key: (method, url, params, auth "bearer") — never the secret.
 * Never REST /languages. Never log the refresh token.
 */
import {
  type RunLogSink,
  redactSecrets,
  type SkipFailOutcome,
} from "@profile-bits/core";
import {
  assertSpotifyActionToken,
  assertSpotifyClientCredentials,
  readSpotifyClientId,
  readSpotifyClientSecret,
  SPOTIFY_API_ORIGIN,
  SPOTIFY_TOKEN_URL,
  spotifyAuthorizationHeader,
  spotifyClientBasicAuthorization,
  spotifyRequiresAuthorization,
  spotifySecrets,
  spotifyTokenRequestBody,
} from "./auth.js";
import { SpotifyRequestCache, spotifyRestCacheKey } from "./cache.js";
import type { SpotifyInputs } from "./inputs.js";
import {
  parseSpotifyDump,
  parseSpotifyTokenResponse,
  type SpotifyDump,
} from "./payload.js";
import { SPOTIFY_SCOPES } from "./scopes.js";

export type SpotifyFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type CreateSpotifyClientInput = {
  token: string;
  clientId?: string;
  clientSecret?: string;
  fetch?: SpotifyFetch;
  cache?: SpotifyRequestCache;
  logger?: RunLogSink;
  inputs?: SpotifyInputs;
};

export type SpotifyRunContext = CreateSpotifyClientInput;

export type SpotifyClientErrorCode =
  | "missing_token"
  | "missing_credentials"
  | "invalid_response"
  | "http_unauthorized"
  | "http_forbidden"
  | "http_rate_limited"
  | "http_not_found"
  | "http_bad_request"
  | "http_server"
  | "http_unclassified";

export class SpotifyClientError extends Error {
  override readonly name = "SpotifyClientError";
  readonly outcome: SkipFailOutcome;
  readonly status?: number;
  readonly code: SpotifyClientErrorCode;

  constructor(
    outcome: SkipFailOutcome,
    message: string,
    options: {
      status?: number;
      code?: SpotifyClientErrorCode;
      secrets?: readonly string[];
    } = {},
  ) {
    super(redactSecrets(message, options.secrets ?? []));
    this.outcome = outcome;
    if (options.status !== undefined) {
      this.status = options.status;
    }
    this.code =
      options.code ?? defaultSpotifyClientErrorCode(outcome, options.status);
  }
}

function defaultSpotifyClientErrorCode(
  outcome: SkipFailOutcome,
  status: number | undefined,
): SpotifyClientErrorCode {
  if (status === 401) {
    return "http_unauthorized";
  }
  if (status === 403) {
    return "http_forbidden";
  }
  if (status === 429) {
    return "http_rate_limited";
  }
  if (status === 404) {
    return "http_not_found";
  }
  if (status === 400) {
    return "http_bad_request";
  }
  if (status != null && status >= 500 && status <= 599) {
    return "http_server";
  }
  if (outcome === "fail_job") {
    return "missing_token";
  }
  return "http_unclassified";
}

const REST_LANGUAGES = /\/repos\/[^/]+\/[^/]+\/languages(?:\?|$)/i;
export const SPOTIFY_TIMEOUT_MS = 10_000;
export const SPOTIFY_CURRENTLY_PLAYING_URL = `${SPOTIFY_API_ORIGIN}/v1/me/player/currently-playing`;
export const SPOTIFY_RECENTLY_PLAYED_URL = `${SPOTIFY_API_ORIGIN}/v1/me/player/recently-played`;
export const SPOTIFY_TOP_TRACKS_URL = `${SPOTIFY_API_ORIGIN}/v1/me/top/tracks`;
export const SPOTIFY_TOP_TRACKS_LIMIT = "50";
export const SPOTIFY_RECENTLY_PLAYED_LIMIT = "50";

const clients = new WeakMap<object, SpotifyClient>();

export function assertNotRestLanguages(url: string): void {
  if (REST_LANGUAGES.test(url)) {
    throw new Error(
      "spotify: REST /languages is forbidden; use GraphQL nodes(ids:) batches of 100",
    );
  }
}

export function getSharedSpotifyClient(
  run: object,
  context: SpotifyRunContext,
): SpotifyClient {
  const existing = clients.get(run);
  if (existing !== undefined) {
    return existing;
  }
  const created = createSpotifyClient(context);
  clients.set(run, created);
  return created;
}

export type SpotifyClient = {
  fetchDump: () => Promise<SpotifyDump>;
};

export function createSpotifyClient(
  input: CreateSpotifyClientInput,
): SpotifyClient {
  return new SpotifyClientImpl(input);
}

class SpotifyClientImpl implements SpotifyClient {
  readonly scopes = SPOTIFY_SCOPES;
  private readonly refreshToken: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetchImpl: SpotifyFetch;
  private readonly cache: SpotifyRequestCache;
  private accessToken: string | undefined;

  constructor(input: CreateSpotifyClientInput) {
    if (spotifyRequiresAuthorization()) {
      assertSpotifyActionToken(input.token);
    }
    const clientId = readSpotifyClientId(input.clientId);
    const clientSecret = readSpotifyClientSecret(input.clientSecret);
    assertSpotifyClientCredentials(clientId, clientSecret);
    this.refreshToken = input.token.trim();
    this.clientId = clientId?.trim() ?? "";
    this.clientSecret = clientSecret?.trim() ?? "";
    this.fetchImpl = input.fetch ?? fetch;
    this.cache = input.cache ?? new SpotifyRequestCache();
    void input.logger;
  }

  async fetchDump(): Promise<SpotifyDump> {
    await this.refreshAccessToken();
    const currentlyPlaying = await this.getCurrentlyPlaying();
    const recentlyPlayed = await this.getJson(SPOTIFY_RECENTLY_PLAYED_URL, {
      limit: SPOTIFY_RECENTLY_PLAYED_LIMIT,
    });
    const topTracks = await this.getJson(SPOTIFY_TOP_TRACKS_URL, {
      limit: SPOTIFY_TOP_TRACKS_LIMIT,
    });
    return parseSpotifyDump({
      currently_playing: currentlyPlaying,
      recently_played: recentlyPlayed,
      top_tracks: topTracks,
    });
  }

  private secrets(accessToken?: string): readonly string[] {
    return spotifySecrets({
      refreshToken: this.refreshToken,
      accessToken: accessToken ?? this.accessToken,
      clientSecret: this.clientSecret,
    });
  }

  private redact(message: string, accessToken?: string): string {
    return redactSecrets(message, this.secrets(accessToken));
  }

  private fail(
    outcome: SkipFailOutcome,
    message: string,
    options: {
      status?: number;
      code?: SpotifyClientErrorCode;
      accessToken?: string;
    } = {},
  ): never {
    throw new SpotifyClientError(
      outcome,
      this.redact(message, options.accessToken),
      {
        status: options.status,
        code: options.code,
        secrets: this.secrets(options.accessToken),
      },
    );
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.accessToken !== undefined) {
      return this.accessToken;
    }
    const body = spotifyTokenRequestBody(this.refreshToken);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      ...spotifyClientBasicAuthorization(this.clientId, this.clientSecret),
    };
    let response: Response;
    try {
      response = await this.fetchImpl(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(SPOTIFY_TIMEOUT_MS),
      });
    } catch (error) {
      this.fail(
        "fail_job",
        error instanceof Error
          ? error.message
          : "spotify token transport failed",
        { code: "http_unclassified" },
      );
    }
    const raw = await readBody(response);
    if (!response.ok) {
      this.fail("fail_job", `spotify token HTTP ${String(response.status)}`, {
        status: response.status,
        code:
          response.status === 401 || response.status === 400
            ? "http_unauthorized"
            : undefined,
      });
    }
    let parsed: ReturnType<typeof parseSpotifyTokenResponse>;
    try {
      parsed = parseSpotifyTokenResponse(JSON.parse(raw) as unknown);
    } catch {
      this.fail("fail_job", "spotify token response is not JSON", {
        code: "invalid_response",
      });
    }
    this.accessToken = parsed.access_token;
    return this.accessToken;
  }

  private getCurrentlyPlaying(): Promise<unknown> {
    return this.getJson(SPOTIFY_CURRENTLY_PLAYING_URL, {});
  }

  private getJson(
    url: string,
    params: Readonly<Record<string, string>>,
  ): Promise<unknown> {
    assertNotRestLanguages(url);
    const target = withSearchParams(url, params);
    assertNotRestLanguages(target);
    return this.cache.rest({ method: "GET", url: target, params }, () =>
      this.sendUncached("GET", target),
    );
  }

  private async sendUncached(method: string, url: string): Promise<unknown> {
    const accessToken = await this.refreshAccessToken();
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...spotifyAuthorizationHeader(accessToken),
    };
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        signal: AbortSignal.timeout(SPOTIFY_TIMEOUT_MS),
      });
    } catch (error) {
      this.fail(
        "fail_widget",
        error instanceof Error ? error.message : "spotify transport failed",
        { accessToken, code: "http_unclassified" },
      );
    }
    if (response.status === 204) {
      return null;
    }
    const raw = await readBody(response);
    if (!response.ok) {
      this.fail(
        "fail_widget",
        `spotify HTTP ${String(response.status)} ${method} ${url}`,
        {
          status: response.status,
          accessToken,
        },
      );
    }
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      this.fail("fail_widget", "spotify resource response is not JSON", {
        accessToken,
        code: "invalid_response",
      });
    }
  }
}

async function readBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function withSearchParams(
  url: string,
  params: Readonly<Record<string, string>>,
): string {
  const keys = Object.keys(params);
  if (keys.length === 0) {
    return url;
  }
  const encoded = keys
    .sort()
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(params[key] ?? "")}`,
    )
    .join("&");
  return url.includes("?") ? `${url}&${encoded}` : `${url}?${encoded}`;
}

export { spotifyRestCacheKey };
