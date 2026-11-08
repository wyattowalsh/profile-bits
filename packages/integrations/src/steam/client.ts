/**
 * Steam Web API. Scheme query-key. `?key=` is applied at send time.
 * Cache auth is "query-key" and the cache key omits the secret.
 * Pack-on missing token is fail_job before any request.
 */
import {
  applyQueryKey,
  QUERY_KEY_CACHE_AUTH,
  queryKeyAuthorizationHeader,
  queryKeyRestCacheKey,
  queryKeySecrets,
  stripQueryKeyFromUrl,
} from "../query-key/index.js";
import { assertSteamActionToken } from "./auth.js";
import { parseSteamDump, type SteamDump } from "./payload.js";

export const STEAM_ORIGIN = "https://api.steampowered.com";
export const STEAM_SUMMARIES_PATH = "/ISteamUser/GetPlayerSummaries/v2/";
export const STEAM_RECENT_PATH = "/IPlayerService/GetRecentlyPlayedGames/v1/";
export const STEAM_VANITY_PATH = "/ISteamUser/ResolveVanityURL/v1/";

const STEAM_ID = /^\d{17}$/;

export class SteamClientError extends Error {
  override readonly name = "SteamClientError";
  readonly outcome: "fail_job" | "fail_widget";
  readonly status?: number;

  constructor(
    outcome: "fail_job" | "fail_widget",
    message: string,
    status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.outcome = outcome;
    if (status !== undefined) {
      this.status = status;
    }
  }
}

export type SteamFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type CreateSteamClientInput = {
  fetch?: SteamFetch;
  token?: string | null;
};

function publicMessage(token: string, status: number, url: string): string {
  let message = `steam HTTP ${status} GET ${stripQueryKeyFromUrl(url)}`;
  for (const secret of queryKeySecrets(token)) {
    if (secret !== "" && message.includes(secret)) {
      message = message.split(secret).join("[redacted]");
    }
  }
  return message;
}

export function createSteamClient(input: CreateSteamClientInput = {}) {
  const fetchImpl = input.fetch ?? fetch;
  const token = input.token ?? undefined;
  const cache = new Map<string, Promise<Record<string, unknown>>>();

  function sendUrl(bare: string): string {
    assertSteamActionToken(token);
    const header = queryKeyAuthorizationHeader(token);
    if ("Authorization" in header || QUERY_KEY_CACHE_AUTH !== "query-key") {
      throw new SteamClientError(
        "fail_widget",
        "steam query-key must not send an Authorization header",
      );
    }
    return applyQueryKey(bare, token);
  }

  async function getJson(bare: string): Promise<Record<string, unknown>> {
    const url = sendUrl(bare);
    const key = queryKeyRestCacheKey({ method: "GET", url });
    if (token != null && token !== "" && key.includes(token)) {
      throw new SteamClientError(
        "fail_widget",
        "steam cache key must omit ?key=",
      );
    }
    const hit = cache.get(key);
    if (hit !== undefined) {
      return hit;
    }
    const pending = readJson(url).catch((error: unknown) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, pending);
    return pending;
  }

  async function readJson(url: string): Promise<Record<string, unknown>> {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (response.status !== 200) {
      throw new SteamClientError(
        "fail_widget",
        publicMessage(token ?? "", response.status, url),
        response.status,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(await response.text()) as unknown;
    } catch (cause: unknown) {
      throw new SteamClientError("fail_widget", "steam invalid json", 200, {
        cause,
      });
    }
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new SteamClientError("fail_widget", "steam json object required");
    }
    return parsed as Record<string, unknown>;
  }

  return {
    async fetchDump(user: string): Promise<SteamDump> {
      try {
        assertSteamActionToken(token);
      } catch (cause: unknown) {
        throw new SteamClientError(
          "fail_job",
          cause instanceof Error
            ? cause.message
            : "steam missing token — fail_job",
          undefined,
          { cause },
        );
      }
      const name = user.trim();
      if (name === "") {
        throw new SteamClientError(
          "fail_widget",
          "steam missing user — fail_widget",
        );
      }
      let steamid = name;
      let vanity: Record<string, unknown> | undefined;
      if (!STEAM_ID.test(name)) {
        const vanityUrl = new URL(STEAM_ORIGIN + STEAM_VANITY_PATH);
        vanityUrl.searchParams.set("vanityurl", name);
        vanity = await getJson(vanityUrl.toString());
        const response = vanity.response;
        const record =
          response != null && typeof response === "object"
            ? (response as Record<string, unknown>)
            : null;
        const resolved = record?.steamid;
        if (record?.success !== 1 || typeof resolved !== "string") {
          throw new SteamClientError(
            "fail_widget",
            "steam vanity did not resolve — fail_widget",
          );
        }
        steamid = resolved;
      }
      const summariesUrl = new URL(STEAM_ORIGIN + STEAM_SUMMARIES_PATH);
      summariesUrl.searchParams.set("steamids", steamid);
      const recentUrl = new URL(STEAM_ORIGIN + STEAM_RECENT_PATH);
      recentUrl.searchParams.set("steamid", steamid);
      const [summaries, recent] = await Promise.all([
        getJson(summariesUrl.toString()),
        getJson(recentUrl.toString()),
      ]);
      const dump = parseSteamDump({
        GetPlayerSummaries: summaries,
        GetRecentlyPlayedGames: recent,
        ...(vanity === undefined ? {} : { ResolveVanityURL: vanity }),
      });
      if (dump == null) {
        throw new SteamClientError("fail_widget", "steam invalid dump");
      }
      return dump;
    },
  };
}
