/**
 * Shared lichess client for one Action / playground / generate run.
 * Auth none. REST cache (method, url, params, auth, headers).
 * Username is not a URL. Never REST /languages. Never GitHub.
 */
import { classifyHttp, type SkipFailOutcome } from "@profile-bits/core";
import { RequestCache, type RestCacheParts, restCacheKey } from "../cache.js";
import { HTTP_MAX_BYTES } from "../http/ssrf.js";
import {
  assertLichessActionToken,
  lichessAuthorizationHeader,
  lichessRequiresAuthorization,
} from "./auth.js";
import type { LichessInputs } from "./inputs.js";
import {
  emptyGamesDump,
  type LichessDump,
  parseLichessDump,
  parseNdjsonGames,
} from "./payload.js";
import { LICHESS_SCOPES } from "./scopes.js";
import { normalizeChessUsername } from "./user.js";

export type LichessFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type CreateLichessClientInput = {
  fetch?: LichessFetch;
  inputs?: LichessInputs;
};

export type LichessRunContext = CreateLichessClientInput;

export const LICHESS_ORIGIN = "https://lichess.org";
export const LICHESS_USER_AGENT =
  "profile-bits-lichess/0 (+https://github.com/wyattowalsh/profile-bits)";
export const LICHESS_GRAPHQL_URL = "https://example.invalid/graphql";

const REST_LANGUAGES = /\/repos\/[^/]+\/[^/]+\/languages(?:\?|$)/i;

export class LichessClientError extends Error {
  override readonly name = "LichessClientError";
  readonly outcome: SkipFailOutcome;
  readonly status?: number;

  constructor(
    outcome: SkipFailOutcome,
    message: string,
    status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.outcome = outcome;
    this.status = status;
  }
}

const clients = new WeakMap<object, LichessClient>();

export function getSharedLichessClient(
  run: object,
  context: LichessRunContext = {},
): LichessClient {
  const existing = clients.get(run);
  if (existing !== undefined) {
    return existing;
  }
  const created = new LichessClient(context);
  clients.set(run, created);
  return created;
}

export function createLichessClient(
  context: CreateLichessClientInput = {},
): LichessClient {
  return new LichessClient(context);
}

export function assertNotRestLanguages(url: string): void {
  if (REST_LANGUAGES.test(url)) {
    throw new LichessClientError(
      "fail_widget",
      "lichess: REST /languages is forbidden",
    );
  }
}

export function lichessUserUrl(user: string): string {
  return `${LICHESS_ORIGIN}/api/user/${encodeURIComponent(user)}`;
}

export function assertPinnedLichessUrl(urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch (cause: unknown) {
    throw new LichessClientError(
      "fail_widget",
      "invalid lichess url",
      undefined,
      {
        cause,
      },
    );
  }
  if (parsed.protocol !== "https:") {
    throw new LichessClientError("fail_widget", "https only");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new LichessClientError("fail_widget", "url userinfo");
  }
  if (parsed.hostname !== "lichess.org") {
    throw new LichessClientError("fail_widget", "pinned host");
  }
  if (!parsed.pathname.startsWith("/api/")) {
    throw new LichessClientError("fail_widget", "pinned path");
  }
  assertNotRestLanguages(parsed.href);
  return parsed;
}

export class LichessClient {
  readonly scopes = LICHESS_SCOPES;
  private readonly fetchImpl: LichessFetch;
  private readonly cache = new RequestCache();

  constructor(context: LichessRunContext = {}) {
    this.fetchImpl = context.fetch ?? globalThis.fetch;
    assertLichessActionToken(undefined);
    if (lichessRequiresAuthorization()) {
      throw new LichessClientError(
        "fail_job",
        "lichess: auth none must not require Authorization",
      );
    }
  }

