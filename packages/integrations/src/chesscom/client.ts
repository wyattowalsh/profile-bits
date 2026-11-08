/**
 * Shared chess.com client for one Action / playground / generate run.
 * Auth none. Identifying User-Agent. REST cache (method, url, params, auth, headers).
 * Username is not a URL. Never REST /languages. Never GitHub.
 */
import { classifyHttp, type SkipFailOutcome } from "@profile-bits/core";
import { RequestCache, type RestCacheParts, restCacheKey } from "../cache.js";
import { HTTP_MAX_BYTES } from "../http/ssrf.js";
import {
  assertChesscomActionToken,
  chesscomAuthorizationHeader,
  chesscomRequiresAuthorization,
} from "./auth.js";
import type { ChesscomInputs } from "./inputs.js";
import {
  type ChesscomDump,
  emptyArchivesDump,
  emptyGamesDump,
  parseChesscomDump,
} from "./payload.js";
import { CHESSCOM_SCOPES } from "./scopes.js";
import { normalizeChessUsername } from "./user.js";

export type ChesscomFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type CreateChesscomClientInput = {
  fetch?: ChesscomFetch;
  inputs?: ChesscomInputs;
};

export type ChesscomRunContext = CreateChesscomClientInput;

export const CHESSCOM_ORIGIN = "https://api.chess.com";
export const CHESSCOM_USER_AGENT =
  "profile-bits-chesscom/0 (+https://github.com/wyattowalsh/profile-bits)";
export const CHESSCOM_GRAPHQL_URL = "https://example.invalid/graphql";

const REST_LANGUAGES = /\/repos\/[^/]+\/[^/]+\/languages(?:\?|$)/i;

export class ChesscomClientError extends Error {
  override readonly name = "ChesscomClientError";
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

const clients = new WeakMap<object, ChesscomClient>();

export function getSharedChesscomClient(
  run: object,
  context: ChesscomRunContext = {},
): ChesscomClient {
  const existing = clients.get(run);
  if (existing !== undefined) {
    return existing;
  }
  const created = new ChesscomClient(context);
  clients.set(run, created);
  return created;
}

export function createChesscomClient(
  context: CreateChesscomClientInput = {},
): ChesscomClient {
  return new ChesscomClient(context);
}

export function assertNotRestLanguages(url: string): void {
  if (REST_LANGUAGES.test(url)) {
    throw new ChesscomClientError(
      "fail_widget",
      "chesscom: REST /languages is forbidden",
    );
  }
}

export function chesscomPlayerUrl(user: string): string {
  return `${CHESSCOM_ORIGIN}/pub/player/${encodeURIComponent(user)}`;
}

export function assertPinnedChesscomUrl(urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch (cause: unknown) {
    throw new ChesscomClientError(
      "fail_widget",
      "invalid chesscom url",
      undefined,
      {
        cause,
      },
    );
  }
  if (parsed.protocol !== "https:") {
    throw new ChesscomClientError("fail_widget", "https only");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new ChesscomClientError("fail_widget", "url userinfo");
  }
  if (parsed.hostname !== "api.chess.com") {
    throw new ChesscomClientError("fail_widget", "pinned host");
  }
  if (!parsed.pathname.startsWith("/pub/")) {
    throw new ChesscomClientError("fail_widget", "pinned path");
  }
  assertNotRestLanguages(parsed.href);
  return parsed;
}

export class ChesscomClient {
  readonly scopes = CHESSCOM_SCOPES;
  private readonly fetchImpl: ChesscomFetch;
  private readonly cache = new RequestCache();

  constructor(context: ChesscomRunContext = {}) {
    this.fetchImpl = context.fetch ?? globalThis.fetch;
    assertChesscomActionToken(undefined);
    if (chesscomRequiresAuthorization()) {
      throw new ChesscomClientError(
        "fail_job",
        "chesscom: auth none must not require Authorization",
      );
    }
  }

  async fetchDump(user: string): Promise<ChesscomDump> {
    const username = normalizeChessUsername(user);
    if (username === undefined) {
      throw new ChesscomClientError("fail_widget", "invalid chess username");
    }
    const playerUrl = chesscomPlayerUrl(username);
    const player = await this.getJson(playerUrl);
    const stats = await this.getJson(`${playerUrl}/stats`);
    const current = await this.getOptionalJson(`${playerUrl}/games/to-move`);
    const archives = await this.getOptionalJson(`${playerUrl}/games/archives`);
    const recent = await this.loadRecent(archives);
    const dump = parseChesscomDump({
      player,
      stats,
      current: current ?? emptyGamesDump(),
      archives: archives ?? emptyArchivesDump(),
      recent: recent ?? emptyGamesDump(),
    });
    if (dump == null) {
      throw new ChesscomClientError("fail_widget", "invalid chesscom dump");
    }
    return dump;
  }

  private async loadRecent(
    archives: Record<string, unknown> | null,
  ): Promise<Record<string, unknown> | null> {
    const list = archives?.archives;
    if (!Array.isArray(list) || list.length === 0) {
      return emptyGamesDump();
    }
    const last = list[list.length - 1];
    if (typeof last !== "string") {
      return emptyGamesDump();
    }
    const pinned = assertPinnedChesscomUrl(last);
    return this.getOptionalJson(pinned.href);
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
    const parsed = assertPinnedChesscomUrl(url);
    const parts: RestCacheParts = {
      method: "GET",
      url: parsed.origin + parsed.pathname,
      params: Object.fromEntries(parsed.searchParams.entries()),
      auth: "none",
      headers: {
        Accept: "application/json",
        "User-Agent": CHESSCOM_USER_AGENT,
      },
    };
    return this.cache.get(parts, () => this.sendJson(parsed.href, options));
  }

  private async sendJson(
    url: string,
    options: { optional: boolean },
  ): Promise<Record<string, unknown> | null> {
    assertNotRestLanguages(url);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": CHESSCOM_USER_AGENT,
      ...chesscomAuthorizationHeader(undefined),
    };
    const response = await this.fetchImpl(url, { method: "GET", headers });
    if (options.optional && response.status === 404) {
      return null;
    }
    const outcome = classifyHttp({ status: response.status });
    if (outcome !== "render") {
      throw new ChesscomClientError(
        outcome,
        `chesscom HTTP ${response.status} GET ${url}`,
        response.status,
      );
    }
    const length = response.headers.get("content-length");
    if (length != null && Number(length) > HTTP_MAX_BYTES) {
      throw new ChesscomClientError("fail_widget", "body too large");
    }
    const body = await response.text();
    if (body.length > HTTP_MAX_BYTES) {
      throw new ChesscomClientError("fail_widget", "body too large");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body) as unknown;
    } catch (cause: unknown) {
      throw new ChesscomClientError("fail_widget", "invalid json", undefined, {
        cause,
      });
    }
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ChesscomClientError("fail_widget", "json object required");
    }
    return parsed as Record<string, unknown>;
  }
}

export type { ChesscomDump };
export { restCacheKey };