  async fetchDump(user: string): Promise<LichessDump> {
    const username = normalizeChessUsername(user);
    if (username === undefined) {
      throw new LichessClientError("fail_widget", "invalid chess username");
    }
    const userUrl = lichessUserUrl(username);
    const profile = await this.getJson(userUrl);
    const current = await this.getOptionalJson(`${userUrl}/current-game`);
    const recent = await this.getRecentGames(username);
    const dump = parseLichessDump({
      user: profile,
      current: current ?? {},
      recent,
    });
    if (dump == null) {
      throw new LichessClientError("fail_widget", "invalid lichess dump");
    }
    return dump;
  }

  private getRecentGames(user: string): Promise<Record<string, unknown>> {
    const url = `${LICHESS_ORIGIN}/api/games/user/${encodeURIComponent(user)}`;
    const parsed = assertPinnedLichessUrl(url);
    parsed.searchParams.set("max", "8");
    parsed.searchParams.set("pgnInJson", "true");
    const parts: RestCacheParts = {
      method: "GET",
      url: parsed.origin + parsed.pathname,
      params: Object.fromEntries(parsed.searchParams.entries()),
      auth: "none",
      headers: {
        Accept: "application/x-ndjson",
        "User-Agent": LICHESS_USER_AGENT,
      },
    };
    return this.cache.get(parts, async () => {
      const body = await this.sendText(parsed.href, {
        optional: true,
        accept: "application/x-ndjson",
      });
      if (body == null || body.trim() === "") {
        return emptyGamesDump();
      }
      try {
        return parseNdjsonGames(body);
      } catch (cause: unknown) {
        throw new LichessClientError(
          "fail_widget",
          "invalid ndjson",
          undefined,
          {
            cause,
          },
        );
      }
    });
  }

  private getJson(url: string): Promise<Record<string, unknown>> {
    return this.requestJson(url, { optional: false }) as Promise<
      Record<string, unknown>
    >;
  }

  private getOptionalJson(
    url: string,
  ): Promise<Record<string, unknown> | null> {
    return this.requestJson(url, { optional: true });
  }

  private requestJson(
    url: string,
    options: { optional: boolean },
  ): Promise<Record<string, unknown> | null> {
    const parsed = assertPinnedLichessUrl(url);
    const parts: RestCacheParts = {
      method: "GET",
      url: parsed.origin + parsed.pathname,
      params: Object.fromEntries(parsed.searchParams.entries()),
      auth: "none",
      headers: { Accept: "application/json", "User-Agent": LICHESS_USER_AGENT },
    };
    return this.cache.get(parts, async () => {
      const body = await this.sendText(parsed.href, {
        optional: options.optional,
        accept: "application/json",
      });
      if (body == null) {
        return null;
      }
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(body) as unknown;
      } catch (cause: unknown) {
        throw new LichessClientError("fail_widget", "invalid json", undefined, {
          cause,
        });
      }
      if (
        parsedJson == null ||
        typeof parsedJson !== "object" ||
        Array.isArray(parsedJson)
      ) {
        throw new LichessClientError("fail_widget", "json object required");
      }
      return parsedJson as Record<string, unknown>;
    });
  }

  private async sendText(
    url: string,
    options: { optional: boolean; accept: string },
  ): Promise<string | null> {
    assertNotRestLanguages(url);
    const headers: Record<string, string> = {
      Accept: options.accept,
      "User-Agent": LICHESS_USER_AGENT,
      ...lichessAuthorizationHeader(undefined),
    };
    const response = await this.fetchImpl(url, { method: "GET", headers });
    if (options.optional && response.status === 404) {
      return null;
    }
    const outcome = classifyHttp({ status: response.status });
    if (outcome !== "render") {
      throw new LichessClientError(
        outcome,
        `lichess HTTP ${response.status} GET ${url}`,
        response.status,
      );
    }
    const length = response.headers.get("content-length");
    if (length != null && Number(length) > HTTP_MAX_BYTES) {
      throw new LichessClientError("fail_widget", "body too large");
    }
    const body = await response.text();
    if (body.length > HTTP_MAX_BYTES) {
      throw new LichessClientError("fail_widget", "body too large");
    }
    return body;
  }
}

export type { LichessDump };
export { restCacheKey };
